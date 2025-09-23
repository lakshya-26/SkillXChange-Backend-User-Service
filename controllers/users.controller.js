const userService = require('../services/users.service');
const { commonErrorHandler } = require('../utilites/errorHandler');

const signup = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await userService.createUser(
      req.body
    );
    req.statusCode = 201;
    req.data = { accessToken, refreshToken, user };
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await userService.login(
      req.body
    );
    req.statusCode = 200;
    req.data = { accessToken, refreshToken, user };
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 401);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await userService.findUserById({ id: req.user.id });
    req.statusCode = 200;
    req.data = user;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 404);
  }
};

const profile = async (req, res, next) => {
  try {
    const user = await userService.findUserById({ id: req.user.id });
    req.statusCode = 200;
    req.data = user;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 404);
  }
};

const logout = (req, res, next) => {
  req.statusCode = 200;
  req.data = { message: 'Logged out successfully' };
  next();
};

const updateProfile = async (req, res, next) => {
  try {
    const payload = {
      id: req.user.id,
      profileData: req.body,
    };
    const updatedUser = await userService.updateProfile(payload);
    req.statusCode = 200;
    req.data = updatedUser;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const result = await userService.sendResetToken(req.body);
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const result = await userService.resetPasswordWithToken(req.body);
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

module.exports = {
  signup,
  login,
  me,
  profile,
  logout,
  updateProfile,
  forgotPassword,
  resetPassword,
};
