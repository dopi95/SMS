const BankTransaction = require('../models/BankTransaction.model');
const BankSetting = require('../models/BankSetting.model');
const Student = require('../models/Student.model');
const Payment = require('../models/Payment.model');
const { parseBankSms, extractSourceBank } = require('../utils/bankSmsParser');
const { findMatchingStudent } = require('../utils/studentMatcher');

// Helper to fetch or initialize default BankSetting
async function getOrCreateSettings() {
  let settings = await BankSetting.findOne();
  if (!settings) {
    settings = await BankSetting.create({
      cbeAccount: '',
      cbePhone: '',
      cbeActive: true,
      awashAccount: '',
      awashPhone: '',
      awashActive: true
    });
  }
  return settings;
}

// Helper to attempt auto-matching student by father, mother, or student full name
async function tryMatchStudent(smsText, senderName) {
  try {
    const students = await Student.find({ status: { $ne: 'inactive' } })
      .select('_id studentId firstName middleName lastName fatherName motherName paymentCode class section')
      .lean();

    return findMatchingStudent(students, senderName, smsText);
  } catch (err) {
    console.warn('[BankSMS] Auto-match student error:', err.message);
  }
  return null;
}

// 1. Get bank settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get settings', error: error.message });
  }
};

// 2. Update bank settings
exports.updateSettings = async (req, res) => {
  try {
    const { cbeAccount, cbePhone, cbeActive, awashAccount, awashPhone, awashActive, regenerateSecret } = req.body;
    let settings = await getOrCreateSettings();

    if (cbeAccount !== undefined) settings.cbeAccount = cbeAccount.trim();
    if (cbePhone !== undefined) settings.cbePhone = cbePhone.trim();
    if (cbeActive !== undefined) settings.cbeActive = Boolean(cbeActive);
    if (awashAccount !== undefined) settings.awashAccount = awashAccount.trim();
    if (awashPhone !== undefined) settings.awashPhone = awashPhone.trim();
    if (awashActive !== undefined) settings.awashActive = Boolean(awashActive);

    if (regenerateSecret) {
      settings.webhookSecret = 'bluelight_sec_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    }

    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};

// 3. Webhook endpoint for Android SMS Forwarder
exports.handleWebhook = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    // Verify webhook secret
    const incomingSecret = req.headers['x-api-key'] || req.query.secret || req.body.secret;
    const authHeader = req.headers.authorization;
    const bearerSecret = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const providedSecret = incomingSecret || bearerSecret;
    if (!settings.webhookSecret || providedSecret !== settings.webhookSecret) {
      return res.status(401).json({ success: false, message: 'Invalid or missing webhook secret key' });
    }

    // Support standard forwarder payload formats
    const smsText = req.body.message || req.body.text || req.body.body || req.body.content || req.body.msg || '';
    const sender = req.body.from || req.body.sender || req.body.phone || '';

    if (!smsText || !smsText.trim()) {
      return res.status(400).json({ success: false, message: 'No SMS text received' });
    }

    // Extract original message timestamp sent by Android SMS forwarder
    const rawTime = req.body.timestamp || req.body.time || req.body.date || req.body.sent_time || req.body.received_at;
    let fallbackDate = null;
    if (rawTime) {
      if (typeof rawTime === 'number' || /^\d+$/.test(rawTime.toString().trim())) {
        const num = parseInt(rawTime.toString().trim());
        fallbackDate = new Date(num < 10000000000 ? num * 1000 : num);
      } else {
        const d = new Date(rawTime);
        if (!isNaN(d.getTime())) fallbackDate = d;
      }
    }

    const parsed = parseBankSms(smsText, sender, settings, fallbackDate);

    // If ignored because it's for another account on the same phone number
    if (parsed.accountIgnored || parsed.isDebit) {
      return res.json({
        success: true,
        ignored: true,
        message: parsed.error || 'Transaction ignored: account does not match target school account.'
      });
    }

    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        error: parsed.error || 'Could not parse transaction from SMS'
      });
    }

    // Check duplicate reference
    const existing = await BankTransaction.findOne({ bank: parsed.bank, reference: parsed.reference });
    if (existing) {
      return res.json({
        success: true,
        duplicate: true,
        message: `Transaction ${parsed.reference} already recorded.`,
        transaction: existing
      });
    }

    // Try auto-matching a student
    const matchedStudent = await tryMatchStudent(smsText, parsed.senderName);

    const newTransaction = await BankTransaction.create({
      bank: parsed.bank,
      reference: parsed.reference,
      amount: parsed.amount,
      currency: parsed.currency || 'ETB',
      senderName: parsed.senderName || '',
      sourceBank: parsed.sourceBank || (parsed.rawSms ? extractSourceBank(parsed.rawSms, parsed.bank) : ''),
      receiverAccount: parsed.receiverAccount || '',
      senderPhone: sender || '',
      transactionDate: parsed.transactionDate || new Date(),
      rawSms: parsed.rawSms,
      matchedStudent: matchedStudent ? matchedStudent._id : null,
      status: matchedStudent ? 'matched' : 'unmatched'
    });

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      transaction: newTransaction
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({ success: true, duplicate: true, message: 'Transaction already recorded.' });
    }
    console.error('[BankWebhook] Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing webhook', error: error.message });
  }
};

// 4. Parse SMS manually (pasting one or multiple SMS)
exports.parseManual = async (req, res) => {
  try {
    const { smsText, sender, customDate } = req.body;
    if (!smsText || !smsText.trim()) {
      return res.status(400).json({ message: 'Please provide SMS text to parse' });
    }

    let fallbackDate = null;
    if (customDate) {
      const d = new Date(customDate);
      if (!isNaN(d.getTime())) fallbackDate = d;
    }

    const settings = await getOrCreateSettings();

    // Check if user pasted multiple messages separated by blank lines or headers
    const rawChunks = smsText.split(/\n\s*\n/).map(c => c.trim()).filter(Boolean);
    const chunks = rawChunks.length > 0 ? rawChunks : [smsText.trim()];

    const results = [];
    for (const chunk of chunks) {
      const parsed = parseBankSms(chunk, sender, settings, fallbackDate);
      if (parsed.accountIgnored) {
        results.push({
          success: false,
          ignored: true,
          error: parsed.error,
          rawSms: chunk
        });
        continue;
      }
      if (!parsed.success) {
        results.push({
          success: false,
          error: parsed.error,
          rawSms: chunk
        });
        continue;
      }

      // Check if duplicate
      const existing = await BankTransaction.findOne({ bank: parsed.bank, reference: parsed.reference });
      if (existing) {
        results.push({
          success: true,
          duplicate: true,
          transaction: existing,
          rawSms: chunk
        });
        continue;
      }

      const matchedStudent = await tryMatchStudent(chunk, parsed.senderName);
      const created = await BankTransaction.create({
        bank: parsed.bank,
        reference: parsed.reference,
        amount: parsed.amount,
        currency: parsed.currency || 'ETB',
        senderName: parsed.senderName || '',
        sourceBank: parsed.sourceBank || (parsed.rawSms ? extractSourceBank(parsed.rawSms, parsed.bank) : ''),
        receiverAccount: parsed.receiverAccount || '',
        senderPhone: sender || '',
        transactionDate: parsed.transactionDate || new Date(),
        rawSms: parsed.rawSms,
        matchedStudent: matchedStudent ? matchedStudent._id : null,
        status: matchedStudent ? 'matched' : 'unmatched'
      });

      results.push({
        success: true,
        transaction: created,
        rawSms: chunk
      });
    }

    res.json({
      total: chunks.length,
      saved: results.filter(r => r.success && !r.duplicate).length,
      duplicates: results.filter(r => r.duplicate).length,
      ignored: results.filter(r => r.ignored).length,
      failed: results.filter(r => !r.success && !r.ignored).length,
      details: results
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to process manual SMS', error: error.message });
  }
};

// 5. Get transactions with filters and pagination
exports.getTransactions = async (req, res) => {
  try {
    const { bank, status, search, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};

    if (bank && bank !== 'all') {
      query.bank = bank;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.transactionDate.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.transactionDate.$lte = end;
      }
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { reference: searchRegex },
        { senderName: searchRegex },
        { receiverAccount: searchRegex },
        { rawSms: searchRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * pageSize;

    const [transactions, total] = await Promise.all([
      BankTransaction.find(query)
        .populate('matchedStudent', 'studentId firstName middleName lastName class section paymentCode')
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      BankTransaction.countDocuments(query)
    ]);

    // Fetch active students to verify/rematch transactions and fix previous false matches
    let allStudents = null;
    const sanitizedTransactions = [];

    for (const t of transactions) {
      const obj = t.toObject();
      if (!obj.sourceBank && obj.rawSms) {
        obj.sourceBank = extractSourceBank(obj.rawSms, obj.bank);
      }

      // Verify or rematch student based on payer name (father, mother, or student)
      if (obj.senderName && obj.senderName.trim()) {
        if (!allStudents) {
          allStudents = await Student.find({ status: { $ne: 'inactive' } })
            .select('_id studentId firstName middleName lastName fatherName motherName paymentCode class section')
            .lean();
        }

        const bestStudent = findMatchingStudent(allStudents, obj.senderName, obj.rawSms);
        const currentStudentId = obj.matchedStudent ? obj.matchedStudent._id.toString() : null;
        const newStudentId = bestStudent ? bestStudent._id.toString() : null;

        if (newStudentId && newStudentId !== currentStudentId) {
          obj.matchedStudent = bestStudent;
          obj.status = 'matched';
          BankTransaction.findByIdAndUpdate(obj._id, {
            matchedStudent: bestStudent._id,
            status: 'matched'
          }).catch(e => console.warn('Rematch update error:', e.message));
        } else if (!bestStudent && obj.matchedStudent && (!obj.notes || !obj.notes.includes('Manual'))) {
          // If no student matches the payer name and it wasn't manually linked, clear the false match
          obj.matchedStudent = null;
          obj.status = 'unmatched';
          BankTransaction.findByIdAndUpdate(obj._id, {
            matchedStudent: null,
            status: 'unmatched'
          }).catch(e => console.warn('Reset false match error:', e.message));
        }
      }

      sanitizedTransactions.push(obj);
    }

    res.json({
      transactions: sanitizedTransactions,
      pagination: {
        total,
        page: pageNum,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
  }
};

// 6. Get transaction summary stats
exports.getStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allTxns, todayTxns, monthTxns] = await Promise.all([
      BankTransaction.find(),
      BankTransaction.find({ transactionDate: { $gte: startOfToday } }),
      BankTransaction.find({ transactionDate: { $gte: startOfMonth } })
    ]);

    const calculateTotal = (list) => list.reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalAmount = calculateTotal(allTxns);
    const todayAmount = calculateTotal(todayTxns);
    const monthAmount = calculateTotal(monthTxns);

    const cbeTxns = allTxns.filter(t => t.bank === 'CBE');
    const awashTxns = allTxns.filter(t => t.bank === 'AWASH');

    const matchedCount = allTxns.filter(t => t.status === 'matched').length;
    const unmatchedCount = allTxns.filter(t => t.status === 'unmatched').length;

    res.json({
      totalCount: allTxns.length,
      totalAmount,
      todayAmount,
      monthAmount,
      cbe: {
        count: cbeTxns.length,
        amount: calculateTotal(cbeTxns)
      },
      awash: {
        count: awashTxns.length,
        amount: calculateTotal(awashTxns)
      },
      matchedCount,
      unmatchedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to calculate stats', error: error.message });
  }
};

// 7. Link an unmatched transaction to a student & optionally record a Payment
exports.linkStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, createPayment, month, year } = req.body;

    const transaction = await BankTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    transaction.matchedStudent = student._id;
    transaction.status = 'matched';
    transaction.notes = 'Manually linked';

    // Optional: create payment record if requested
    if (createPayment && month && year) {
      const existingPayment = await Payment.findOne({
        studentId: student._id,
        month,
        year: parseInt(year)
      });

      if (!existingPayment) {
        const payment = await Payment.create({
          studentId: student._id,
          month,
          year: parseInt(year),
          amount: transaction.amount,
          description: `Auto-recorded from ${transaction.bank} Ref: ${transaction.reference}`,
          paymentDate: transaction.transactionDate || new Date(),
          status: 'paid',
          createdBy: req.user?._id || null
        });
        transaction.isReconciled = true;
        transaction.reconciledPaymentId = payment._id;
      }
    }

    await transaction.save();
    const updated = await BankTransaction.findById(id).populate('matchedStudent', 'studentId firstName middleName lastName class section paymentCode');

    res.json({ success: true, transaction: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to link student', error: error.message });
  }
};

// 8. Search students for manual linking by name, parent names, phone, studentId, or paymentCode
exports.searchStudents = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim() || q.trim().length < 2) {
      return res.json([]);
    }

    const query = q.trim();
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const students = await Student.find({
      status: { $ne: 'inactive' },
      $or: [
        { firstName: regex },
        { middleName: regex },
        { lastName: regex },
        { firstNameAmharic: regex },
        { middleNameAmharic: regex },
        { lastNameAmharic: regex },
        { fatherName: regex },
        { fatherPhone: regex },
        { motherName: regex },
        { motherPhone: regex },
        { studentId: regex },
        { paymentCode: regex }
      ]
    })
      .select('_id studentId firstName middleName lastName class section fatherName fatherPhone motherName motherPhone paymentCode')
      .limit(15)
      .lean();

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Failed to search students', error: error.message });
  }
};

// 9. Approve a bank transaction and create an official Payment record
exports.approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year, amount, description, paymentDate } = req.body;

    const transaction = await BankTransaction.findById(id).populate('matchedStudent');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (!transaction.matchedStudent) {
      return res.status(400).json({ message: 'Transaction is not linked to any student. Please link a student first.' });
    }

    const studentId = transaction.matchedStudent._id;
    const payMonth = month || 'September';
    const payYear = parseInt(year) || 2019;
    const payAmount = amount !== undefined && !isNaN(parseFloat(amount)) ? parseFloat(amount) : transaction.amount;
    const payDate = paymentDate ? new Date(paymentDate) : (transaction.transactionDate || new Date());
    const payDesc = description !== undefined && description !== null && description.trim() !== ''
      ? description.trim()
      : `Bank payment via ${transaction.bank} (Ref: ${transaction.reference})`;

    // Check if payment record already exists for this student, month, year
    let payment = await Payment.findOne({
      studentId,
      month: payMonth,
      year: payYear
    });

    if (payment) {
      payment.amount = payAmount;
      payment.description = payDesc;
      payment.paymentDate = payDate;
      payment.status = 'paid';
      await payment.save();
    } else {
      payment = await Payment.create({
        studentId,
        month: payMonth,
        year: payYear,
        amount: payAmount,
        description: payDesc,
        paymentDate: payDate,
        status: 'paid',
        createdBy: req.user?._id || null
      });
    }

    transaction.isReconciled = true;
    transaction.reconciledPaymentId = payment._id;
    await transaction.save();

    const updatedTxn = await BankTransaction.findById(id)
      .populate('matchedStudent', 'studentId firstName middleName lastName class section paymentCode');

    res.json({
      success: true,
      message: `Payment approved and recorded for ${payMonth} ${payYear} E.C.`,
      transaction: updatedTxn,
      payment
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve payment', error: error.message });
  }
};

// 10. Revoke approval / unapprove transaction and delete the associated Payment record
exports.unapprovePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await BankTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.reconciledPaymentId) {
      await Payment.findByIdAndDelete(transaction.reconciledPaymentId);
    }

    transaction.isReconciled = false;
    transaction.reconciledPaymentId = null;
    await transaction.save();

    const updatedTxn = await BankTransaction.findById(id)
      .populate('matchedStudent', 'studentId firstName middleName lastName class section paymentCode');

    res.json({
      success: true,
      message: 'Payment approval revoked and record removed from Payments page.',
      transaction: updatedTxn
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to revoke payment approval', error: error.message });
  }
};

// 8. Delete transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    await BankTransaction.findByIdAndDelete(id);
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete transaction', error: error.message });
  }
};

