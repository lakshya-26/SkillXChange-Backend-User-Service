const userService = require('../services/users.service');
const { commonErrorHandler } = require('../utilites/errorHandler');

const signup = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = await userService.createUser(
      req.body
    );
    req.statusCode = 201;
    req.data = { accessToken, refreshToken };
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await userService.findUserById({
      id: req.user.id,
      viewerId: req.user.id,
    });
    req.statusCode = 200;
    req.data = user;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 404);
  }
};

const profile = async (req, res, next) => {
  try {
    const user = await userService.findUserById({
      id: req.params.id,
      viewerId: req.user.id,
    });
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
      file: req.file
        ? { buffer: req.file.buffer, mimetype: req.file.mimetype }
        : null,
    };
    const updatedUser = await userService.updateProfile(payload);
    req.statusCode = 200;
    req.data = updatedUser;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const findUserDetails = async (req, res, next) => {
  try {
    const result = await userService.findUserDetails(req.query);
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const result = await userService.refreshToken(req.body);
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const getUsersBySearchQuery = async (req, res, next) => {
  try {
    const payload = {
      ...req.query,
      user: req.user,
    };
    const result = await userService.getUsersBySearchQuery(payload);
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const getUsersRecommendations = async (req, res, next) => {
  try {
    const payload = {
      ...req.query,
      user: req.user,
    };
    const result = await userService.getUsersRecommendations(payload);
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const checkGoogleUser = async (req, res, next) => {
  try {
    const result = await userService.checkGoogleUser(req.body);
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const getProfileScore = async (req, res, next) => {
  try {
    const payload = { user: req.user };
    const result = await userService.getProfileScore(payload);
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const result = await userService.loginWithGoogle(req.body);
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 401);
  }
};

const getMySettings = async (req, res, next) => {
  try {
    const data = await userService.getUserSettings(req.user.id);
    req.statusCode = 200;
    req.data = data;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const communityHighlights = async (req, res, next) => {
  try {
    const communityService = require('../services/community.service');
    const data = await communityService.getMonthlyHighlights();
    req.statusCode = 200;
    req.data = data;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const patchMySettings = async (req, res, next) => {
  try {
    const data = await userService.patchUserSettings(req.user.id, req.body);
    req.statusCode = 200;
    req.data = data;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

module.exports = {
  signup,
  me,
  profile,
  logout,
  updateProfile,
  findUserDetails,
  refreshToken,
  getUsersBySearchQuery,
  getUsersRecommendations,
  checkGoogleUser,
  getProfileScore,
  googleLogin,
  getMySettings,
  patchMySettings,
  communityHighlights,
};
