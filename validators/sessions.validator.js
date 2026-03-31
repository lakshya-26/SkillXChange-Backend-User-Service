const Joi = require('joi');
const { validateRequest } = require('../helpers/commonFunctions.helper');

const requestParameterTypes = {
  body: 'body',
  query: 'query',
  params: 'param',
};

const createSession = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(2).max(120).required(),
    description: Joi.string().max(5000).allow('', null).optional(),
    scheduledAt: Joi.date().iso().required(),
    durationMinutes: Joi.number().integer().min(15).max(480).required(),
    meetingLink: Joi.string().max(2000).allow('', null).optional(),
    userBId: Joi.number().integer().required(),
  });
  return validateRequest(req, res, next, schema, requestParameterTypes.body);
};

const listSessions = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(50).optional(),
    status: Joi.string()
      .valid('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED')
      .optional(),
  });
  return validateRequest(req, res, next, schema, requestParameterTypes.query);
};

const sessionIdParam = (req, res, next) => {
  const schema = Joi.object({
    id: Joi.string().uuid().required(),
  });
  return validateRequest(req, res, next, schema, requestParameterTypes.params);
};

const decideHappened = (req, res, next) => {
  const schema = Joi.object({
    happened: Joi.boolean().required(),
  });
  return validateRequest(req, res, next, schema, requestParameterTypes.body);
};

const ratingEligibility = (req, res, next) => {
  const schema = Joi.object({
    otherUserId: Joi.number().integer().required(),
  });
  return validateRequest(req, res, next, schema, requestParameterTypes.query);
};

const createSessionRating = (req, res, next) => {
  const schema = Joi.object({
    sessionId: Joi.string().uuid().optional(),
    rateeId: Joi.number().integer().required(),
    stars: Joi.number().integer().min(1).max(5).required(),
    feedback: Joi.string().max(2000).allow('', null).optional(),
  });
  return validateRequest(req, res, next, schema, requestParameterTypes.body);
};

module.exports = {
  createSession,
  listSessions,
  sessionIdParam,
  decideHappened,
  ratingEligibility,
  createSessionRating,
};
