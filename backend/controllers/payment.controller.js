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
  if (month && month !== 'all') query.month = month;
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

const { parsePaymentFile, normalizeMonth, extractMonthFromText, ETHIOPIAN_ACADEMIC_MONTHS } = require('../utils/paymentFileParser');

// Parse imported payment file (PDF or Excel)
exports.parseImportFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const defaultYear = parseInt(req.body.defaultYear) || new Date().getFullYear();
  let defaultMonth = req.body.defaultMonth;
  if (!defaultMonth || defaultMonth === 'all' || !ETHIOPIAN_ACADEMIC_MONTHS.includes(defaultMonth)) {
    defaultMonth = 'September';
  }

  // Parse raw rows from file
  const rawRows = await parsePaymentFile(req.file.buffer, req.file.originalname, req.file.mimetype);
  if (!rawRows || rawRows.length === 0) {
    return res.status(400).json({ 
      message: 'No payment records could be extracted from the uploaded file. Please check file format.' 
    });
  }

  // Fetch all active students
  const students = await Student.find(
    { status: { $ne: 'inactive' } },
    {
      _id: 1,
      studentId: 1,
      firstName: 1,
      middleName: 1,
      lastName: 1,
      firstNameAmharic: 1,
      middleNameAmharic: 1,
      lastNameAmharic: 1,
      paymentCode: 1,
      class: 1,
      section: 1
    }
  );

  const cleanStr = (s) => (s ? String(s).trim().toLowerCase().replace(/[,\.]/g, '').replace(/\s+/g, ' ') : '');

  // Pre-process student search tokens
  const studentIndex = students.map(s => {
    const fnEn = cleanStr(s.firstName);
    const mnEn = cleanStr(s.middleName);
    const lnEn = cleanStr(s.lastName);
    const fnAm = cleanStr(s.firstNameAmharic);
    const mnAm = cleanStr(s.middleNameAmharic);
    const lnAm = cleanStr(s.lastNameAmharic);

    const sIdClean = s.studentId ? cleanStr(s.studentId) : '';
    const sIdBase = sIdClean ? sIdClean.split('/')[0] : '';
    const pCodeClean = s.paymentCode ? cleanStr(s.paymentCode) : '';

    return {
      doc: s,
      _id: s._id.toString(),
      studentId: s.studentId,
      sIdClean,
      sIdBase,
      pCodeClean,
      fullNameEn3: [fnEn, mnEn, lnEn].filter(Boolean).join(' '),
      fullNameEn2: [fnEn, mnEn].filter(Boolean).join(' '),
      fullNameAm3: [fnAm, mnAm, lnAm].filter(Boolean).join(' '),
      fullNameAm2: [fnAm, mnAm].filter(Boolean).join(' '),
      firstName: fnEn,
      middleName: mnEn,
      lastName: lnEn,
      class: s.class,
      section: s.section
    };
  });

  // Query existing payments for this year
  const existingPayments = await Payment.find(
    { year: defaultYear },
    { studentId: 1, month: 1, year: 1, amount: 1, paymentDate: 1, description: 1 }
  );
  const paymentMap = new Map();
  existingPayments.forEach(p => {
    paymentMap.set(`${p.studentId.toString()}_${p.month}_${p.year}`, p);
  });

  const parsedRows = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowId = `row_${i + 1}`;

    const rawDesc = raw.description || '';
    const cleanDesc = cleanStr(rawDesc);
    const cleanNameInput = cleanStr(raw.studentName);
    const cleanIdInput = cleanStr(raw.studentIdInput);
    const cleanCodeInput = cleanStr(raw.paymentCodeInput);

    let matchedStudent = null;
    let matchType = null;

    // 1. Direct Student ID match
    if (cleanIdInput) {
      const found = studentIndex.find(s => 
        s.sIdClean === cleanIdInput || 
        s.sIdBase === cleanIdInput ||
        (s.sIdClean && cleanIdInput.includes(s.sIdBase) && s.sIdBase.length >= 4)
      );
      if (found) {
        matchedStudent = found;
        matchType = 'studentId';
      }
    }

    // 2. Direct Payment Code match
    if (!matchedStudent && cleanCodeInput) {
      const found = studentIndex.find(s => s.pCodeClean && s.pCodeClean === cleanCodeInput);
      if (found) {
        matchedStudent = found;
        matchType = 'paymentCode';
      }
    }

    // 3. Direct Student Name match
    if (!matchedStudent && cleanNameInput) {
      const found3 = studentIndex.find(s => s.fullNameEn3 && s.fullNameEn3 === cleanNameInput);
      if (found3) {
        matchedStudent = found3;
        matchType = 'name';
      } else {
        const found2 = studentIndex.find(s => s.fullNameEn2 && s.fullNameEn2 === cleanNameInput);
        if (found2) {
          matchedStudent = found2;
          matchType = 'name';
        } else {
          const foundAm = studentIndex.find(s => 
            (s.fullNameAm3 && s.fullNameAm3 === cleanNameInput) || 
            (s.fullNameAm2 && s.fullNameAm2 === cleanNameInput)
          );
          if (foundAm) {
            matchedStudent = foundAm;
            matchType = 'name';
          }
        }
      }
    }

    // 4. Description Scanning (e.g. CBE narratives, bank transfers, PDF receipts)
    if (!matchedStudent && cleanDesc) {
      const idMatch = studentIndex.find(s => {
        if (!s.sIdBase || s.sIdBase.length < 4) return false;
        const regex = new RegExp(`\\b${s.sIdBase}\\b`, 'i');
        return regex.test(cleanDesc);
      });
      if (idMatch) {
        matchedStudent = idMatch;
        matchType = 'description_studentId';
      }

      if (!matchedStudent) {
        const codeMatch = studentIndex.find(s => {
          if (!s.pCodeClean || s.pCodeClean.length < 4) return false;
          const regex = new RegExp(`\\b${s.pCodeClean}\\b`, 'i');
          return regex.test(cleanDesc);
        });
        if (codeMatch) {
          matchedStudent = codeMatch;
          matchType = 'description_paymentCode';
        }
      }

      if (!matchedStudent) {
        const nameMatch = studentIndex.find(s => {
          if (s.fullNameEn3 && s.fullNameEn3.length > 5 && cleanDesc.includes(s.fullNameEn3)) return true;
          if (s.fullNameAm3 && s.fullNameAm3.length > 4 && cleanDesc.includes(s.fullNameAm3)) return true;
          if (s.fullNameEn2 && s.fullNameEn2.length > 5 && cleanDesc.includes(s.fullNameEn2)) return true;
          return false;
        });
        if (nameMatch) {
          matchedStudent = nameMatch;
          matchType = 'description_name';
        }
      }
    }

    // Resolve Month: If an explicit valid month column was present in the spreadsheet, use it.
    // Otherwise, always use the user-selected defaultMonth. Random text/notes in descriptions should never override the target month.
    let resolvedMonth = defaultMonth;
    if (raw.monthInput && ETHIOPIAN_ACADEMIC_MONTHS.includes(raw.monthInput)) {
      resolvedMonth = raw.monthInput;
    }

    // Resolve Year
    const resolvedYear = raw.yearInput || defaultYear;

    // Check duplicate
    let isDuplicate = false;
    let existingPayment = null;
    if (matchedStudent) {
      const key = `${matchedStudent._id}_${resolvedMonth}_${resolvedYear}`;
      if (paymentMap.has(key)) {
        isDuplicate = true;
        existingPayment = paymentMap.get(key);
      }
    }

    parsedRows.push({
      id: rowId,
      rawIndex: raw.rawIndex || i + 1,
      studentId: matchedStudent ? matchedStudent._id : null,
      student: matchedStudent ? {
        _id: matchedStudent._id,
        studentId: matchedStudent.studentId,
        name: [matchedStudent.doc.firstName, matchedStudent.doc.middleName, matchedStudent.doc.lastName].filter(Boolean).join(' '),
        class: matchedStudent.class,
        section: matchedStudent.section,
        paymentCode: matchedStudent.doc.paymentCode
      } : null,
      matchType,
      amount: raw.amount || 0,
      month: resolvedMonth,
      year: resolvedYear,
      paymentDate: raw.paymentDate || new Date().toISOString().split('T')[0],
      description: raw.description || '',
      isDuplicate,
      existingPayment,
      status: isDuplicate ? 'duplicate' : (matchedStudent ? 'matched' : 'unmatched'),
      selected: Boolean(matchedStudent)
    });
  }

  const summary = {
    total: parsedRows.length,
    matched: parsedRows.filter(r => r.status === 'matched').length,
    duplicates: parsedRows.filter(r => r.status === 'duplicate').length,
    unmatched: parsedRows.filter(r => r.status === 'unmatched').length,
    totalAmount: parsedRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  };

  res.json({ rows: parsedRows, summary });
});

// Bulk import payments
exports.bulkImportPayments = asyncHandler(async (req, res) => {
  const { payments, mode = 'skip', year } = req.body;
  if (!Array.isArray(payments) || payments.length === 0) {
    return res.status(400).json({ message: 'No payments provided for import' });
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const failed = [];

  const canonMap = {
    'september': 'September', 'meskerem': 'September', 'መስከረም': 'September',
    'october': 'October', 'tikimt': 'October', 'ጥቅምት': 'October',
    'november': 'November', 'hidar': 'November', 'ህዳር': 'November', 'ኅዳር': 'November',
    'december': 'December', 'tahsas': 'December', 'ታህሳስ': 'December', 'ታኅሣሥ': 'December',
    'january': 'January', 'tir': 'January', 'ጥር': 'January',
    'february': 'February', 'yekatit': 'February', 'የካቲት': 'February',
    'march': 'March', 'megabit': 'March', 'መጋቢት': 'March',
    'april': 'April', 'miazia': 'April', 'ሚያዚያ': 'April', 'ሚያዝያ': 'April',
    'may': 'May', 'ginbot': 'May', 'ግንቦት': 'May',
    'june': 'June', 'sene': 'June', 'ሰኔ': 'June'
  };

  for (const item of payments) {
    try {
      const { studentId, month, year: pYear, amount, description, paymentDate } = item;

      let targetStudentId = studentId;
      if (typeof studentId === 'object' && studentId !== null) {
        targetStudentId = studentId._id || studentId;
      }

      if (!targetStudentId || !month || amount === undefined || amount === null) {
        failed.push({ item, error: 'Missing required fields' });
        continue;
      }

      const cleanMonthKey = String(month).trim().toLowerCase().replace(/[^a-z0-9\u1200-\u137F]/g, '');
      const canonicalMonth = canonMap[cleanMonthKey] || month;

      const targetYear = parseInt(pYear || year);
      if (isNaN(targetYear)) {
        failed.push({ item, error: 'Invalid year' });
        continue;
      }

      const existing = await Payment.findOne({ studentId: targetStudentId, month: canonicalMonth, year: targetYear });
      if (existing) {
        if (mode === 'overwrite') {
          existing.amount = Number(amount);
          existing.description = description !== undefined ? description : existing.description;
          if (paymentDate) existing.paymentDate = new Date(paymentDate);
          existing.status = 'paid';
          await existing.save();
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        await Payment.create({
          studentId: targetStudentId,
          month: canonicalMonth,
          year: targetYear,
          amount: Number(amount),
          description: description || '',
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          status: 'paid',
          createdBy: req.user.id
        });
        createdCount++;
      }
    } catch (err) {
      failed.push({ item, error: err.message });
    }
  }

  const academicYear = year || (payments[0] && payments[0].year) || '';
  await logActivity(
    req.user,
    'Payments Imported',
    'Payment',
    `Imported ${createdCount} payments, updated ${updatedCount}, skipped ${skippedCount} for year ${academicYear}`
  );

  res.json({
    message: `Import completed: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped.`,
    created: createdCount,
    updated: updatedCount,
    skipped: skippedCount,
    failed
  });
});


