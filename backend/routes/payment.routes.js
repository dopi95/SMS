const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const auth = require('../middleware/auth.middleware');

router.use(auth);

router.post('/', paymentController.createPayment);
router.get('/', paymentController.getPayments);
router.get('/status', paymentController.getPaymentStatusByMonthYear);
router.get('/student/:studentId', paymentController.getPaymentsByStudent);
router.get('/:studentId/:month/:year', paymentController.getPaymentByStudentMonthYear);
router.put('/:id', paymentController.updatePayment);
router.delete('/:id', paymentController.deletePayment);

module.exports = router;
