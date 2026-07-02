const express = require('express');
const { submitPending, getPending, getPendingCount, approvePending, rejectPending, deletePending } = require('../controllers/pendingEmployee.controller');
const auth = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

// Public — submitted from employee registration form
router.post('/', upload.fields([{ name: 'photo', maxCount: 1 }]), submitPending);

// Protected — admin only
router.get('/',              auth, getPending);
router.get('/count',         auth, getPendingCount);
router.patch('/:id/approve', auth, approvePending);
router.patch('/:id/reject',  auth, rejectPending);
router.delete('/:id',        auth, deletePending);

module.exports = router;
