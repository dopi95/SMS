const express = require('express');
const { getStudents, getInactiveStudents, getStudent, createStudent, updateStudent, deleteStudent, inactiveStudent, activateStudent, bulkUpdateClass, bulkInactive, bulkDelete, bulkImport, bulkAssignSections, generateCredentials, generateCredentialSingle, getCredential } = require('../controllers/student.controller');
const auth = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

const photoFields = upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'fatherPhoto', maxCount: 1 }, { name: 'motherPhoto', maxCount: 1 }]);

// Bulk operations — must be before /:id wildcard routes
router.post('/bulk/update-class', auth, bulkUpdateClass);
router.post('/bulk/inactive', auth, bulkInactive);
router.post('/bulk/delete', auth, bulkDelete);
router.post('/bulk/import', auth, bulkImport);
router.post('/bulk/assign-sections', auth, bulkAssignSections);
router.post('/generate-credentials', auth, generateCredentials);
router.post('/:id/generate-credential', auth, generateCredentialSingle);
router.get('/:id/credential', auth, getCredential);

router.get('/', auth, getStudents);
router.get('/inactive', auth, getInactiveStudents);
router.post('/', auth, photoFields, createStudent);
router.get('/:id', auth, getStudent);
router.put('/:id', auth, photoFields, updateStudent);
router.patch('/:id/inactive', auth, inactiveStudent);
router.patch('/:id/activate', auth, activateStudent);
router.delete('/:id', auth, deleteStudent);

module.exports = router;