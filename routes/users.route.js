const { Router } = require('express');
const usersController = require('../controllers/users.controller');
const { sendResponse } = require('../middlewares/reqRes.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  signup,
  login,
  updateProfile,
  forgotPassword,
  resetPassword,
} = require('../validators/users.validator');

const router = Router();

// Public routes
router.post('/signup', signup, usersController.signup, sendResponse);
router.post('/login', login, usersController.login, sendResponse);
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

// Protected routes
router.post('/logout', authMiddleware, usersController.logout, sendResponse);
router.get('/me', authMiddleware, usersController.me, sendResponse);
router.get('/profile', authMiddleware, usersController.profile, sendResponse);
router.put(
  '/profile/update',
  authMiddleware,
  updateProfile,
  usersController.updateProfile,
  sendResponse
);

module.exports = router;
