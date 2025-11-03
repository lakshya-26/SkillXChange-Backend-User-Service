const Joi = require('joi');
const { validateRequest } = require('../helpers/commonFunctions.helper');
const requestParameterTypes = {
  body: 'body',
  query: 'query',
  params: 'param',
};

const signup = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    profession: Joi.string().min(3).max(50).required(),
    skillsToLearn: Joi.array().items(Joi.string().min(3).max(50)).required(),
    skillsToTeach: Joi.array().items(Joi.string().min(3).max(50)).required(),
    address: Joi.string().min(3).max(1000).required(),
    phoneNumber: Joi.string().empty('').min(10).max(10).optional(),
    instagram: Joi.string().empty('').min(3).max(50).optional(),
    twitter: Joi.string().empty('').min(3).max(50).optional(),
    github: Joi.string().empty('').min(3).max(50).optional(),
    linkedin: Joi.string().empty('').min(3).max(50).optional(),
  });

  return validateRequest(req, res, next, schema, requestParameterTypes.body);
};

const login = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().optional(),
    username: Joi.string().alphanum().min(3).max(30).optional(),
    password: Joi.string().min(8).required(),
  }).or('email', 'username');

  return validateRequest(req, res, next, schema, requestParameterTypes.body);
};

const profile = (req, res, next) => {
  const schema = Joi.object({
    id: Joi.number().integer().required(),
  });

  return validateRequest(req, res, next, schema, requestParameterTypes.params);
};

const updateProfile = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(50).optional(),
    username: Joi.string().alphanum().min(3).max(30).optional(),
    email: Joi.string().email().optional(),
    profession: Joi.string().min(3).max(50).optional(),
    skillsToLearn: Joi.array().items(Joi.string().min(3).max(50)).optional(),
    skillsToTeach: Joi.array().items(Joi.string().min(3).max(50)).optional(),
    address: Joi.string().min(3).max(1000).optional(),
    phoneNumber: Joi.string().empty('').min(10).max(10).optional(),
    instagram: Joi.string().empty('').min(3).max(50).optional(),
    twitter: Joi.string().empty('').min(3).max(50).optional(),
    github: Joi.string().empty('').min(3).max(50).optional(),
    linkedin: Joi.string().empty('').min(3).max(50).optional(),
  });

  return validateRequest(req, res, next, schema, requestParameterTypes.body);
};

const forgotPassword = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });

  return validateRequest(req, res, next, schema, requestParameterTypes.body);
};

const resetPassword = (req, res, next) => {
  const schema = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
  });

  return validateRequest(req, res, next, schema, requestParameterTypes.body);
};

const findUserDetails = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().optional(),
    username: Joi.string().alphanum().min(3).max(30).optional(),
  }).or('email', 'username');

  return validateRequest(req, res, next, schema, requestParameterTypes.query);
};

const refreshToken = (req, res, next) => {
  const schema = Joi.object({
    refreshToken: Joi.string().required(),
  });

  return validateRequest(req, res, next, schema, requestParameterTypes.body);
};

const getUsersBySearchQuery = (req, res, next) => {
  const schema = Joi.object({
    term: Joi.string().min(3).max(50).optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  });

  return validateRequest(req, res, next, schema, requestParameterTypes.query);
};

const getUsersRecommendations = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  });

  return validateRequest(req, res, next, schema, requestParameterTypes.query);
};

module.exports = {
  signup,
  login,
  profile,
  updateProfile,
  forgotPassword,
  resetPassword,
  findUserDetails,
  refreshToken,
  getUsersBySearchQuery,
  getUsersRecommendations,
};
