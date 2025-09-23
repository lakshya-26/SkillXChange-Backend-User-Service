const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const redis = require('../utilites/redis');
const { sendEmail } = require('../utilites/email');
const { CustomException } = require('../utilites/errorHandler');
const { createTokens } = require('../utilites/jwtHelper');
const prisma = require('../utilites/prisma');

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

const createUser = async (payload) => {
  const { name, email, password, username } = payload;

  const existingUser = await findUserByEmail({ email });
  if (existingUser) {
    throw new CustomException('User with this email already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      username,
      email,
      password_hash: hashedPassword,
    },
  });

  const { accessToken, refreshToken } = createTokens(user);
  const { password: _, ...userWithoutPassword } = user;

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
  }

  if (username) {
    user = await findUserByUsername({ username });
    if (!user) {
      throw new CustomException('Username not found', 401);
    }
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
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
    where: { id: parseInt(id) },
  });

  if (!user) {
    throw new CustomException('User not found', 404);
  }

  const { password_hash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
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

  const hashedPassword = await bcrypt.hash(newPassword, 10);

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
