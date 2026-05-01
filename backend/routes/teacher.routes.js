const express = require('express');
const { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher, bulkImportTeachers } = require('../controllers/teacher.controller');
const auth = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.get('/', auth, getTeachers);
router.get('/:id', auth, getTeacher);
router.post('/', auth, upload.single('photo'), createTeacher);
router.put('/:id', auth, upload.single('photo'), updateTeacher);
router.delete('/:id', auth, deleteTeacher);
router.post('/bulk/import', auth, bulkImportTeachers);

module.exports = router;