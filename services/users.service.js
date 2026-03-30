const { OAuth2Client } = require('google-auth-library');

const { CustomException } = require('../utilites/errorHandler');
const { createTokens, verifyToken } = require('../utilites/jwtHelper');
const prisma = require('../utilites/prisma');
const { buildUserMatchQuery } = require('../helpers/users.helper');
const userSerializer = require('../serializers/users.serializer');
const { uploadBuffer } = require('../utilites/cloudinary');
const redis = require('../utilites/redis');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const calculateScoreBreakdown = async (user) => {
  let score = 0;
  const earned = [];
  const missing = [];

  // 1. Google Account (10 pts)
  if (user.email) {
    score += 10;
    earned.push('Google account connected');
  } else {
    missing.push('Connect Google account');
  }

  // 2. Profile Photo (10 pts)
  if (user.user_details?.profile_image) {
    score += 10;
    earned.push('Profile photo added');
  } else {
    missing.push('Add profile photo');
  }

  // 3. Bio / profession (10 pts)
  if (user.user_details?.profession) {
    score += 10;
    earned.push('Bio / profession added');
  } else {
    missing.push('Add profession');
  }

  // 4. Skills
  const userSkills = user.skills || [];
  const teachSkills = userSkills.filter((s) => s.type === 'TEACH');
  const learnSkills = userSkills.filter((s) => s.type === 'LEARN');

  if (teachSkills.length >= 1) {
    score += 15;
    earned.push('At least one teaching skill');
  } else {
    missing.push('Add a skill to teach');
  }

  if (learnSkills.length >= 1) {
    score += 10;
    earned.push('At least one learning skill');
  } else {
    missing.push('Add a skill to learn');
  }

  if (userSkills.length >= 3) {
    score += 10;
    earned.push('Multiple skills added');
  } else {
    missing.push('Add more skills (3+)');
  }

  // 5. Phone Verified (15 pts)
  if (user.user_details?.isPhoneVerified) {
    score += 15;
    earned.push('Phone number verified');
  } else {
    missing.push('Verify phone number');
  }

  // 6. Proof Links (10 pts)
  const ud = user.user_details || {};
  if (ud.github || ud.linkedin || ud.twitter) {
    score += 10;
    earned.push('Proof links added');
  } else {
    missing.push('Add social links');
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Update DB if score changed
  if (user.id && user.profileScore !== score) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        profileScore: score,
        profileScoreUpdatedAt: new Date(),
      },
    });
    user.profileScore = score;
  }

  let level = 'Low';
  if (score >= 80) level = 'High';
  else if (score >= 50) level = 'Medium';

  return { score, max: 100, level, earned, missing };
};

const verifyGoogleToken = async (token) => {
  try {
    const looksLikeJwt =
      typeof token === 'string' && token.split('.').length === 3;

    if (looksLikeJwt) {
      if (!process.env.GOOGLE_CLIENT_ID) {
        throw new CustomException('GOOGLE_CLIENT_ID is not set on server', 500);
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      return ticket.getPayload();
    }

    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg =
        data?.error_description ||
        data?.error?.message ||
        'Invalid Google access token (userinfo request failed)';
      throw new CustomException(msg, 400);
    }

    return data;
  } catch (error) {
    throw new CustomException(error.message, 400);
  }
};

const findUserByEmail = async (payload) => {
  const { email } = payload;
  return prisma.user.findUnique({
    where: { email },
  });
};

const findUserByUsername = async (payload) => {
  const { username } = payload;
  return prisma.user.findUnique({
    where: { username },
  });
};

const getUserDetails = async (id) => {
  return prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      isEmailVerified: true,
      profileScore: true,
      user_details: {
        select: {
          profession: true,
          address: true,
          phone_number: true,
          isPhoneVerified: true,
          instagram: true,
          twitter: true,
          linkedin: true,
          github: true,
          profile_image: true,
        },
        where: {
          deletedAt: null,
        },
      },
      skills: {
        select: {
          type: true,
          skill: {
            select: {
              name: true,
            },
          },
        },
        where: {
          deletedAt: null,
        },
      },
      reputationScore: true,
      profileScore: true,
      reputationUpdatedAt: true,
      badges: {
        select: {
          badge_type: true,
          earned_at: true,
        },
      },
    },
  });
};

/**
 * Creates a new user with profile details and skills.
 *
 * Steps:
 * 1. Checks if email and username are unique.
 * 2. Hashes the password and creates the user.
 * 3. Saves user details (profession, social links, etc.).
 * 4. Links skills to learn and teach.
 * 5. Generates access and refresh tokens.
 * 6. Returns tokens and user info (excluding password).
 *
 * @param {Object} payload - User info, skills, and profile details.
 * @returns {Promise<Object>} - Contains accessToken, refreshToken, and user data.
 */
const createUser = async (payload) => {
  const {
    name,
    username,
    profession,
    skillsToLearn,
    skillsToTeach,
    address,
    phoneNumber,
    instagram,
    twitter,
    linkedin,
    github,
    googleToken,
  } = payload;

  if (!googleToken) {
    throw new CustomException('Google Sign In is required', 400);
  }

  const payloadFromGoogle = await verifyGoogleToken(googleToken);
  const { email, picture } = payloadFromGoogle;

  const existingUser = await findUserByEmail({ email });
  if (existingUser) {
    throw new CustomException('User with this email already exists', 409);
  }

  const existingUsername = await findUserByUsername({ username });
  if (existingUsername) {
    throw new CustomException('Username already exists', 409);
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        username,
        email,
        isEmailVerified: true,
      },
    });

    await tx.userDetails.create({
      data: {
        user_id: user.id,
        profession,
        address,
        phone_number: phoneNumber,
        instagram,
        twitter,
        linkedin,
        github,
        profile_image: picture,
      },
    });

    const allSkillNames = [...new Set([...skillsToLearn, ...skillsToTeach])];
    const skillsFromDb = await tx.skill.findMany({
      where: { name: { in: allSkillNames } },
    });

    const skillMap = new Map(
      skillsFromDb.map((skill) => [skill.name, skill.id])
    );

    const skillsToLearnData = skillsToLearn.map((skillName) => ({
      user_id: user.id,
      skill_id: skillMap.get(skillName),
      type: 'LEARN',
    }));

    const skillsToTeachData = skillsToTeach.map((skillName) => ({
      user_id: user.id,
      skill_id: skillMap.get(skillName),
      type: 'TEACH',
    }));

    const allUserSkillsData = [...skillsToLearnData, ...skillsToTeachData];

    await tx.userSkills.createMany({
      data: allUserSkillsData,
    });

    return user;
  });

  // Calculate initial profile score
  const fullUser = await getUserDetails(result.id);
  await calculateScoreBreakdown(fullUser);

  const { accessToken, refreshToken } = createTokens(result);

  return { accessToken, refreshToken, user: result };
};

const findUserById = async (payload) => {
  const { id, viewerId } = payload;
  const userId = parseInt(id, 10);
  const user = await getUserDetails(userId);

  if (!user) {
    throw new CustomException('User not found', 404);
  }

  const serializedUser = userSerializer.userDetails(user);
  const viewer =
    viewerId !== undefined && viewerId !== null
      ? parseInt(viewerId, 10)
      : userId;

  if (viewer !== userId) {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });
    const privacy = settings?.privacy;
    if (privacy && typeof privacy === 'object' && !Array.isArray(privacy)) {
      if (privacy.showEmail === false) {
        delete serializedUser.email;
      }
      if (privacy.showPhone === false) {
        delete serializedUser.phoneNumber;
      }
    }
  }

  return serializedUser;
};

const getUserSettings = async (userId) => {
  const row = await prisma.userSettings.findUnique({
    where: { userId },
  });
  if (!row) {
    return {
      availabilityNotes: '',
      preferences: { emailDigest: true, matchAlerts: true },
      privacy: {
        showEmail: true,
        showPhone: true,
        profileVisibility: 'community',
      },
    };
  }
  const prefs =
    row.preferences &&
    typeof row.preferences === 'object' &&
    !Array.isArray(row.preferences)
      ? row.preferences
      : {};
  const priv =
    row.privacy &&
    typeof row.privacy === 'object' &&
    !Array.isArray(row.privacy)
      ? row.privacy
      : {};
  return {
    availabilityNotes: row.availabilityNotes || '',
    preferences: prefs,
    privacy: priv,
  };
};

const patchUserSettings = async (userId, body) => {
  const existing = await prisma.userSettings.findUnique({
    where: { userId },
  });
  const prevPrefs =
    existing?.preferences &&
    typeof existing.preferences === 'object' &&
    !Array.isArray(existing.preferences)
      ? existing.preferences
      : {};
  const prevPrivacy =
    existing?.privacy &&
    typeof existing.privacy === 'object' &&
    !Array.isArray(existing.privacy)
      ? existing.privacy
      : {};

  const nextAvailability =
    body.availabilityNotes !== undefined
      ? body.availabilityNotes
      : (existing?.availabilityNotes ?? null);
  const nextPrefs =
    body.preferences !== undefined
      ? { ...prevPrefs, ...body.preferences }
      : prevPrefs;
  const nextPrivacy =
    body.privacy !== undefined
      ? { ...prevPrivacy, ...body.privacy }
      : prevPrivacy;

  await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      availabilityNotes: nextAvailability,
      preferences: nextPrefs,
      privacy: nextPrivacy,
    },
    update: {
      availabilityNotes: nextAvailability,
      preferences: nextPrefs,
      privacy: nextPrivacy,
    },
  });

  return getUserSettings(userId);
};

const updateProfile = async (payload) => {
  const { id, profileData, file } = payload;
  const {
    name,
    username,
    email,
    profession,
    skillsToLearn,
    skillsToTeach,
    address,
    phoneNumber,
    instagram,
    twitter,
    linkedin,
    github,
    isPhoneVerified,
  } = profileData;

  // Normalize arrays when coming from multipart/form-data as strings
  let learn = skillsToLearn;
  let teach = skillsToTeach;
  if (typeof learn === 'string') {
    try {
      learn = JSON.parse(learn);
    } catch {
      learn = learn
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  if (typeof teach === 'string') {
    try {
      teach = JSON.parse(teach);
    } catch {
      teach = teach
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const numericUserId = parseInt(id);

  const existingUser = await prisma.user.findUnique({
    where: { id: numericUserId },
  });

  if (!existingUser) {
    throw new CustomException('User not found', 404);
  }

  // Ensure email/username uniqueness if being changed
  if (email && email !== existingUser.email) {
    const emailOwner = await prisma.user.findUnique({ where: { email } });
    if (emailOwner) {
      throw new CustomException('User with this email already exists', 409);
    }
  }

  if (username && username !== existingUser.username) {
    const usernameOwner = await prisma.user.findUnique({ where: { username } });
    if (usernameOwner) {
      throw new CustomException('Username already exists', 409);
    }
  }

  // Resolve profile image URL
  let profileImageUrl;
  if (file && file.buffer) {
    profileImageUrl = await uploadBuffer(
      file.buffer,
      `profiles/${numericUserId}`,
      'avatar',
      file.mimetype
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: numericUserId },
      data: { name, username, email },
    });

    await tx.userDetails.upsert({
      where: { user_id: numericUserId },
      update: {
        profession,
        address,
        phone_number: phoneNumber,
        instagram,
        twitter,
        linkedin,
        github,
        ...(profileImageUrl ? { profile_image: profileImageUrl } : {}),
        isPhoneVerified,
      },
      create: {
        user_id: numericUserId,
        profession: profession || '',
        address: address || '',
        phone_number: phoneNumber,
        isPhoneVerified: isPhoneVerified || false,
        instagram,
        twitter,
        linkedin,
        github,
        ...(profileImageUrl ? { profile_image: profileImageUrl } : {}),
      },
    });

    const willReplaceLearn = Array.isArray(learn);
    const willReplaceTeach = Array.isArray(teach);

    if (willReplaceLearn || willReplaceTeach) {
      const learnList = willReplaceLearn ? learn : [];
      const teachList = willReplaceTeach ? teach : [];

      const namesToEnsure = [
        ...new Set([...(learnList || []), ...(teachList || [])]),
      ];

      if (namesToEnsure.length > 0) {
        await tx.skill.createMany({
          data: namesToEnsure.map((n) => ({ name: n })),
          skipDuplicates: true,
        });
      }

      const typesToReplace = [];
      if (willReplaceLearn) typesToReplace.push('LEARN');
      if (willReplaceTeach) typesToReplace.push('TEACH');

      await tx.userSkills.deleteMany({
        where: { user_id: numericUserId, type: { in: typesToReplace } },
      });

      const skillsFromDb = namesToEnsure.length
        ? await tx.skill.findMany({ where: { name: { in: namesToEnsure } } })
        : [];
      const nameToId = new Map(skillsFromDb.map((s) => [s.name, s.id]));

      const learnRows = (learnList || []).map((skillName) => ({
        user_id: numericUserId,
        skill_id: nameToId.get(skillName),
        type: 'LEARN',
      }));
      const teachRows = (teachList || []).map((skillName) => ({
        user_id: numericUserId,
        skill_id: nameToId.get(skillName),
        type: 'TEACH',
      }));

      const rows = [...learnRows, ...teachRows].filter((r) => r.skill_id);
      if (rows.length > 0) {
        await tx.userSkills.createMany({ data: rows });
      }
    }
  });

  const redisKey = `recommendations:user:${numericUserId}`;
  await redis.del(redisKey);

  const user = await getUserDetails(numericUserId);

  // Recalculate Score
  await calculateScoreBreakdown(user);

  const serializedUser = userSerializer.userDetails(user);

  return { ...serializedUser, message: 'Profile updated successfully' };
};

const findUserDetails = async (payload) => {
  const { email, username } = payload;
  let user;

  if (email) {
    user = await findUserByEmail({ email });
  } else if (username) {
    user = await findUserByUsername({ username });
  }

  if (!user) {
    throw new CustomException('User not found', 404);
  }
  const serializedUser = userSerializer.userDetails(user, payload, false);
  return serializedUser;
};

const refreshToken = async (payload) => {
  const { refreshToken } = payload;
  const decoded = verifyToken(refreshToken);
  if (!decoded) {
    throw new CustomException('Invalid refresh token', 401);
  }
  const user = await findUserById({ id: decoded.id, viewerId: decoded.id });
  if (!user) {
    throw new CustomException('User not found', 404);
  }

  const { accessToken, refreshToken: newRefreshToken } = createTokens(user);
  return { accessToken, refreshToken: newRefreshToken };
};

const getUsersBySearchQuery = async (payload) => {
  const { term, page, limit, user } = payload;
  return buildUserMatchQuery({
    currentUserId: user.id,
    page,
    limit,
    includeTermFilter: true,
    term,
  });
};

const getUsersRecommendations = async (payload) => {
  const { page, limit, user } = payload;
  const redisKey = `recommendations:user:${user.id}`;
  const CACHE_TTL = 900; // 15 minutes

  const cachedData = await redis.get(redisKey);
  if (cachedData) {
    try {
      const parsed =
        typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
      if (parsed && parsed.data) {
        return parsed.data;
      }
    } catch (error) {
      console.error('Error parsing cached recommendations:', error);
    }
  }

  const results = await buildUserMatchQuery({
    currentUserId: user.id,
    page,
    limit,
    includeTermFilter: false,
  });

  const cachePayload = {
    generatedAt: new Date().toISOString(),
    data: results,
  };

  await redis.set(redisKey, JSON.stringify(cachePayload), CACHE_TTL);

  return results;
};

const checkGoogleUser = async (payload) => {
  const { googleToken } = payload;
  if (!googleToken) {
    throw new CustomException('Google Token is required', 400);
  }

  const googlePayload = await verifyGoogleToken(googleToken);
  const { email, name, picture } = googlePayload;

  const user = await findUserByEmail({ email });
  if (user) {
    // User exists
    return {
      exists: true,
      email,
      message: 'Email already exists, please log in.',
    };
  }

  // User currently returns false if new, along with info to prefill
  return {
    exists: false,
    email,
    name,
    picture,
  };
};

const loginWithGoogle = async (payload) => {
  const { googleToken } = payload;
  if (!googleToken) {
    throw new CustomException('Google Token is required', 400);
  }

  const googlePayload = await verifyGoogleToken(googleToken);
  const { email } = googlePayload;

  const user = await findUserByEmail({ email });
  if (!user) {
    throw new CustomException('Email not found, please sign up.', 404);
  }

  if (!user.isEmailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });
    user.isEmailVerified = true;
  }

  const { accessToken, refreshToken } = createTokens(user);

  return { accessToken, refreshToken, user };
};

const getProfileScore = async (payload) => {
  const { user: currentUser } = payload;
  if (!currentUser) throw new CustomException('User not authenticated', 401);

  const user = await getUserDetails(currentUser.id);
  if (!user) throw new CustomException('User not found', 404);

  return await calculateScoreBreakdown(user);
};

const updateReputationAndBadges = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      user_details: true,
      receivedRatings: true,
      skills: {
        include: { skill: true },
      },
    },
  });

  if (!user) return;

  // 1. Calculate Reputation
  let score = 0;

  const ratings = user.receivedRatings;
  const ratingCount = ratings.length;
  const avgRating =
    ratingCount > 0
      ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratingCount
      : 0;

  // Signal: Average Peer Rating (30)
  if (avgRating >= 4.5) score += 30;
  else if (avgRating >= 4.0) score += 20;

  // Signal: Completed Exchanges (25)
  if (ratingCount >= 5) score += 25;

  // Signal: Profile Completeness (15)
  if (user.profileScore >= 70) score += 15;

  // Signal: Account Age (10)
  const ageMonths =
    (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24 * 30);
  if (ageMonths >= 3) score += 10;

  // Signal: Response Rate (10) - Placeholder
  // score += 10;

  // Signal: No reports (10) - Placeholder
  score += 10;

  // Cap at 100
  score = Math.min(score, 100);

  // 2. Assign Badges
  const badges = [];

  // Verified
  if (user.user_details?.isPhoneVerified && user.email) {
    badges.push('Verified');
  }

  // Reliable
  if (ratingCount >= 3 && avgRating >= 4.0) {
    badges.push('Reliable');
  }

  // Top Rated
  if (ratingCount >= 10 && avgRating >= 4.5 && score >= 80) {
    badges.push('Top Rated');
  }

  // Active Mentor
  // Has > 0 teaching skills and >= 5 ratings
  const hasTeachingSkills = user.skills.some((s) => s.type === 'TEACH');
  if (hasTeachingSkills && ratingCount >= 5) {
    badges.push('Active Mentor');
  }

  // Update User
  await prisma.user.update({
    where: { id: userId },
    data: {
      reputationScore: score,
      reputationUpdatedAt: new Date(),
    },
  });

  // Update Badges
  // Wipe and recreate
  await prisma.userBadge.deleteMany({ where: { user_id: userId } });
  if (badges.length > 0) {
    await prisma.userBadge.createMany({
      data: badges.map((b) => ({ user_id: userId, badge_type: b })),
    });
  }

  return { score, badges };
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateProfile,
  findUserDetails,
  refreshToken,
  getUsersBySearchQuery,
  getUsersRecommendations,
  checkGoogleUser,
  getProfileScore,
  loginWithGoogle,
  updateReputationAndBadges,
  getUserSettings,
  patchUserSettings,
};
