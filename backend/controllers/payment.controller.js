const Payment = require('../models/Payment.model');
const Student = require('../models/Student.model');
const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/logActivity');

const formatStudentName = (s) => (s ? [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ') : '');

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
  const sName = formatStudentName(populatedPayment.studentId) || studentId;
  await logActivity(req.user, 'Payment Added', 'Payment', `Marked ${month} ${year} as paid for ${sName}`);
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

  const payment = await Payment.findByIdAndDelete(id).populate('studentId');

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }
  const sName = formatStudentName(payment.studentId);
  await logActivity(req.user, 'Payment Deleted', 'Payment', `Removed ${payment.month} ${payment.year} payment for ${sName}`);
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

  const payments = await Payment.find({ studentId }).populate('studentId');

  const monthOrder = {
    'september': 1, 'meskerem': 1, 'መስከረም': 1,
    'october': 2, 'tikimt': 2, 'ጥቅምት': 2,
    'november': 3, 'hidar': 3, 'ህዳር': 3,
    'december': 4, 'tahsas': 4, 'ታህሳስ': 4,
    'january': 5, 'tir': 5, 'ጥር': 5,
    'february': 6, 'yekatit': 6, 'የካቲት': 6,
    'march': 7, 'megabit': 7, 'መጋቢት': 7,
    'april': 8, 'miazia': 8, 'ሚያዚያ': 8,
    'may': 9, 'ginbot': 9, 'ግንቦት': 9,
    'june': 10, 'sene': 10, 'ሰኔ': 10,
    'july': 11, 'hamle': 11, 'ሐምሌ': 11,
    'august': 12, 'nehase': 12, 'ነሐሴ': 12,
    'pagume': 13, 'ጳጉሜ': 13
  };

  payments.sort((a, b) => {
    const yearDiff = (Number(b.year) || 0) - (Number(a.year) || 0);
    if (yearDiff !== 0) return yearDiff;
    const orderA = monthOrder[a.month ? a.month.toLowerCase().trim() : ''] || 0;
    const orderB = monthOrder[b.month ? b.month.toLowerCase().trim() : ''] || 0;
    if (orderB !== orderA) return orderB - orderA;
    const timeA = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
    const timeB = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
    return timeB - timeA;
  });

  res.json(payments);
});

