const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const controller = require('../controllers/bankTransaction.controller');

// Public Webhook (Secured by webhook secret key) - Supports both POST and GET
router.post('/webhook', controller.handleWebhook);
router.get('/webhook', controller.handleWebhook);

// Authenticated Endpoints
router.use(auth);

router.get('/settings', controller.getSettings);
router.put('/settings', controller.updateSettings);
router.get('/stats', controller.getStats);
router.get('/search-students', controller.searchStudents);
router.get('/student-payment-history', controller.getStudentPaymentHistory);
router.post('/check-existing-payments', controller.checkExistingPayments);
router.post('/sync-all-receipts', controller.syncAllReceipts);
router.post('/parse-manual', controller.parseManual);
router.get('/:id/suggested-matches', controller.getSuggestedMatches);
router.post('/:id/sync-receipt', controller.syncTransactionReceipt);
router.post('/:id/link-students', controller.linkStudents);
router.post('/:id/link-student', controller.linkStudents);
router.post('/:id/approve-payment', controller.approvePayment);
router.post('/:id/unapprove-payment', controller.unapprovePayment);
router.delete('/:id', controller.deleteTransaction);
router.get('/', controller.getTransactions);

module.exports = router;

