const ratingsService = require('../services/ratings.service');
const { commonErrorHandler } = require('../utilites/errorHandler');

const createRating = async (req, res) => {
  try {
    const raterId = req.user.id;
    // We assume middleware populates req.user
    const token = req.headers.authorization;

    const result = await ratingsService.createRating(raterId, req.body, token);

    return res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Create rating error:', error);
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const getMyGivenRatings = async (req, res) => {
  try {
    const result = await ratingsService.getMyGivenRatings(req.user.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Get given ratings error:', error);
    commonErrorHandler(req, res, error.message, error.statusCode || 500);
  }
};

const getMyReceivedRatings = async (req, res) => {
  try {
    const result = await ratingsService.getMyReceivedRatings(req.user.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Get received ratings error:', error);
    commonErrorHandler(req, res, error.message, error.statusCode || 500);
  }
};

const checkEligibility = async (req, res) => {
  try {
    const raterId = req.user.id;
    const { rateeId } = req.query;
    if (!rateeId) {
      return commonErrorHandler(req, res, 'Missing rateeId', 400);
    }

    const token = req.headers.authorization;
    const result = await ratingsService.canRate(raterId, rateeId, token);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Check eligibility error:', error);
    commonErrorHandler(req, res, error.message, 500);
  }
};

module.exports = {
  createRating,
  getMyGivenRatings,
  getMyReceivedRatings,
  checkEligibility,
};
