const express = require('express');
const { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher } = require('../controllers/teacher.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', auth, getTeachers);
router.get('/:id', auth, getTeacher);
router.post('/', auth, createTeacher);
router.put('/:id', auth, updateTeacher);
router.delete('/:id', auth, deleteTeacher);

module.exports = router;