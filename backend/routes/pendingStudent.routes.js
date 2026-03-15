const express = require('express');
const { submitPending, getPending, getPendingCount, approvePending, rejectPending } = require('../controllers/pendingStudent.controller');
const auth = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

// Public — submitted from registration form (no auth needed)
router.post('/', upload.single('photo'), submitPending);

// Protected — admin only
router.get('/', auth, getPending);
router.get('/count', auth, getPendingCount);
router.patch('/:id/approve', auth, approvePending);
router.patch('/:id/reject', auth, rejectPending);

module.exports = router;
