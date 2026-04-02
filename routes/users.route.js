const { Router } = require('express');
const usersController = require('../controllers/users.controller');
const { sendResponse } = require('../middlewares/reqRes.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  signup,
  refreshToken,
  profile,
  updateProfile,
  findUserDetails,
  getUsersBySearchQuery,
  getUsersRecommendations,
  checkGoogleUser,
  googleLogin,
  patchUserSettings,
} = require('../validators/users.validator');
const { upload } = require('../middlewares/multer.middleware');

const router = Router();

// Public routes
router.post('/signup', signup, usersController.signup, sendResponse);
router.post(
  '/google-check',
  checkGoogleUser,
  usersController.checkGoogleUser,
  sendResponse
);
router.post(
  '/google-login',
  googleLogin,
  usersController.googleLogin,
  sendResponse
);
router.post(
  '/refresh-token',
  refreshToken,
  usersController.refreshToken,
  sendResponse
);

router.get('/', findUserDetails, usersController.findUserDetails, sendResponse);

// Protected routes
router.post('/logout', authMiddleware, usersController.logout, sendResponse);
router.get('/me', authMiddleware, usersController.me, sendResponse);
router.get(
  '/me/profile-score',
  authMiddleware,
  usersController.getProfileScore,
  sendResponse
);
router.get(
  '/me/settings',
  authMiddleware,
  usersController.getMySettings,
  sendResponse
);
router.patch(
  '/me/settings',
  authMiddleware,
  patchUserSettings,
  usersController.patchMySettings,
  sendResponse
);
router.get(
  '/profile/:id',
  authMiddleware,
  profile,
  usersController.profile,
  sendResponse
);
router.put(
  '/profile',
  authMiddleware,
  upload.single('profileImage'),
  updateProfile,
  usersController.updateProfile,
  sendResponse
);

router.get(
  '/search',
  authMiddleware,
  getUsersBySearchQuery,
  usersController.getUsersBySearchQuery,
  sendResponse
);

router.get(
  '/recommendations',
  authMiddleware,
  getUsersRecommendations,
  usersController.getUsersRecommendations,
  sendResponse
);

router.get(
  '/community-highlights',
  authMiddleware,
  usersController.communityHighlights,
  sendResponse
);

module.exports = router;
