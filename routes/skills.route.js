const { Router } = require('express');
const skillsController = require('../controllers/skills.controller');
const { sendResponse } = require('../middlewares/reqRes.middleware');
const { addSkill, getSkills } = require('../validators/skills.validator');

const router = Router();

router.post('/', addSkill, skillsController.addSkill, sendResponse);
router.get('/', getSkills, skillsController.getSkills, sendResponse);

module.exports = router;
