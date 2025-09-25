const { Router } = require('express');
const skillsController = require('../controllers/skills.controller');
const { sendResponse } = require('../middlewares/reqRes.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { addSkill, getSkills } = require('../validators/skills.validator');

const router = Router();

router.post(
  '/',
  authMiddleware,
  addSkill,
  skillsController.addSkill,
  sendResponse
);
router.get(
  '/',
  authMiddleware,
  getSkills,
  skillsController.getSkills,
  sendResponse
);

module.exports = router;
