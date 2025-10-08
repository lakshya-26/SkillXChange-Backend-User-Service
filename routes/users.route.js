const { Router } = require('express');
const usersController = require('../controllers/users.controller');
const { sendResponse } = require('../middlewares/reqRes.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  signup,
  login,
  refreshToken,
  profile,
  updateProfile,
  forgotPassword,
  resetPassword,
  findUserDetails,
} = require('../validators/users.validator');

const router = Router();

// Public routes
router.post('/signup', signup, usersController.signup, sendResponse);
router.post('/login', login, usersController.login, sendResponse);
router.post(
  '/refresh-token',
  refreshToken,
  usersController.refreshToken,
  sendResponse
);
router.post(
  '/forgot-password',
  forgotPassword,
  usersController.forgotPassword,
  sendResponse
);
router.post(
  '/reset-password',
  resetPassword,
  usersController.resetPassword,
  sendResponse
);
router.get('/', findUserDetails, usersController.findUserDetails, sendResponse);

// Protected routes
router.post('/logout', authMiddleware, usersController.logout, sendResponse);
router.get('/me', authMiddleware, usersController.me, sendResponse);
router.get(
  '/profile/:id',
  authMiddleware,
  profile,
  usersController.profile,
  sendResponse
);
router.put(
  '/profile/update',
  authMiddleware,
  updateProfile,
  usersController.updateProfile,
  sendResponse
);

module.exports = router;
