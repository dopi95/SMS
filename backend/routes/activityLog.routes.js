const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { getLogs, clearLogs } = require('../controllers/activityLog.controller');

router.get('/', auth, getLogs);
router.delete('/clear', auth, clearLogs);

module.exports = router;
