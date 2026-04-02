const sessionsService = require('../services/sessions.service');
const { commonErrorHandler } = require('../utilites/errorHandler');

const createSession = async (req, res, next) => {
  try {
    const result = await sessionsService.createSession(req.user.id, req.body);
    req.statusCode = 201;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const listMySessions = async (req, res, next) => {
  try {
    const result = await sessionsService.listMySessions(req.user.id, req.query);
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const getSessionDetails = async (req, res, next) => {
  try {
    const result = await sessionsService.getSessionDetails(
      req.user.id,
      req.params.id
    );
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 404);
  }
};

const acceptSession = async (req, res, next) => {
  try {
    const result = await sessionsService.acceptSession(
      req.user.id,
      req.params.id
    );
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const rejectSession = async (req, res, next) => {
  try {
    const result = await sessionsService.rejectSession(
      req.user.id,
      req.params.id
    );
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const completeSession = async (req, res, next) => {
  try {
    const result = await sessionsService.completeSession(
      req.user.id,
      req.params.id
    );
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const cancelSession = async (req, res, next) => {
  try {
    const result = await sessionsService.cancelSession(
      req.user.id,
      req.params.id
    );
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const decideHappened = async (req, res, next) => {
  try {
    const result = await sessionsService.decideHappened(
      req.user.id,
      req.params.id,
      req.body.happened
    );
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const actionNeeded = async (req, res, next) => {
  try {
    const result = await sessionsService.getActionNeeded(req.user.id);
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const ratingEligibility = async (req, res, next) => {
  try {
    const otherUserId = req.query.otherUserId;
    const result = await sessionsService.getSessionRatingEligibility(
      req.user.id,
      otherUserId
    );
    req.statusCode = 200;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const createSessionRating = async (req, res, next) => {
  try {
    const result = await sessionsService.createSessionRating(
      req.user.id,
      req.body
    );
    req.statusCode = 201;
    req.data = result;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

module.exports = {
  createSession,
  listMySessions,
  getSessionDetails,
  acceptSession,
  rejectSession,
  completeSession,
  cancelSession,
  decideHappened,
  actionNeeded,
  ratingEligibility,
  createSessionRating,
};
