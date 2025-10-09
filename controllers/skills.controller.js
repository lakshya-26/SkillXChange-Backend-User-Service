const skillService = require('../services/skills.service');
const { commonErrorHandler } = require('../utilites/errorHandler');

const addSkill = async (req, res, next) => {
  try {
    const skill = await skillService.addSkill(req.body);
    req.statusCode = 201;
    req.data = skill;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 400);
  }
};

const getSkills = async (req, res, next) => {
  try {
    const skills = await skillService.getSkills(req.query);
    req.statusCode = 200;
    req.data = skills;
    next();
  } catch (error) {
    commonErrorHandler(req, res, error.message, error.statusCode || 404);
  }
};

module.exports = {
  addSkill,
  getSkills,
};
