const Joi = require('joi');
const { validateRequest } = require('../helpers/commonFunctions.helper');
const requestParameterTypes = {
  body: 'body',
  query: 'query',
  params: 'param',
};

const addSkill = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
  });

  return validateRequest(req, res, next, schema, requestParameterTypes.body);
};

const getSkills = (req, res, next) => {
  const schema = Joi.object({
    term: Joi.string().min(3).max(50).optional(),
  });

  return validateRequest(req, res, next, schema, requestParameterTypes.query);
};

module.exports = {
  addSkill,
  getSkills,
};
