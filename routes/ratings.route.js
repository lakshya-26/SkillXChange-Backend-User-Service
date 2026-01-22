const router = require('express').Router();
const ratingsController = require('../controllers/ratings.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.post('/', authMiddleware, ratingsController.createRating);
router.get('/given', authMiddleware, ratingsController.getMyGivenRatings);
router.get('/received', authMiddleware, ratingsController.getMyReceivedRatings);
router.get('/eligibility', authMiddleware, ratingsController.checkEligibility);

module.exports = router;
