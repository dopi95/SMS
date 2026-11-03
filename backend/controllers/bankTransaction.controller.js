const BankTransaction = require('../models/BankTransaction.model');
const BankSetting = require('../models/BankSetting.model');
const BankPayerMapping = require('../models/BankPayerMapping.model');
const Student = require('../models/Student.model');
const Payment = require('../models/Payment.model');
const { parseBankSms, extractSourceBank, isDebitSms, extractTransactionNames, extractReceiptUrl, extractSenderAccount } = require('../utils/bankSmsParser');
const { findMatchingStudent, findAllMatchingStudents } = require('../utils/studentMatcher');

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

// Helper to find previous exact link for a payer name or account:
// 1. Checks BankPayerMapping by cleanPayerName or accountNumber.
// 2. Checks previous BankTransactions where senderName matches (exact case-insensitive) and was linked or paid.
// If found in a previous transaction, auto-seeds BankPayerMapping so it is persistently stored.
async function findPreviousPayerLink(senderName, smsText, excludeTxnId = null) {
  if (!senderName || !senderName.trim()) return null;
  const cleanName = senderName.trim().toLowerCase();
  const escaped = senderName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const senderAcc = extractSenderAccount(smsText);

  // 1. Check BankPayerMapping
  const mapQuery = { $or: [{ cleanPayerName: cleanName }] };
  if (senderAcc) mapQuery.$or.push({ accountNumber: senderAcc });

  const mapping = await BankPayerMapping.findOne(mapQuery)
    .populate('students', '_id studentId firstName middleName lastName class section paymentCode fatherName fatherPhone motherName motherPhone status')
    .lean();

  if (mapping && mapping.students && mapping.students.length > 0) {
    const validStudents = mapping.students.filter(s => s && s.status !== 'inactive');
    if (validStudents.length > 0) {
      return {
        students: validStudents,
        source: 'mapping',
        payerName: mapping.payerName || senderName.trim(),
        accountNumber: mapping.accountNumber || senderAcc || '',
        linkCount: mapping.linkCount || 1,
        lastLinkedAt: mapping.lastLinkedAt || null
      };
    }
  }

  // 2. Check previous BankTransactions with the exact same senderName that were linked or reconciled
  const txnQuery = {
    senderName: new RegExp(`^\\s*${escaped}\\s*$`, 'i'),
    $or: [
      { matchedStudent: { $ne: null } },
      { 'matchedStudents.0': { $exists: true } },
      { isReconciled: true }
    ]
  };
  if (excludeTxnId) {
    txnQuery._id = { $ne: excludeTxnId };
  }

  const prevTxn = await BankTransaction.findOne(txnQuery)
    .sort({ transactionDate: -1, createdAt: -1 })
    .populate('matchedStudent', '_id studentId firstName middleName lastName class section paymentCode fatherName fatherPhone motherName motherPhone status')
    .populate('matchedStudents', '_id studentId firstName middleName lastName class section paymentCode fatherName fatherPhone motherName motherPhone status')
    .lean();

  if (prevTxn) {
    let prevStudents = [];
    if (prevTxn.matchedStudents && prevTxn.matchedStudents.length > 0) {
      prevStudents = prevTxn.matchedStudents;
    } else if (prevTxn.matchedStudent) {
      prevStudents = [prevTxn.matchedStudent];
    }
    const validStudents = prevStudents.filter(s => s && (s._id || s.firstName) && s.status !== 'inactive');
    if (validStudents.length > 0) {
      // Auto-save to BankPayerMapping so it is remembered permanently
      BankPayerMapping.findOneAndUpdate(
        { cleanPayerName: cleanName },
        {
          payerName: senderName.trim(),
          cleanPayerName: cleanName,
          accountNumber: senderAcc || '',
          students: validStudents.map(s => s._id),
          lastLinkedAt: prevTxn.transactionDate || new Date(),
          $inc: { linkCount: 1 }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).catch(e => console.warn('PayerMapping auto-seed error:', e.message));

      return {
        students: validStudents,
        source: 'previous_transaction',
        payerName: prevTxn.senderName || senderName.trim(),
        accountNumber: senderAcc || '',
        linkCount: 1,
        lastLinkedAt: prevTxn.transactionDate || prevTxn.createdAt
      };
    }
  }

  return null;
}

// Helper to attempt auto-matching students:
// 1. First checks if previously linked/paid by this exact payer (returns exact match directly, no others)
// 2. Otherwise checks father, mother, or student full name (handles siblings)
async function tryMatchStudents(smsText, senderName) {
  try {
    // 1. Check if previously linked / paid by this exact payer
    const prevLink = await findPreviousPayerLink(senderName, smsText);
    if (prevLink && prevLink.students.length > 0) {
      return prevLink.students;
    }

    // 2. Intelligent patronymic & sibling matching
    const students = await Student.find({ status: { $ne: 'inactive' } })
      .select('_id studentId firstName middleName lastName fatherName motherName paymentCode class section')
      .lean();

    const { exactMatches } = findAllMatchingStudents(students, senderName, smsText);
    return exactMatches.map(m => m.student);
  } catch (err) {
    console.warn('[BankSMS] Auto-match students error:', err.message);
  }
  return [];
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

    // For debit transactions, do NOT auto-match any student
    const isDebit = parsed.type === 'debit';
    const matchedStudentsList = isDebit ? [] : await tryMatchStudents(smsText, parsed.senderName);
    const primaryMatched = matchedStudentsList.length > 0 ? matchedStudentsList[0] : null;

    const newTransaction = await BankTransaction.create({
      bank: parsed.bank,
      type: parsed.type || 'credit',
      reference: parsed.reference,
      hasBankReference: parsed.hasBankReference !== false,
      receiptUrl: parsed.receiptUrl || '',
      amount: parsed.amount,
      currency: parsed.currency || 'ETB',
      senderName: parsed.senderName || '',
      sourceBank: parsed.sourceBank || (parsed.rawSms ? extractSourceBank(parsed.rawSms, parsed.bank) : ''),
      receiverAccount: parsed.receiverAccount || '',
      senderPhone: sender || '',
      transactionDate: parsed.transactionDate || new Date(),
      rawSms: parsed.rawSms,
      matchedStudent: primaryMatched ? primaryMatched._id : null,
      matchedStudents: matchedStudentsList.map(s => s._id),
      status: isDebit ? 'unmatched' : (matchedStudentsList.length > 0 ? 'matched' : 'unmatched'),
      notes: isDebit ? 'Debited transaction (ወጪ)' : (matchedStudentsList.length > 1 ? `Auto-matched ${matchedStudentsList.length} siblings` : '')
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

      const isDebit = parsed.type === 'debit';
      const matchedStudentsList = isDebit ? [] : await tryMatchStudents(chunk, parsed.senderName);
      const primaryMatched = matchedStudentsList.length > 0 ? matchedStudentsList[0] : null;

      const created = await BankTransaction.create({
        bank: parsed.bank,
        type: parsed.type || (isDebit ? 'debit' : 'credit'),
        reference: parsed.reference,
        hasBankReference: parsed.hasBankReference !== false,
        receiptUrl: parsed.receiptUrl || '',
        amount: parsed.amount,
        currency: parsed.currency || 'ETB',
        senderName: parsed.senderName || '',
        sourceBank: parsed.sourceBank || (parsed.rawSms ? extractSourceBank(parsed.rawSms, parsed.bank) : ''),
        receiverAccount: parsed.receiverAccount || '',
        senderPhone: sender || '',
        transactionDate: parsed.transactionDate || new Date(),
        rawSms: parsed.rawSms,
        matchedStudent: primaryMatched ? primaryMatched._id : null,
        matchedStudents: matchedStudentsList.map(s => s._id),
        status: isDebit ? 'unmatched' : (matchedStudentsList.length > 0 ? 'matched' : 'unmatched'),
        notes: isDebit ? 'Debited transaction (ወጪ)' : (matchedStudentsList.length > 1 ? `Auto-matched ${matchedStudentsList.length} siblings` : '')
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
    const { bank, status, search, type, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};

    if (bank && bank !== 'all') {
      query.bank = bank;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (type && type !== 'all') {
      if (type === 'debit') {
        query.type = 'debit';
      } else if (type === 'credit') {
        query.$or = [{ type: 'credit' }, { type: { $exists: false } }];
      }
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
        .populate('matchedStudent', 'studentId firstName middleName lastName class section paymentCode fatherName motherName')
        .populate('matchedStudents', 'studentId firstName middleName lastName class section paymentCode fatherName motherName')
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
      const isDeb = obj.type === 'debit' || (obj.rawSms && isDebitSms(obj.rawSms));
      let needsDbUpdate = false;
      const updateFields = {};

      // If reference has old survey link "WISQB", remove it
      if (obj.reference && obj.reference.includes('WISQB')) {
        obj.reference = 'REF-' + obj.bank + '-' + (obj.transactionDate ? new Date(obj.transactionDate).getTime() : Date.now()) + '-' + Math.round(obj.amount);
        obj.hasBankReference = false;
        updateFields.reference = obj.reference;
        updateFields.hasBankReference = false;
        needsDbUpdate = true;
      }

      // If receiptUrl missing but rawSms has one, populate it
      if (!obj.receiptUrl && obj.rawSms) {
        const foundReceipt = extractReceiptUrl(obj.rawSms);
        if (foundReceipt) {
          obj.receiptUrl = foundReceipt;
          updateFields.receiptUrl = foundReceipt;
          needsDbUpdate = true;
        }
      }

      if (isDeb) {
        if (obj.type !== 'debit') {
          obj.type = 'debit';
          updateFields.type = 'debit';
          needsDbUpdate = true;
        }

        if (obj.matchedStudent || (obj.matchedStudents && obj.matchedStudents.length > 0)) {
          obj.matchedStudent = null;
          obj.matchedStudents = [];
          obj.status = 'unmatched';
          updateFields.matchedStudent = null;
          updateFields.matchedStudents = [];
          updateFields.status = 'unmatched';
          needsDbUpdate = true;
        }

        // For debit: record ONLY the receiver name. If none found, leave empty ('')
        const names = extractTransactionNames(obj.rawSms, true);
        const receiverName = (names.recipientName || '').trim();
        if (obj.senderName !== receiverName) {
          obj.senderName = receiverName;
          updateFields.senderName = receiverName;
          needsDbUpdate = true;
        }

        if (needsDbUpdate) {
          BankTransaction.findByIdAndUpdate(obj._id, updateFields).catch(() => {});
        }
      } else {
        // For credit: ensure senderName has ONLY the payer name (no arrows or debited labels)
        if (obj.senderName && (obj.senderName.includes('➔') || obj.senderName.startsWith('To: ') || obj.senderName === 'Debited / ወጪ')) {
          const names = extractTransactionNames(obj.rawSms, false);
          const payerName = (names.senderName || '').trim();
          obj.senderName = payerName;
          updateFields.senderName = payerName;
          needsDbUpdate = true;
        }
        if (needsDbUpdate) {
          BankTransaction.findByIdAndUpdate(obj._id, updateFields).catch(() => {});
        }
      }

      if (!obj.sourceBank && obj.rawSms) {
        obj.sourceBank = extractSourceBank(obj.rawSms, obj.bank);
      }

      // Verify or rematch student(s) based on payer name (father, mother, or student)
      if (obj.senderName && obj.senderName.trim() && !isDeb) {
        // 1. Check if this exact payer was previously linked or paid
        const prevLink = await findPreviousPayerLink(obj.senderName, obj.rawSms, obj._id);

        let exactMatches = [];
        let relatedMatches = [];

        if (prevLink && prevLink.students.length > 0) {
          // Exactly link to previous transaction link!
          // User requirement: "do not suggest another just exactly link to that exact fullname previous transaction link"
          exactMatches = prevLink.students.map(st => ({
            student: st,
            score: 100,
            reason: `Exact Previous Link: matched to previous transaction for "${obj.senderName.trim()}"`,
            matchType: 'exact',
            isRemembered: true
          }));
          relatedMatches = []; // No other suggestions when previously linked/paid
        } else {
          // No previous link: search students database
          if (!allStudents) {
            allStudents = await Student.find({ status: { $ne: 'inactive' } })
              .select('_id studentId firstName middleName lastName fatherName motherName paymentCode class section')
              .lean();
          }
          const matchResult = findAllMatchingStudents(allStudents, obj.senderName, obj.rawSms);
          exactMatches = matchResult.exactMatches;
          relatedMatches = matchResult.relatedMatches;
        }

        obj.relatedMatchesCount = relatedMatches.length;

        // Ensure both matchedStudent and matchedStudents are present
        if (obj.matchedStudents && obj.matchedStudents.length > 0 && !obj.matchedStudent) {
          obj.matchedStudent = obj.matchedStudents[0];
        } else if (obj.matchedStudent && (!obj.matchedStudents || obj.matchedStudents.length === 0)) {
          obj.matchedStudents = [obj.matchedStudent];
        }

        const isManuallyLinked = obj.notes && obj.notes.toLowerCase().includes('manual');

        if (!isManuallyLinked && !obj.isReconciled) {
          if (exactMatches.length > 0) {
            const exactIds = exactMatches.map(m => m.student._id.toString());
            const currentIds = (obj.matchedStudents || []).map(s => (s._id || s).toString());
            const idsChanged = exactIds.length !== currentIds.length || !exactIds.every(id => currentIds.includes(id));

            if (idsChanged) {
              obj.matchedStudents = exactMatches.map(m => m.student);
              obj.matchedStudent = exactMatches[0].student;
              obj.status = 'matched';
              BankTransaction.findByIdAndUpdate(obj._id, {
                matchedStudent: exactMatches[0].student._id,
                matchedStudents: exactMatches.map(m => m.student._id),
                status: 'matched'
              }).catch(e => console.warn('Rematch update error:', e.message));
            }
          } else if (obj.matchedStudent) {
            // If no exact match and not manual, clear match so user can select from related suggestions
            obj.matchedStudent = null;
            obj.matchedStudents = [];
            obj.status = 'unmatched';
            BankTransaction.findByIdAndUpdate(obj._id, {
              matchedStudent: null,
              matchedStudents: [],
              status: 'unmatched'
            }).catch(e => console.warn('Reset false match error:', e.message));
          }
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

// 6. Get transaction summary stats with filter support
exports.getStats = async (req, res) => {
  try {
    const { bank, status, search, type, startDate, endDate } = req.query;

    const query = {};

    if (bank && bank !== 'all') {
      query.bank = bank;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (type && type !== 'all') {
      if (type === 'debit') {
        query.type = 'debit';
      } else if (type === 'credit') {
        query.$or = [{ type: 'credit' }, { type: { $exists: false } }];
      }
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
      const s = search.trim();
      const regex = new RegExp(s, 'i');
      query.$or = [
        { reference: regex },
        { senderName: regex },
        { receiverAccount: regex },
        { rawSms: regex }
      ];
    }

    const allTxns = await BankTransaction.find(query).lean();

    const isTxnDebit = (t) => {
      if (t.type === 'debit') return true;
      if (t.type === 'credit') return false;
      return isDebitSms(t.rawSms);
    };

    const calculateBreakdown = (list) => {
      const creditList = list.filter(t => !isTxnDebit(t));
      const debitList = list.filter(t => isTxnDebit(t));
      const creditAmount = creditList.reduce((sum, t) => sum + (t.amount || 0), 0);
      const debitAmount = debitList.reduce((sum, t) => sum + (t.amount || 0), 0);
      return {
        totalCount: list.length,
        count: list.length,
        creditCount: creditList.length,
        debitCount: debitList.length,
        creditAmount,
        debitAmount,
        netAmount: creditAmount - debitAmount,
        amount: creditAmount
      };
    };

    const overallStats = calculateBreakdown(allTxns);

    // If bank filter is specified, only that bank will be present in allTxns.
    // If bank filter is 'all' or empty, both banks will be present.
    const cbeTxns = allTxns.filter(t => t.bank === 'CBE');
    const awashTxns = allTxns.filter(t => t.bank === 'AWASH');

    const cbeStats = calculateBreakdown(cbeTxns);
    const awashStats = calculateBreakdown(awashTxns);

    const matchedCount = allTxns.filter(t => t.status === 'matched').length;
    const unmatchedCount = allTxns.filter(t => t.status === 'unmatched').length;

    res.json({
      totalCount: overallStats.totalCount,
      totalAmount: overallStats.creditAmount,
      totalCreditAmount: overallStats.creditAmount,
      totalDebitAmount: overallStats.debitAmount,
      creditCount: overallStats.creditCount,
      debitCount: overallStats.debitCount,
      netAmount: overallStats.netAmount,
      cbe: cbeStats,
      awash: awashStats,
      matchedCount,
      unmatchedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to calculate stats', error: error.message });
  }
};

// 7. Get suggested student matches for a transaction (exact matches/siblings + related matches)
exports.getSuggestedMatches = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await BankTransaction.findById(id)
      .populate('matchedStudent', 'studentId firstName middleName lastName class section paymentCode fatherName fatherPhone motherName motherPhone')
      .populate('matchedStudents', 'studentId firstName middleName lastName class section paymentCode fatherName fatherPhone motherName motherPhone');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // 1. Fetch payer payment history (previous payments by this payer)
    let payerHistory = [];
    if (transaction.senderName && transaction.senderName.trim()) {
      const escaped = transaction.senderName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      payerHistory = await BankTransaction.find({
        senderName: new RegExp(`^\\s*${escaped}\\s*$`, 'i'),
        _id: { $ne: transaction._id }
      })
        .select('_id bank reference amount transactionDate status isReconciled matchedStudent matchedStudents createdAt')
        .populate('matchedStudent', 'studentId firstName middleName lastName class section fatherName fatherPhone motherName motherPhone')
        .populate('matchedStudents', 'studentId firstName middleName lastName class section fatherName fatherPhone motherName motherPhone')
        .sort({ transactionDate: -1, createdAt: -1 })
        .limit(8)
        .lean();
    }

    // 2. Check if previously linked / paid by this exact payer in BankPayerMapping or previous transactions
    const prevLink = await findPreviousPayerLink(transaction.senderName, transaction.rawSms, transaction._id);

    // Extract any linked students from previous payment history if prevLink missed it
    let pastLinkedStudents = [];
    if (prevLink && prevLink.students.length > 0) {
      pastLinkedStudents = prevLink.students;
    } else if (payerHistory.length > 0) {
      for (const past of payerHistory) {
        if (past.matchedStudents && past.matchedStudents.length > 0) {
          const valids = past.matchedStudents.filter(s => s && (s._id || s.firstName));
          if (valids.length > 0) {
            pastLinkedStudents = valids;
            break;
          }
        } else if (past.matchedStudent && (past.matchedStudent._id || past.matchedStudent.firstName)) {
          pastLinkedStudents = [past.matchedStudent];
          break;
        }
      }
    }

    let exactMatches = [];
    let relatedMatches = [];
    let rememberedMapping = null;

    if (pastLinkedStudents.length > 0) {
      // User requirement: "is there a previous Previous Payments by this Payer: do not sugest any other just automatically select it that one"
      rememberedMapping = {
        payerName: (prevLink && prevLink.payerName) || transaction.senderName.trim(),
        accountNumber: (prevLink && prevLink.accountNumber) || extractSenderAccount(transaction.rawSms) || '',
        linkCount: (prevLink && prevLink.linkCount) || payerHistory.length || 1,
        lastLinkedAt: (prevLink && prevLink.lastLinkedAt) || new Date()
      };

      exactMatches = pastLinkedStudents.map(st => ({
        student: st,
        score: 100,
        reason: `Previous Payment Link: matched to previous payment for "${transaction.senderName.trim()}"`,
        matchType: 'exact',
        isRemembered: true
      }));

      // DO NOT suggest another! Clear all related suggestions so user is not distracted
      relatedMatches = [];

      // If transaction is not currently reconciled, auto-link it to these exact student(s)
      if (!transaction.isReconciled) {
        transaction.matchedStudents = pastLinkedStudents.map(s => s._id);
        transaction.matchedStudent = pastLinkedStudents[0]._id;
        transaction.status = 'matched';
        await BankTransaction.findByIdAndUpdate(transaction._id, {
          matchedStudent: pastLinkedStudents[0]._id,
          matchedStudents: pastLinkedStudents.map(s => s._id),
          status: 'matched'
        }).catch(e => console.warn('Auto-link previous exact error:', e.message));
      }

      // Seed BankPayerMapping so it stays remembered
      if (transaction.senderName && transaction.senderName.trim()) {
        const cleanName = transaction.senderName.trim().toLowerCase();
        const senderAcc = extractSenderAccount(transaction.rawSms);
        BankPayerMapping.findOneAndUpdate(
          { cleanPayerName: cleanName },
          {
            payerName: transaction.senderName.trim(),
            cleanPayerName: cleanName,
            accountNumber: senderAcc || '',
            students: pastLinkedStudents.map(s => s._id),
            lastLinkedAt: new Date(),
            $inc: { linkCount: 1 }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        ).catch(() => {});
      }
    } else {
      // No previous link found: query all active students and find intelligent patronymic / sibling matches
      const allStudents = await Student.find({ status: { $ne: 'inactive' } })
        .select('_id studentId firstName middleName lastName class section paymentCode fatherName fatherPhone motherName motherPhone')
        .lean();

      const matchResult = findAllMatchingStudents(allStudents, transaction.senderName, transaction.rawSms);
      exactMatches = matchResult.exactMatches;
      relatedMatches = matchResult.relatedMatches;
    }

    let currentlyMatched = [];
    if (transaction.matchedStudents && transaction.matchedStudents.length > 0) {
      currentlyMatched = transaction.matchedStudents;
    } else if (transaction.matchedStudent) {
      currentlyMatched = [transaction.matchedStudent];
    } else if (prevLink && prevLink.students.length > 0) {
      currentlyMatched = prevLink.students;
    }

    res.json({
      transactionId: transaction._id,
      payerName: transaction.senderName,
      amount: transaction.amount,
      bank: transaction.bank,
      reference: transaction.reference,
      currentlyMatched,
      exactMatches,
      relatedMatches,
      payerHistory,
      rememberedMapping: rememberedMapping ? {
        payerName: rememberedMapping.payerName,
        accountNumber: rememberedMapping.accountNumber,
        linkCount: rememberedMapping.linkCount,
        lastLinkedAt: rememberedMapping.lastLinkedAt
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch suggested matches', error: error.message });
  }
};

// 8. Link transaction to one or more students (e.g. siblings), or unlink
exports.linkStudents = async (req, res) => {
  try {
    const { id } = req.params;
    let { studentIds, studentId } = req.body;
    if (!studentIds && studentId) {
      studentIds = [studentId];
    }
    if (!Array.isArray(studentIds)) {
      studentIds = [];
    }
    // Deduplicate valid IDs
    const uniqueIds = [...new Set(studentIds.filter(Boolean))];

    const transaction = await BankTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (transaction.type === 'debit') {
      return res.status(400).json({ message: 'Debit transactions cannot be linked to students.' });
    }

    if (uniqueIds.length === 0) {
      transaction.matchedStudents = [];
      transaction.matchedStudent = null;
      transaction.status = 'unmatched';
      transaction.notes = 'Unlinked by user';
    } else {
      transaction.matchedStudents = uniqueIds;
      transaction.matchedStudent = uniqueIds[0];
      transaction.status = 'matched';
      transaction.notes = uniqueIds.length > 1
        ? `Manually linked (${uniqueIds.length} students/siblings)`
        : 'Manually linked';
    }

    await transaction.save();

    // Learn / Remember this payer association for all future payments
    if (transaction.senderName && transaction.senderName.trim() && uniqueIds.length > 0) {
      const cleanName = transaction.senderName.trim().toLowerCase();
      const senderAcc = extractSenderAccount(transaction.rawSms);

      await BankPayerMapping.findOneAndUpdate(
        { cleanPayerName: cleanName },
        {
          payerName: transaction.senderName.trim(),
          cleanPayerName: cleanName,
          accountNumber: senderAcc || '',
          students: uniqueIds,
          lastLinkedAt: new Date(),
          $inc: { linkCount: 1 }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).catch(err => console.warn('PayerMapping save error:', err.message));
    }

    const updated = await BankTransaction.findById(id)
      .populate('matchedStudent', 'studentId firstName middleName lastName class section paymentCode fatherName motherName')
      .populate('matchedStudents', 'studentId firstName middleName lastName class section paymentCode fatherName motherName');

    res.json({ success: true, transaction: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to link students', error: error.message });
  }
};

// Backward-compatible alias
exports.linkStudent = exports.linkStudents;

// 9. Search students for manual linking by name, parent names, phone, studentId, or paymentCode
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

// 10. Approve a bank transaction and create official Payment record(s)
exports.approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year, amount, description, paymentDate, studentIds, studentPayments } = req.body;

    const transaction = await BankTransaction.findById(id)
      .populate('matchedStudent')
      .populate('matchedStudents');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.type === 'debit') {
      return res.status(400).json({ message: 'Debit transactions cannot be approved as fee payments.' });
    }

    let targetStudents = [];
    if (studentPayments && Array.isArray(studentPayments) && studentPayments.length > 0) {
      targetStudents = studentPayments.map(sp => sp.studentId);
    } else if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      targetStudents = studentIds;
    } else if (transaction.matchedStudents && transaction.matchedStudents.length > 0) {
      targetStudents = transaction.matchedStudents.map(s => s._id || s);
    } else if (transaction.matchedStudent) {
      targetStudents = [transaction.matchedStudent._id || transaction.matchedStudent];
    }

    if (targetStudents.length === 0) {
      return res.status(400).json({ message: 'Transaction is not linked to any student. Please link student(s) first.' });
    }

    const paymentsCreated = [];

    if (studentPayments && Array.isArray(studentPayments) && studentPayments.length > 0) {
      // Individual per-student repeated form values from Approve modal
      for (let i = 0; i < studentPayments.length; i++) {
        const sp = studentPayments[i];
        const sId = sp.studentId;
        const sMonth = sp.month || 'September';
        const sYear = parseInt(sp.year) || 2019;
        const sAmount = !isNaN(parseFloat(sp.amount)) ? parseFloat(sp.amount) : 0;
        const sDate = sp.paymentDate ? new Date(sp.paymentDate) : (transaction.transactionDate || new Date());
        const isAw = transaction.bank && transaction.bank.toUpperCase() === 'AWASH';
        const isCbe = transaction.bank && transaction.bank.toUpperCase() === 'CBE';
        const hasRealRef = transaction.hasBankReference !== false && transaction.reference && !transaction.reference.startsWith('REF-') && !transaction.reference.includes('WISQB');
        const refStr = hasRealRef ? ` (Ref: ${transaction.reference})` : '';
        const payerPrefix = (isCbe && transaction.senderName && transaction.senderName.trim())
          ? `${transaction.senderName.trim()} - `
          : '';
        const defaultFallbackDesc = isAw
          ? `Paid Via E-School Bank payment via AWASH${refStr}`
          : `${payerPrefix}Bank payment via ${transaction.bank}${refStr}`;

        const sDesc = sp.description !== undefined && sp.description !== null && sp.description.trim() !== ''
          ? sp.description.trim()
          : defaultFallbackDesc;

        let payment = await Payment.findOne({
          studentId: sId,
          month: sMonth,
          year: sYear
        });

        if (payment) {
          payment.amount = sAmount;
          payment.description = sDesc;
          payment.paymentDate = sDate;
          payment.status = 'paid';
          await payment.save();
        } else {
          payment = await Payment.create({
            studentId: sId,
            month: sMonth,
            year: sYear,
            amount: sAmount,
            description: sDesc,
            paymentDate: sDate,
            status: 'paid',
            createdBy: req.user?._id || null
          });
        }
        paymentsCreated.push(payment);
      }
    } else {
      // Single/fallback payment logic
      const payMonth = month || 'September';
      const payYear = parseInt(year) || 2019;
      const totalPayAmount = amount !== undefined && !isNaN(parseFloat(amount)) ? parseFloat(amount) : transaction.amount;
      const payDate = paymentDate ? new Date(paymentDate) : (transaction.transactionDate || new Date());
      const baseDesc = description !== undefined && description !== null && description.trim() !== ''
        ? description.trim()
        : (() => {
          const isAw = transaction.bank && transaction.bank.toUpperCase() === 'AWASH';
          const isCbe = transaction.bank && transaction.bank.toUpperCase() === 'CBE';
          const hasRealRef = transaction.hasBankReference !== false && transaction.reference && !transaction.reference.startsWith('REF-') && !transaction.reference.includes('WISQB');
          const refStr = hasRealRef ? ` (Ref: ${transaction.reference})` : '';
          const payerPrefix = (isCbe && transaction.senderName && transaction.senderName.trim())
            ? `${transaction.senderName.trim()} - `
            : '';
          return isAw ? `Paid Via E-School Bank payment via AWASH${refStr}` : `${payerPrefix}Bank payment via ${transaction.bank}${refStr}`;
        })();

      const count = targetStudents.length;
      const perStudentAmount = Math.round((totalPayAmount / count) * 100) / 100;

      for (let i = 0; i < count; i++) {
        const sId = targetStudents[i];
        const studentDesc = count > 1 ? `${baseDesc} [Sibling ${i + 1}/${count}]` : baseDesc;

        let payment = await Payment.findOne({
          studentId: sId,
          month: payMonth,
          year: payYear
        });

        if (payment) {
          payment.amount = perStudentAmount;
          payment.description = studentDesc;
          payment.paymentDate = payDate;
          payment.status = 'paid';
          await payment.save();
        } else {
          payment = await Payment.create({
            studentId: sId,
            month: payMonth,
            year: payYear,
            amount: perStudentAmount,
            description: studentDesc,
            paymentDate: payDate,
            status: 'paid',
            createdBy: req.user?._id || null
          });
        }
        paymentsCreated.push(payment);
      }
    }

    transaction.isReconciled = true;
    transaction.reconciledPaymentId = paymentsCreated[0]._id;
    transaction.reconciledPaymentIds = paymentsCreated.map(p => p._id);
    await transaction.save();

    // Remember this payer association for future transactions when approved / paid
    if (transaction.senderName && transaction.senderName.trim() && targetStudents.length > 0) {
      const cleanName = transaction.senderName.trim().toLowerCase();
      const senderAcc = extractSenderAccount(transaction.rawSms);

      BankPayerMapping.findOneAndUpdate(
        { cleanPayerName: cleanName },
        {
          payerName: transaction.senderName.trim(),
          cleanPayerName: cleanName,
          accountNumber: senderAcc || '',
          students: targetStudents,
          lastLinkedAt: new Date(),
          $inc: { linkCount: 1 }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).catch(err => console.warn('PayerMapping approve update error:', err.message));
    }

    const updatedTxn = await BankTransaction.findById(id)
      .populate('matchedStudent', 'studentId firstName middleName lastName class section paymentCode')
      .populate('matchedStudents', 'studentId firstName middleName lastName class section paymentCode');

    const totalCount = paymentsCreated.length;
    const firstPay = paymentsCreated[0];
    const successMsg = totalCount > 1
      ? `Payment approved and recorded for ${totalCount} students (${firstPay?.month || ''} ${firstPay?.year || ''} E.C.)`
      : `Payment approved and recorded for ${firstPay?.month || ''} ${firstPay?.year || ''} E.C.`;

    res.json({
      success: true,
      message: successMsg,
      transaction: updatedTxn,
      payments: paymentsCreated
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

    if (transaction.reconciledPaymentIds && transaction.reconciledPaymentIds.length > 0) {
      await Payment.deleteMany({ _id: { $in: transaction.reconciledPaymentIds } });
    } else if (transaction.reconciledPaymentId) {
      await Payment.findByIdAndDelete(transaction.reconciledPaymentId);
    }

    transaction.isReconciled = false;
    transaction.reconciledPaymentId = null;
    transaction.reconciledPaymentIds = [];
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

// 8. Delete transaction (supports optional removal of remembered payer link history)
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const removeHistory = req.body?.removeHistory === true || req.query?.removeHistory === 'true';

    const transaction = await BankTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // 1. If it was reconciled, clean up payment record(s) so nothing is left orphaned
    if (transaction.reconciledPaymentIds && transaction.reconciledPaymentIds.length > 0) {
      await Payment.deleteMany({ _id: { $in: transaction.reconciledPaymentIds } }).catch(() => {});
    } else if (transaction.reconciledPaymentId) {
      await Payment.findByIdAndDelete(transaction.reconciledPaymentId).catch(() => {});
    }

    // 2. If removeHistory is requested:
    // Delete the remembered BankPayerMapping and clear previous matched memory for this payer name
    if (removeHistory && transaction.senderName && transaction.senderName.trim()) {
      const cleanName = transaction.senderName.trim().toLowerCase();
      const escaped = transaction.senderName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const senderAcc = extractSenderAccount(transaction.rawSms);
      const mapQuery = { $or: [{ cleanPayerName: cleanName }] };
      if (senderAcc) mapQuery.$or.push({ accountNumber: senderAcc });

      await BankPayerMapping.deleteMany(mapQuery).catch(err => console.warn('PayerMapping delete error:', err.message));

      // Also reset any other unreconciled transactions for this payer to prevent fallback re-linking
      await BankTransaction.updateMany(
        { senderName: new RegExp(`^${escaped}$`, 'i'), isReconciled: false, _id: { $ne: transaction._id } },
        { matchedStudent: null, matchedStudents: [], status: 'unmatched', notes: 'Payer history cleared on delete' }
      ).catch(() => {});
    }

    // 3. Delete the transaction itself
    await BankTransaction.findByIdAndDelete(id);

    res.json({
      success: true,
      message: removeHistory
        ? 'Transaction deleted and payer link history removed.'
        : 'Transaction deleted (payer link history kept).'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete transaction', error: error.message });
  }
};

// 12. Check if payment already exists for student(s) in given month and year
exports.checkExistingPayments = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, existing: [] });
    }

    const orConditions = items
      .filter(it => it.studentId && it.month && it.year)
      .map(it => ({
        studentId: it.studentId,
        month: it.month,
        year: parseInt(it.year)
      }));

    if (orConditions.length === 0) {
      return res.json({ success: true, existing: [] });
    }

    const existingPayments = await Payment.find({ $or: orConditions })
      .populate('studentId', 'studentId firstName middleName lastName class section');

    res.json({
      success: true,
      existing: existingPayments.map(p => ({
        paymentId: p._id,
        studentId: p.studentId?._id ? p.studentId._id.toString() : p.studentId?.toString(),
        studentName: p.studentId && p.studentId.firstName
          ? `${p.studentId.firstName} ${p.studentId.middleName || ''} ${p.studentId.lastName || ''}`.trim()
          : '',
        month: p.month,
        year: p.year,
        amount: p.amount,
        paymentDate: p.paymentDate,
        status: p.status,
        description: p.description
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check existing payments', error: error.message });
  }
};

// 13. Get all payment history from Payments page for student(s)
exports.getStudentPaymentHistory = async (req, res) => {
  try {
    const { studentIds, year } = req.query;
    if (!studentIds) {
      return res.json({ success: true, payments: [], paymentsByStudent: {} });
    }

    const ids = Array.isArray(studentIds)
      ? studentIds
      : studentIds.split(',').map(s => s.trim()).filter(Boolean);

    if (ids.length === 0) {
      return res.json({ success: true, payments: [], paymentsByStudent: {} });
    }

    const query = { studentId: { $in: ids } };
    if (year) {
      query.year = parseInt(year);
    }

    const payments = await Payment.find(query)
      .populate('studentId', 'studentId firstName middleName lastName class section')
      .sort({ year: -1, createdAt: -1 })
      .lean();

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
      return orderA - orderB;
    });

    const paymentsByStudent = {};
    for (const id of ids) {
      paymentsByStudent[id] = [];
    }
    for (const p of payments) {
      const sId = p.studentId?._id ? p.studentId._id.toString() : p.studentId?.toString();
      if (!paymentsByStudent[sId]) paymentsByStudent[sId] = [];
      paymentsByStudent[sId].push({
        _id: p._id,
        studentId: sId,
        studentName: p.studentId && p.studentId.firstName
          ? `${p.studentId.firstName} ${p.studentId.middleName || ''} ${p.studentId.lastName || ''}`.trim()
          : '',
        month: p.month,
        year: p.year,
        amount: p.amount,
        paymentDate: p.paymentDate,
        status: p.status,
        description: p.description
      });
    }

    res.json({
      success: true,
      payments,
      paymentsByStudent
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch student payment history', error: error.message });
  }
};



