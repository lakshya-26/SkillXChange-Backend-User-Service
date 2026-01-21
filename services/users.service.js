const { OAuth2Client } = require('google-auth-library');

const { CustomException } = require('../utilites/errorHandler');
const { createTokens, verifyToken } = require('../utilites/jwtHelper');
const prisma = require('../utilites/prisma');
const { buildUserMatchQuery } = require('../helpers/users.helper');
const userSerializer = require('../serializers/users.serializer');
const { uploadBuffer } = require('../utilites/cloudinary');
const redis = require('../utilites/redis');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (token) => {
  try {
    // Assume token is an Access Token and fetch user info
    const response = await googleClient.request({
      url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    // Fallback: If it fails, strictly it's an invalid token for our purpose
    throw new CustomException('Invalid Google Token', 400);
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
      user_details: {
        select: {
          profession: true,
          address: true,
          phone_number: true,
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
  const email = payloadFromGoogle.email;

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

  // Generate tokens after transaction
  const { accessToken, refreshToken } = createTokens(result);

  return { accessToken, refreshToken, user: result };
};

const findUserById = async (payload) => {
  const { id } = payload;
  const user = await getUserDetails(parseInt(id));

  if (!user) {
    throw new CustomException('User not found', 404);
  }

  const serializedUser = userSerializer.userDetails(user);
  return serializedUser;
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
      },
      create: {
        user_id: numericUserId,
        profession: profession || '',
        address: address || '',
        phone_number: phoneNumber,
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
  const user = await findUserById({ id: decoded.id });
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

  const { accessToken, refreshToken } = createTokens(user);

  return { accessToken, refreshToken, user };
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
  loginWithGoogle,
};
