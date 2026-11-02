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
 * Handles both full account numbers (e.g. 1000437336591) and masked accounts (e.g. 1********6591 or 1000****6591).
 */
function isAccountMatching(smsAccount, targetAccount) {
  if (!targetAccount || !targetAccount.trim()) {
    // If no target account is configured yet, accept
    return true;
  }
  if (!smsAccount || !smsAccount.trim()) {
    return false;
  }

  const sAcc = normalizeAccount(smsAccount);
  const tAcc = normalizeAccount(targetAccount);

  // 1. Direct equality
  if (sAcc === tAcc) return true;

  // 2. Substring containment
  if (tAcc.includes(sAcc) || sAcc.includes(tAcc)) return true;

  // 3. Masked matching (e.g. 1********6591 vs 1000437336591)
  if (sAcc.includes('*')) {
    const prefixMatch = sAcc.match(/^([0-9]+)\*/);
    const suffixMatch = sAcc.match(/\*+([0-9]+)$/);

    const prefix = prefixMatch ? prefixMatch[1] : '';
    const suffix = suffixMatch ? suffixMatch[1] : '';

    const prefixOk = !prefix || tAcc.startsWith(prefix);
    const suffixOk = suffix && suffix.length >= 3 && tAcc.endsWith(suffix);

    if (prefixOk && suffixOk) {
      return true;
    }
  }

  // 4. Fallback: compare last 4 digits
  const cleanSmsDigits = sAcc.replace(/\D/g, '');
  const cleanTargetDigits = tAcc.replace(/\D/g, '');
  if (cleanSmsDigits.length >= 4 && cleanTargetDigits.length >= 4) {
    if (cleanTargetDigits.endsWith(cleanSmsDigits.slice(-4))) {
      return true;
    }
  }

  return false;
}

/**
 * Parse CBE (Commercial Bank of Ethiopia) SMS
 */
function parseCbeSms(text) {
  // 1. Amount
  let amount = null;
  const amountMatch = text.match(/(?:ETB|Birr|ብር)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:ETB|Birr|ብር)/i)
    || text.match(/(?:credited with|transferred|received)\s*(?:ETB\s*)?([\d,]+(?:\.\d{1,2})?)/i);
  if (amountMatch) {
    const numStr = (amountMatch[1] || amountMatch[2]).replace(/,/g, '');
    amount = parseFloat(numStr);
  }

  // 2. Receiver Account (School account - avoid matching the sender's account)
  let receiverAccount = '';
  const receiverAccMatch = text.match(/(?:to\s+(?:your\s+)?account|in\s+(?:your\s+)?account|into\s+(?:your\s+)?account|credited\s+to\s+(?:your\s+)?account|credited\s+to|your\s+account)\s*[:#]?\s*([0-9*]{6,16})/i);
  if (receiverAccMatch) {
    receiverAccount = receiverAccMatch[1];
  } else {
    // Fallback: search any account that is NOT directly after 'from account'
    const fallbackMatch = text.match(/(?:account|a\/c|acc\.?|acct\.?)\s*(?:no\.?|number|ending\s*with)?\s*[:#]?\s*([0-9*]{6,16})/i)
      || text.match(/\b(1000[0-9*]{6,12})\b/i);
    if (fallbackMatch) {
      receiverAccount = fallbackMatch[1];
    }
  }

  // 3. Sender Name (Payer)
  let senderName = '';
  // Check if name is in parentheses e.g. from account 1********5869 (Dagnachew Tesfaye Serbesa)
  const parenNameMatch = text.match(/(?:from\s+account\s+[0-9*]+|payer)\s*\(([^)]+)\)/i);
  if (parenNameMatch) {
    senderName = parenNameMatch[1].trim();
  } else {
    const senderMatch = text.match(/(?:from|by|payer|transferred from)\s+([A-Za-z\s]{3,35})(?:\s+on|\s*\.|\s*Ref|\s*,|\s*to\s+your|\s*$)/i);
    if (senderMatch) {
      const rawName = senderMatch[1].trim();
      if (!/^(your|account|etb|cbe|the|cbe-birr)/i.test(rawName)) {
        senderName = rawName;
      }
    }
  }

  // 4. Reference / FT number / CBE digital receipt URL
  let reference = '';
  const refMatch = text.match(/(?:Ref|Reference|Ref\s*No|Txn\s*Id|Txn)\s*[:.]?\s*([A-Za-z0-9]+)/i)
    || text.match(/\b(FT[A-Za-z0-9]{8,18})\b/i);
  const receiptUrlMatch = text.match(/mbreciept\.cbe\.com\.et\/([A-Za-z0-9\-_]+)/i)
    || text.match(/https?:\/\/[^\s\/]+(?:\/[^\s\/]+)*\/(v[0-9]+-[A-Za-z0-9\-_]+)/i);

  if (refMatch) {
    reference = refMatch[1].trim();
  } else if (receiptUrlMatch) {
    reference = receiptUrlMatch[1].trim();
  }

  // 5. Date
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
  // 1. Amount
  let amount = null;
  const amountMatch = text.match(/(?:ETB|Birr)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:ETB|Birr)/i)
    || text.match(/(?:credited with|credited|transferred|received)\s*(?:ETB\s*)?([\d,]+(?:\.\d{1,2})?)/i);
  if (amountMatch) {
    const numStr = (amountMatch[1] || amountMatch[2]).replace(/,/g, '');
    amount = parseFloat(numStr);
  }

  // 2. Receiver Account (School account)
  let receiverAccount = '';
  const receiverAccMatch = text.match(/(?:to\s+(?:your\s+)?(?:account|a\/c)|in\s+(?:your\s+)?(?:account|a\/c)|credited\s+to\s+(?:your\s+)?(?:account|a\/c)|credited\s+to|your\s+(?:account|a\/c))\s*[:#]?\s*([0-9*]{6,16})/i);
  if (receiverAccMatch) {
    receiverAccount = receiverAccMatch[1];
  } else {
    const accMatch = text.match(/(?:account|a\/c|acc\.?|acct\.?)\s*(?:no\.?|number)?\s*[:#]?\s*([0-9*]{6,16})/i)
      || text.match(/\b(01[0-9*]{8,14})\b/i);
    if (accMatch) {
      receiverAccount = accMatch[1];
    }
  }

  // 3. Sender Name
  let senderName = '';
  const parenNameMatch = text.match(/(?:from\s+(?:account|a\/c)\s+[0-9*]+|payer)\s*\(([^)]+)\)/i);
  if (parenNameMatch) {
    senderName = parenNameMatch[1].trim();
  } else {
    const senderMatch = text.match(/(?:by|from|payer)\s+([A-Za-z\s]{3,35})(?:\s+on|\s*\.|\s*Txn|\s*,|\s*to\s+your|\s*$)/i);
    if (senderMatch) {
      const rawName = senderMatch[1].trim();
      if (!/^(your|account|etb|awash|the)/i.test(rawName)) {
        senderName = rawName;
      }
    }
  }

  // 4. Reference / Txn ID
  let reference = '';
  const refMatch = text.match(/(?:Txn\s*ID|Txn|Ref|Reference|Ref\s*No)\s*[:.]?\s*([A-Za-z0-9]+)/i)
    || text.match(/\b(AWB[A-Za-z0-9]{6,16})\b/i);
  if (refMatch) {
    reference = refMatch[1].trim();
  }

  // 5. Date
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
function detectBank(smsText, sender, settings = null) {
  const s = (sender || '').toLowerCase().trim();
  const t = (smsText || '').toLowerCase();

  // 1. Text-based explicit check (Content takes highest priority)
  if (t.includes('awash') || t.includes('awb') || /\b01[0-9*]{8,14}\b/.test(t)) {
    return 'AWASH';
  }

  if (t.includes('cbe') || t.includes('commercial bank') || t.includes('cbe.com.et') || t.includes('mbreciept') || /\b1[0-9*]{9,15}\b/.test(t)) {
    return 'CBE';
  }

  // 2. Settings account match check (if SMS text contains account ending)
  if (settings) {
    if (settings.awashAccount && settings.awashAccount.length >= 4 && t.includes(settings.awashAccount.slice(-4))) {
      return 'AWASH';
    }
    if (settings.cbeAccount && settings.cbeAccount.length >= 4 && t.includes(settings.cbeAccount.slice(-4))) {
      return 'CBE';
    }
  }

  // 3. Explicit sender parameter check
  if (s === 'awash' || s.includes('awash') || s.includes('awb')) {
    return 'AWASH';
  }
  if (s === 'cbe' || s.includes('cbe') || s.includes('commercial')) {
    return 'CBE';
  }

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

  const bank = detectBank(smsText, sender, settings);
  let parsed = null;

  if (bank === 'CBE') {
    parsed = parseCbeSms(smsText);
  } else if (bank === 'AWASH') {
    parsed = parseAwashSms(smsText);
  } else {
    // Try CBE parser first, then Awash
    const cbeCandidate = parseCbeSms(smsText);
    if (cbeCandidate.amount && (cbeCandidate.reference || cbeCandidate.receiverAccount)) {
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
