const express = require('express');
const { getStudents, getInactiveStudents, getStudent, createStudent, updateStudent, deleteStudent, inactiveStudent, activateStudent, bulkUpdateClass, bulkInactive, bulkDelete } = require('../controllers/student.controller');
const auth = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.get('/', auth, getStudents);
router.get('/inactive', auth, getInactiveStudents);
router.get('/:id', auth, getStudent);
router.post('/', auth, upload.single('photo'), createStudent);
router.put('/:id', auth, upload.single('photo'), updateStudent);
router.patch('/:id/inactive', auth, inactiveStudent);
router.patch('/:id/activate', auth, activateStudent);
router.delete('/:id', auth, deleteStudent);

// Bulk operations
router.post('/bulk/update-class', auth, bulkUpdateClass);
router.post('/bulk/inactive', auth, bulkInactive);
router.post('/bulk/delete', auth, bulkDelete);

module.exports = router;