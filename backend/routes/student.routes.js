const express = require('express');
const { getStudents, getStudent, createStudent, updateStudent, deleteStudent } = require('../controllers/student.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', auth, getStudents);
router.get('/:id', auth, getStudent);
router.post('/', auth, createStudent);
router.put('/:id', auth, updateStudent);
router.delete('/:id', auth, deleteStudent);

module.exports = router;