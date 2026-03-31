const { Router } = require('express');
const sessionsController = require('../controllers/sessions.controller');
const { sendResponse } = require('../middlewares/reqRes.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');
const sessionsValidator = require('../validators/sessions.validator');

const router = Router();

router.post(
  '/',
  authMiddleware,
  sessionsValidator.createSession,
  sessionsController.createSession,
  sendResponse
);

router.get(
  '/',
  authMiddleware,
  sessionsValidator.listSessions,
  sessionsController.listMySessions,
  sendResponse
);

router.get(
  '/action-needed',
  authMiddleware,
  sessionsController.actionNeeded,
  sendResponse
);

router.get(
  '/rating-eligibility',
  authMiddleware,
  sessionsValidator.ratingEligibility,
  sessionsController.ratingEligibility,
  sendResponse
);

router.post(
  '/ratings',
  authMiddleware,
  sessionsValidator.createSessionRating,
  sessionsController.createSessionRating,
  sendResponse
);

router.get(
  '/:id',
  authMiddleware,
  sessionsValidator.sessionIdParam,
  sessionsController.getSessionDetails,
  sendResponse
);

router.patch(
  '/:id/accept',
  authMiddleware,
  sessionsValidator.sessionIdParam,
  sessionsController.acceptSession,
  sendResponse
);

router.patch(
  '/:id/reject',
  authMiddleware,
  sessionsValidator.sessionIdParam,
  sessionsController.rejectSession,
  sendResponse
);

router.patch(
  '/:id/complete',
  authMiddleware,
  sessionsValidator.sessionIdParam,
  sessionsController.completeSession,
  sendResponse
);

router.patch(
  '/:id/cancel',
  authMiddleware,
  sessionsValidator.sessionIdParam,
  sessionsController.cancelSession,
  sendResponse
);

router.patch(
  '/:id/happened',
  authMiddleware,
  sessionsValidator.sessionIdParam,
  sessionsValidator.decideHappened,
  sessionsController.decideHappened,
  sendResponse
);

module.exports = router;
