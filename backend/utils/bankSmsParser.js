/**
 * Utility to parse CBE and Awash Bank incoming transaction SMS messages.
 */

// Normalize account strings (remove spaces, hyphens)
function normalizeAccount(acc) {
  if (!acc) return '';
  return acc.toString().replace(/[\s\-_]/g, '').toLowerCase();
}

/**
 * Checks if the account number found in the SMS matches the target configured account.
 * Handles both full account numbers (e.g. 1000123456789) and masked accounts (e.g. 1000****6789 or *6789).
 */
function isAccountMatching(smsAccount, targetAccount) {
  if (!targetAccount || !targetAccount.trim()) {
    // If no target account is configured yet, accept
    return true;
  }

  const sAcc = normalizeAccount(smsAccount);
  const tAcc = normalizeAccount(targetAccount);

  if (!sAcc) return false;

  // Direct match
  if (sAcc === tAcc) return true;

  // Substring match
  if (tAcc.includes(sAcc) || sAcc.includes(tAcc)) return true;

  // Check last 4-6 digits for masked account (e.g., 1000****5678 matching 1000293845678)
  const cleanSmsDigits = sAcc.replace(/\D/g, '');
  const cleanTargetDigits = tAcc.replace(/\D/g, '');

  if (cleanSmsDigits.length >= 4 && cleanTargetDigits.length >= 4) {
    const smsTail = cleanSmsDigits.slice(-4);
    const targetTail = cleanTargetDigits.slice(-4);
    if (smsTail === targetTail) {
      // Also verify prefix if present in SMS
      const smsPrefix = cleanSmsDigits.slice(0, 3);
      const targetPrefix = cleanTargetDigits.slice(0, 3);
      if (smsPrefix === targetPrefix) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Parse CBE (Commercial Bank of Ethiopia) SMS
 */
function parseCbeSms(text) {
  // Amount
  // Matches: ETB 3,500.00 | ETB 3500 | 3,500.00 ETB | credited with ETB 3,500
  let amount = null;
  const amountMatch = text.match(/(?:ETB|Birr|ብር)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:ETB|Birr|ብር)/i)
    || text.match(/(?:credited with|transferred|received)\s*(?:ETB\s*)?([\d,]+(?:\.\d{1,2})?)/i);
  if (amountMatch) {
    const numStr = (amountMatch[1] || amountMatch[2]).replace(/,/g, '');
    amount = parseFloat(numStr);
  }

  // Account
  // Matches: account 1000... | A/C 1000... | account ending with ... | 1000****7890
  let receiverAccount = '';
  const accMatch = text.match(/(?:account|a\/c|acc\.?|acct\.?)\s*(?:no\.?|number|ending\s*with)?\s*[:#]?\s*([0-9*]{6,16})/i)
    || text.match(/\b(1000[0-9*]{6,12})\b/i);
  if (accMatch) {
    receiverAccount = accMatch[1];
  }

  // Reference / FT number
  // CBE transactions typically have FT numbers like FT2601829304 or Ref: FT...
  let reference = '';
  const refMatch = text.match(/(?:Ref|Reference|Ref\s*No|Txn\s*Id|Txn)\s*[:.]?\s*([A-Za-z0-9]+)/i)
    || text.match(/\b(FT[A-Za-z0-9]{8,18})\b/i);
  if (refMatch) {
    reference = refMatch[1].trim();
  }

  // Sender Name (Payer)
  // Matches: from ABEBE KEBEDE | by ABEBE KEBEDE | transferred from ABEBE KEBEDE
  let senderName = '';
  const senderMatch = text.match(/(?:from|by|payer|transferred from)\s+([A-Za-z\s]{3,35})(?:\s+on|\s*\.|\s*Ref|\s*,|\s*$)/i);
  if (senderMatch) {
    const rawName = senderMatch[1].trim();
    if (!/^(your|account|etb|cbe|the|cbe-birr)/i.test(rawName)) {
      senderName = rawName;
    }
  }

  // Date
  let transactionDate = new Date();
  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
  if (dateMatch) {
    const parsed = new Date(dateMatch[1].replace(/[\-\.]/g, '/'));
    if (!isNaN(parsed.getTime())) {
      transactionDate = parsed;
    }
  }

  return {
    bank: 'CBE',
    amount,
    receiverAccount,
    reference,
    senderName,
    transactionDate
  };
}

/**
 * Parse Awash Bank SMS
 */
function parseAwashSms(text) {
  // Amount
  let amount = null;
  const amountMatch = text.match(/(?:ETB|Birr)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:ETB|Birr)/i)
    || text.match(/(?:credited with|credited|transferred)\s*(?:ETB\s*)?([\d,]+(?:\.\d{1,2})?)/i);
  if (amountMatch) {
    const numStr = (amountMatch[1] || amountMatch[2]).replace(/,/g, '');
    amount = parseFloat(numStr);
  }

  // Account
  // Awash accounts usually begin with 0132... or 014... or A/C 01...
  let receiverAccount = '';
  const accMatch = text.match(/(?:account|a\/c|acc\.?|acct\.?)\s*(?:no\.?|number)?\s*[:#]?\s*([0-9*]{6,16})/i)
    || text.match(/\b(01[0-9*]{8,14})\b/i);
  if (accMatch) {
    receiverAccount = accMatch[1];
  }

  // Reference / Txn ID
  let reference = '';
  const refMatch = text.match(/(?:Txn\s*ID|Txn|Ref|Reference|Ref\s*No)\s*[:.]?\s*([A-Za-z0-9]+)/i)
    || text.match(/\b(AWB[A-Za-z0-9]{6,16})\b/i);
  if (refMatch) {
    reference = refMatch[1].trim();
  }

  // Sender Name
  let senderName = '';
  const senderMatch = text.match(/(?:by|from|payer)\s+([A-Za-z\s]{3,35})(?:\s+on|\s*\.|\s*Txn|\s*,|\s*$)/i);
  if (senderMatch) {
    const rawName = senderMatch[1].trim();
    if (!/^(your|account|etb|awash|the)/i.test(rawName)) {
      senderName = rawName;
    }
  }

  // Date
  let transactionDate = new Date();
  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
  if (dateMatch) {
    const parsed = new Date(dateMatch[1].replace(/[\-\.]/g, '/'));
    if (!isNaN(parsed.getTime())) {
      transactionDate = parsed;
    }
  }

  return {
    bank: 'AWASH',
    amount,
    receiverAccount,
    reference,
    senderName,
    transactionDate
  };
}

/**
 * Detect bank type from SMS sender / content
 */
function detectBank(smsText, sender) {
  const s = (sender || '').toLowerCase();
  const t = (smsText || '').toLowerCase();

  if (s.includes('cbe') || s.includes('commercial') || t.includes('cbe') || t.includes('commercial bank') || t.includes('ft2')) {
    return 'CBE';
  }

  if (s.includes('awash') || t.includes('awash') || t.includes('awb')) {
    return 'AWASH';
  }

  // Fallback heuristics: CBE accounts start with 1000, Awash with 01
  if (/\b1000\d{6,12}\b/.test(t)) return 'CBE';
  if (/\b01\d{8,14}\b/.test(t)) return 'AWASH';

  return 'UNKNOWN';
}

/**
 * Main parse function
 * Takes raw SMS text, sender info, and settings object { cbeAccount, awashAccount }
 */
function parseBankSms(smsText, sender = '', settings = null) {
  if (!smsText || typeof smsText !== 'string' || !smsText.trim()) {
    return { success: false, error: 'Empty SMS text provided' };
  }

  const bank = detectBank(smsText, sender);
  let parsed = null;

  if (bank === 'CBE') {
    parsed = parseCbeSms(smsText);
  } else if (bank === 'AWASH') {
    parsed = parseAwashSms(smsText);
  } else {
    // Try CBE parser first, then Awash
    const cbeCandidate = parseCbeSms(smsText);
    if (cbeCandidate.amount && cbeCandidate.reference) {
      parsed = cbeCandidate;
    } else {
      parsed = parseAwashSms(smsText);
      if (!parsed.amount && !parsed.reference) {
        return {
          success: false,
          bank: 'UNKNOWN',
          error: 'Could not determine bank or extract transaction details from SMS'
        };
      }
    }
  }

  if (!parsed.amount || isNaN(parsed.amount) || parsed.amount <= 0) {
    return {
      success: false,
      bank: parsed.bank,
      error: 'Could not extract valid amount from SMS'
    };
  }

  // Generate fallback reference if missing
  if (!parsed.reference) {
    // Use hash or timestamp fallback
    parsed.reference = 'REF-' + Date.now().toString(36).toUpperCase();
  }

  // Check account filter against user settings
  let targetAccount = '';
  let isAccountActive = true;

  if (settings) {
    if (parsed.bank === 'CBE') {
      targetAccount = settings.cbeAccount || '';
      isAccountActive = settings.cbeActive !== false;
    } else if (parsed.bank === 'AWASH') {
      targetAccount = settings.awashAccount || '';
      isAccountActive = settings.awashActive !== false;
    }
  }

  if (!isAccountActive) {
    return {
      success: false,
      bank: parsed.bank,
      accountIgnored: true,
      error: `${parsed.bank} transactions are currently disabled in settings`
    };
  }

  // If a target account is configured, check if this SMS matches that account
  if (targetAccount && targetAccount.trim() !== '') {
    const matches = isAccountMatching(parsed.receiverAccount, targetAccount);
    if (!matches) {
      return {
        success: false,
        bank: parsed.bank,
        accountIgnored: true,
        extractedAccount: parsed.receiverAccount,
        targetAccount,
        error: `Account ${parsed.receiverAccount || 'unspecified'} does not match target school account ${targetAccount}. Ignored.`
      };
    }
  }

  return {
    success: true,
    bank: parsed.bank,
    amount: parsed.amount,
    currency: 'ETB',
    receiverAccount: parsed.receiverAccount || targetAccount || '',
    reference: parsed.reference,
    senderName: parsed.senderName || '',
    transactionDate: parsed.transactionDate || new Date(),
    rawSms: smsText.trim()
  };
}

module.exports = {
  detectBank,
  isAccountMatching,
  parseCbeSms,
  parseAwashSms,
  parseBankSms
};
