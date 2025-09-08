const bcrypt = require('bcryptjs');
const { CustomException } = require('../utilites/errorHandler');
const { createTokens } = require('../utilites/jwtHelper');
const prisma = require('../utilites/prisma');

const findUserByEmail = async (payload) => {
  const { email } = payload;
  return prisma.user.findUnique({
    where: { email },
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
  const { email, password } = payload;

  const user = await findUserByEmail({ email });
  if (!user) {
    throw new CustomException('Invalid email or password', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new CustomException('Invalid email or password', 401);
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

module.exports = {
  createUser,
  login,
  findUserByEmail,
  findUserById,
  updateProfile,
};
