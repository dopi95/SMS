const Payment = require('../models/Payment.model');
const Student = require('../models/Student.model');
const asyncHandler = require('../utils/asyncHandler');

// Create payment
exports.createPayment = asyncHandler(async (req, res) => {
  const { studentId, month, year, amount, description, paymentDate } = req.body;

  const student = await Student.findById(studentId);
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  const existingPayment = await Payment.findOne({ studentId, month, year });
  if (existingPayment) {
    return res.status(400).json({ message: 'Payment already exists for this month and year' });
  }

  const payment = await Payment.create({
    studentId,
    month,
    year,
    amount,
    description,
    paymentDate,
    status: 'paid',
    createdBy: req.user.id
  });

  const populatedPayment = await Payment.findById(payment._id).populate('studentId');
  res.status(201).json(populatedPayment);
});

// Get all payments
exports.getPayments = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  
  let query = {};
  if (month) query.month = month;
  if (year) query.year = parseInt(year);

  const payments = await Payment.find(query).populate('studentId').sort({ createdAt: -1 });
  res.json(payments);
});

// Get payment by student, month, and year
exports.getPaymentByStudentMonthYear = asyncHandler(async (req, res) => {
  const { studentId, month, year } = req.params;

  const payment = await Payment.findOne({ 
    studentId, 
    month, 
    year: parseInt(year) 
  }).populate('studentId');

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  res.json(payment);
});

// Update payment
exports.updatePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, description, paymentDate } = req.body;

  const payment = await Payment.findByIdAndUpdate(
    id,
    { amount, description, paymentDate },
    { new: true, runValidators: true }
  ).populate('studentId');

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  res.json(payment);
});

// Delete payment
exports.deletePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await Payment.findByIdAndDelete(id);

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  res.json({ message: 'Payment deleted successfully' });
});

// Get paid/unpaid student IDs for a given month and year
exports.getPaymentStatusByMonthYear = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ message: 'month and year are required' });
  }

  const allStudents = await Student.find({ status: { $ne: 'inactive' } }).select('_id');
  const paidPayments = await Payment.find({ month, year: parseInt(year) }).select('studentId');
  const paidIds = new Set(paidPayments.map(p => p.studentId.toString()));

  const paid = allStudents.filter(s => paidIds.has(s._id.toString())).map(s => s._id);
  const unpaid = allStudents.filter(s => !paidIds.has(s._id.toString())).map(s => s._id);

  res.json({ paid, unpaid });
});

// Get payments by student
exports.getPaymentsByStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const payments = await Payment.find({ studentId }).populate('studentId').sort({ year: -1, month: 1 });
  res.json(payments);
});
