const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const auth = require('../middleware/auth.middleware');

const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

router.use(auth);

router.post('/parse-import', upload.single('file'), paymentController.parseImportFile);
router.post('/bulk-import', paymentController.bulkImportPayments);

router.post('/', paymentController.createPayment);
router.get('/', paymentController.getPayments);
router.get('/status', paymentController.getPaymentStatusByMonthYear);
router.get('/student/:studentId', paymentController.getPaymentsByStudent);
router.get('/:studentId/:month/:year', paymentController.getPaymentByStudentMonthYear);
router.put('/:id', paymentController.updatePayment);
router.delete('/:id', paymentController.deletePayment);

module.exports = router;
