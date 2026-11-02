const BankTransaction = require('../models/BankTransaction.model');
const BankSetting = require('../models/BankSetting.model');
const Student = require('../models/Student.model');
const Payment = require('../models/Payment.model');
const { parseBankSms } = require('../utils/bankSmsParser');

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

// Helper to attempt auto-matching student by payment code or name
async function tryMatchStudent(smsText, senderName) {
  try {
    // 1. Try matching student by payment code in SMS text
    const studentsWithCode = await Student.find({
      paymentCode: { $exists: true, $ne: '' }
    }).select('_id firstName middleName lastName paymentCode');

    for (const student of studentsWithCode) {
      if (student.paymentCode && smsText.toUpperCase().includes(student.paymentCode.toUpperCase())) {
        return student;
      }
    }

    // 2. Try matching by parent or student name if senderName is present
    if (senderName && senderName.trim().length >= 4) {
      const cleanSender = senderName.trim().toLowerCase();
      // Search parents
      const matchedByParent = await Student.findOne({
        $or: [
          { fatherName: { $regex: new RegExp(cleanSender, 'i') } },
          { motherName: { $regex: new RegExp(cleanSender, 'i') } }
        ]
      });
      if (matchedByParent) return matchedByParent;
    }
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

    const parsed = parseBankSms(smsText, sender, settings);

    // If ignored because it's for another account on the same phone number
    if (parsed.accountIgnored) {
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
    const { smsText, sender } = req.body;
    if (!smsText || !smsText.trim()) {
      return res.status(400).json({ message: 'Please provide SMS text to parse' });
    }

    const settings = await getOrCreateSettings();

    // Check if user pasted multiple messages separated by blank lines or headers
    const rawChunks = smsText.split(/\n\s*\n/).map(c => c.trim()).filter(Boolean);
    const chunks = rawChunks.length > 0 ? rawChunks : [smsText.trim()];

    const results = [];
    for (const chunk of chunks) {
      const parsed = parseBankSms(chunk, sender, settings);
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
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
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

    res.json({
      transactions,
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

