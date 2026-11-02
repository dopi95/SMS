const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const controller = require('../controllers/bankTransaction.controller');

// Public Webhook (Secured by webhook secret key)
router.post('/webhook', controller.handleWebhook);

// Authenticated Endpoints
router.use(auth);

router.get('/settings', controller.getSettings);
router.put('/settings', controller.updateSettings);
router.get('/stats', controller.getStats);
router.get('/search-students', controller.searchStudents);
router.post('/parse-manual', controller.parseManual);
router.post('/:id/link-student', controller.linkStudent);
router.post('/:id/approve-payment', controller.approvePayment);
router.post('/:id/unapprove-payment', controller.unapprovePayment);
router.delete('/:id', controller.deleteTransaction);
router.get('/', controller.getTransactions);

module.exports = router;

