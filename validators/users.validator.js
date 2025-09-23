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

const updateProfile = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(50),
    username: Joi.string().alphanum().min(3).max(30),
    email: Joi.string().email(),
    password: Joi.string().min(8),
  })
    .or('name', 'username', 'email', 'password')
    .required();

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

module.exports = {
  signup,
  login,
  updateProfile,
  forgotPassword,
  resetPassword,
};
