const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const redis = require('../utilites/redis');
const { sendEmail } = require('../utilites/email');
const { CustomException } = require('../utilites/errorHandler');
const { createTokens } = require('../utilites/jwtHelper');
const prisma = require('../utilites/prisma');
const { SALT } = require('../constants/auth.constant');
const userSerializer = require('../serializers/users.serializer');

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
    email,
    password,
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
  } = payload;

  const existingUser = await findUserByEmail({ email });
  if (existingUser) {
    throw new CustomException('User with this email already exists', 409);
  }

  const existingUsername = await findUserByUsername({ username });
  if (existingUsername) {
    throw new CustomException('Username already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        username,
        email,
        password_hash: hashedPassword,
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
  const { password_hash: _, ...userWithoutPassword } = result;

  return { accessToken, refreshToken, user: userWithoutPassword };
};

const login = async (payload) => {
  const { email, username, password } = payload;

  if (!email && !username) {
    throw new CustomException('Email or username is required', 400);
  }

  let user;
  if (email) {
    user = await findUserByEmail({ email });
    if (!user) {
      throw new CustomException('Email not found', 401);
    }
  } else if (username) {
    user = await findUserByUsername({ username });
    if (!user) {
      throw new CustomException('Username not found', 401);
    }
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new CustomException('Incorrect password', 401);
  }

  const { accessToken, refreshToken } = createTokens(user);
  // Exclude password from the returned user object
  const { password_hash: _, ...userWithoutPassword } = user;

  return { accessToken, refreshToken, user: userWithoutPassword };
};

const findUserById = async (payload) => {
  const { id } = payload;
  const user = await prisma.user.findUnique({
    where: {
      id: parseInt(id),
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
      },
    },
  });

  if (!user) {
    throw new CustomException('User not found', 404);
  }

  const serializedUser = userSerializer.userDetails(user);
  return serializedUser;
};

const updateProfile = async (payload) => {
  const { id, profileData } = payload;

  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
  });

  if (!user) {
    throw new CustomException('User not found', 404);
  }

  await prisma.user.update({
    where: { id: parseInt(id) },
    data: profileData,
  });
  return { message: 'Profile updated successfully' };
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const sendResetToken = async (payload) => {
  const { email } = payload;

  const user = await findUserByEmail({ email });
  if (!user) {
    throw new CustomException('User with this email does not exist', 404);
  }

  const resetToken = generateResetToken();
  const redisKey = `reset:${resetToken}`;

  await redis.set(redisKey, email, 900);

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const subject = 'Password Reset Request';
  const text = `Click this link to reset your password: ${resetLink}. This link will expire in 15 minutes.`;
  const html = `<p>Click <a href="${resetLink}">here</a> to reset your password.</p><p>This link will expire in 15 minutes.</p>`;

  const emailSent = await sendEmail(email, subject, text, html);
  if (!emailSent) {
    throw new CustomException('Failed to send reset email', 500);
  }

  return { message: 'Password reset link sent successfully to your email' };
};

const resetPasswordWithToken = async (payload) => {
  const { token, newPassword } = payload;

  const redisKey = `reset:${token}`;
  const email = await redis.get(redisKey);

  if (!email) {
    throw new CustomException('Reset token has expired or is invalid', 400);
  }

  const user = await findUserByEmail({ email });
  if (!user) {
    throw new CustomException('User not found', 404);
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT);

  await prisma.user.update({
    where: { email },
    data: { password_hash: hashedPassword },
  });

  await redis.del(redisKey);

  return { message: 'Password reset successfully' };
};

module.exports = {
  createUser,
  login,
  findUserByEmail,
  findUserById,
  updateProfile,
  generateResetToken,
  sendResetToken,
  resetPasswordWithToken,
};
