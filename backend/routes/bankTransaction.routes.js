const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const controller = require('../controllers/bankTransaction.controller');

// Public Webhook (Secured by webhook secret key) - Supports both POST and GET
router.post('/webhook', controller.handleWebhook);
router.get('/webhook', controller.handleWebhook);

// Authenticated Endpoints
router.use(auth);

// Permission middleware for bank settings vs bank reports
const requireBankSettings = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') return next();
  const hasPerm = (req.user?.permissions || []).some(p => p.page === 'bank-settings');
  if (!hasPerm) {
    return res.status(403).json({ message: 'Access denied: You do not have permission for Bank Settings' });
  }
  next();
};

const requireBankReports = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') return next();
  const hasPerm = (req.user?.permissions || []).some(p => p.page === 'bank-reports');
  if (!hasPerm) {
    return res.status(403).json({ message: 'Access denied: You do not have permission for Transaction Reports' });
  }
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') return next();
  return res.status(403).json({ message: 'Access denied: Superadmin access required for Quick SMS Import' });
};

router.get('/settings', requireBankSettings, controller.getSettings);
router.put('/settings', requireBankSettings, controller.updateSettings);
router.get('/stats', requireBankReports, controller.getStats);
router.get('/search-students', requireBankReports, controller.searchStudents);
router.get('/student-payment-history', requireBankReports, controller.getStudentPaymentHistory);
router.post('/check-existing-payments', requireBankReports, controller.checkExistingPayments);
router.post('/sync-all-receipts', requireBankReports, controller.syncAllReceipts);
router.post('/parse-manual', requireSuperAdmin, controller.parseManual);
router.get('/:id/suggested-matches', requireBankReports, controller.getSuggestedMatches);
router.post('/:id/sync-receipt', requireBankReports, controller.syncTransactionReceipt);
router.post('/:id/link-students', requireBankReports, controller.linkStudents);
router.post('/:id/link-student', requireBankReports, controller.linkStudents);
router.post('/:id/approve-payment', requireBankReports, controller.approvePayment);
router.post('/:id/unapprove-payment', requireBankReports, controller.unapprovePayment);
router.delete('/:id', requireBankReports, controller.deleteTransaction);
router.get('/', requireBankReports, controller.getTransactions);

module.exports = router;

