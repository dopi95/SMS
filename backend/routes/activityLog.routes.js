const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { getLogs, clearLogs, deleteLog } = require('../controllers/activityLog.controller');

router.get('/', auth, getLogs);
router.delete('/clear', auth, clearLogs);
router.delete('/:id', auth, deleteLog);

module.exports = router;
