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
 * Handles:
 * - Full account numbers (e.g. 1000437336591, 013201401837000)
 * - Asterisk-masked accounts (CBE: 1********6591 or 1000****6591)
 * - X-masked accounts (Awash: 01320xxxxxx7000 or 01320XXXXXX7000)
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

  // 3. Masked matching (supports both '*' and 'x' / 'X')
  if (sAcc.includes('*') || sAcc.includes('x')) {
    const prefixMatch = sAcc.match(/^([0-9]+)[*x]+/);
    const suffixMatch = sAcc.match(/[*x]+([0-9]+)$/);

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
/**
 * Detects if an SMS describes an outgoing debit transaction (money leaving account / withdrawal / fee).
 */
function isDebitSms(text) {
  if (!text) return false;
  const hasDebitKeyword = /\b(debited|debited from|debited with|withdrawn|withdrawal|service charge|fee charge)\b/i.test(text);
  const hasCreditKeyword = /\b(credited|credited with|credited to|you have received|received from|transferred to your|into your account|deposit)\b/i.test(text);
  return hasDebitKeyword && !hasCreditKeyword;
}

function parseCbeSms(text, fallbackDate = null) {
  // 1. Amount
  let amount = null;
  const amountMatch = text.match(/(?:ETB|Birr|ብር)\s*(\d[\d,]*(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s*(?:ETB|Birr|ብር)/i)
    || text.match(/(?:credited with|transferred|received)\s*(?:ETB\s*)?(\d[\d,]*(?:\.\d{1,2})?)/i);
  if (amountMatch) {
    const numStr = (amountMatch[1] || amountMatch[2]).replace(/,/g, '');
    amount = parseFloat(numStr);
  }

  // 2. Receiver Account (School account - avoid matching the sender's account)
  let receiverAccount = '';
  const receiverAccMatch = text.match(/(?:to\s+(?:your\s+)?account|in\s+(?:your\s+)?account|into\s+(?:your\s+)?account|credited\s+to\s+(?:your\s+)?account|credited\s+to|your\s+account)\s*[:#]?\s*([0-9*xX]{6,20})/i);
  if (receiverAccMatch) {
    receiverAccount = receiverAccMatch[1];
  } else {
    // Fallback: search any account that is NOT directly after 'from account'
    const fallbackMatch = text.match(/(?:account|a\/c|acc\.?|acct\.?)\s*(?:no\.?|number|ending\s*with)?\s*[:#]?\s*([0-9*xX]{6,20})/i)
      || text.match(/\b(1000[0-9*xX]{6,14})\b/i);
    if (fallbackMatch) {
      receiverAccount = fallbackMatch[1];
    }
  }

  // 3. Sender Name (Payer)
  let senderName = '';
  // Check if name is in parentheses e.g. from account 1********5869 (Dagnachew Tesfaye Serbesa)
  const parenNameMatch = text.match(/(?:from\s+account\s+[0-9*xX]+|payer)\s*\(([^)]+)\)/i);
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
  let transactionDate = fallbackDate || new Date();
  const monthNameMatch = text.match(/\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+\d{2,4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)\b/i);
  const dateMatch = text.match(/(?:Date|On|at)?\s*[:\s]?\s*(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}(?:\s+\d{2}:\d{2}:\d{2})?|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/i);

  if (monthNameMatch) {
    const parsed = new Date(monthNameMatch[1]);
    if (!isNaN(parsed.getTime())) {
      transactionDate = parsed;
    }
  } else if (dateMatch) {
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
function parseAwashSms(text, fallbackDate = null) {
  // 1. Amount
  let amount = null;
  const amountMatch = text.match(/(?:ETB|Birr)\s*(\d[\d,]*(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s*(?:ETB|Birr)/i)
    || text.match(/(?:credited with|credited|transferred|received)\s*(?:ETB\s*)?([\d,]+(?:\.\d{1,2})?)/i);
  if (amountMatch) {
    const numStr = (amountMatch[1] || amountMatch[2]).replace(/,/g, '');
    amount = parseFloat(numStr);
  }

  // 2. Receiver Account (School account: supports x and * masks, e.g. 01320xxxxxx7000 or 013201401837000)
  let receiverAccount = '';
  const receiverAccMatch = text.match(/(?:to\s+(?:your\s+)?(?:account|a\/c)|in\s+(?:your\s+)?(?:account|a\/c)|credited\s+to\s+(?:your\s+)?(?:account|a\/c)|credited\s+to|your\s+(?:account|a\/c)|account|a\/c)\s*[:#]?\s*([0-9*xX]{6,20})/i);
  if (receiverAccMatch) {
    receiverAccount = receiverAccMatch[1];
  } else {
    const accMatch = text.match(/\b(01[0-9*xX]{8,18})\b/i);
    if (accMatch) {
      receiverAccount = accMatch[1];
    }
  }

  // 3. Sender Name (Payer)
  let senderName = '';
  // Check for parenthesis name: e.g. (Abebe)
  const parenNameMatch = text.match(/(?:from\s+(?:account|a\/c)\s+[0-9*xX]+|payer)\s*\(([^)]+)\)/i);
  // Check for "by [Name] via ..." pattern (IPS transfers e.g. by Elias Yenealem Atalay via IPS)
  const byViaMatch = text.match(/by\s+([A-Za-z\s]{2,35}?)(?:\s+via|\s+on|\s*\.|\s*Txn|\s*,|\s*$)/i);

  if (parenNameMatch) {
    senderName = parenNameMatch[1].trim();
  } else if (byViaMatch) {
    const rawName = byViaMatch[1].trim();
    if (!/^(your|account|etb|awash|the)/i.test(rawName)) {
      senderName = rawName;
    }
  } else {
    const senderMatch = text.match(/(?:by|from|payer)\s+([A-Za-z\s]{2,35}?)(?:\s+via|\s+on|\s*\.|\s*Txn|\s*,|\s*to\s+your|\s*$)/i);
    if (senderMatch) {
      const rawName = senderMatch[1].trim();
      if (!/^(your|account|etb|awash|the)/i.test(rawName)) {
        senderName = rawName;
      }
    }
  }

  // 4. Reference / Txn ID / Receipt Link
  let reference = '';
  const refMatch = text.match(/(?:Txn\s*ID|Txn|Ref|Reference|Ref\s*No)\s*[:.]?\s*([A-Za-z0-9]+)/i)
    || text.match(/\b(AWB[A-Za-z0-9]{6,16})\b/i);
  const shortUrlMatch = text.match(/(?:shorturl\.at|receipt|ref)\/([A-Za-z0-9]+)/i);

  if (refMatch) {
    reference = refMatch[1].trim();
  } else if (shortUrlMatch) {
    reference = 'AWB-' + shortUrlMatch[1].trim();
  }

  // 5. Date & Time
  let transactionDate = fallbackDate || new Date();
  const dateTimeMatch = text.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
  if (dateTimeMatch) {
    const parsed = new Date(dateTimeMatch[1].replace(/-/g, '/'));
    if (!isNaN(parsed.getTime())) {
      transactionDate = parsed;
    }
  } else if (dateMatch) {
    const parsed = new Date(dateMatch[1].replace(/[\-\.]/g, '/'));
    if (!isNaN(parsed.getTime())) {
      transactionDate = parsed;
    }
  }

  // If still no reference, create deterministic fallback using date & account suffix
  if (!reference && dateTimeMatch) {
    const cleanStamp = dateTimeMatch[1].replace(/[^0-9]/g, '');
    const accTail = receiverAccount.slice(-4) || 'AWB';
    reference = `AWB-${cleanStamp}-${accTail}`;
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
 * Extracts the originating bank / payment source (e.g. Commercial Bank of Ethiopia (CBE), Telebirr, CBE Birr, Awash Bank, etc.)
 */
function extractSourceBank(smsText, destinationBank = '') {
  if (!smsText || typeof smsText !== 'string') return '';
  const text = smsText.trim();
  const lower = text.toLowerCase();

  // 1. Cross-bank IPS transfer mentions: "via IPS Commercial Bank of Ethiopia", "via IPS Telebirr", etc.
  const ipsMatch = text.match(/(?:via\s+IPS\s+|from\s+IPS\s+|through\s+IPS\s+)([A-Za-z0-9\s]+?)(?:\.|\s+Your|\s+Ref|\s+Txn|\s+on|\s*$)/i);
  if (ipsMatch && ipsMatch[1]) {
    const rawOrigin = ipsMatch[1].trim();
    const rawLower = rawOrigin.toLowerCase();

    if (rawLower.includes('commercial bank') || rawLower.includes('cbe')) {
      return 'Commercial Bank of Ethiopia (CBE)';
    }
    if (rawLower.includes('telebirr') || rawLower.includes('tele birr')) {
      return 'Telebirr';
    }
    if (rawLower.includes('cbe birr') || rawLower.includes('cbebirr')) {
      return 'CBE Birr';
    }
    if (rawLower.includes('awash')) {
      return 'Awash Bank';
    }
    if (rawLower.includes('dashen')) {
      return 'Dashen Bank';
    }
    if (rawLower.includes('abyssinia') || rawLower.includes('boa')) {
      return 'Bank of Abyssinia';
    }
    if (rawLower.includes('coop') || rawLower.includes('oromia')) {
      return 'Cooperative Bank of Oromia';
    }
    if (rawLower.includes('zemen')) {
      return 'Zemen Bank';
    }
    if (rawLower.includes('hibret') || rawLower.includes('united')) {
      return 'Hibret Bank';
    }
    if (rawLower.includes('nib')) {
      return 'Nib International Bank';
    }
    if (rawLower.includes('wegagen')) {
      return 'Wegagen Bank';
    }
    if (rawLower.includes('amhara')) {
      return 'Amhara Bank';
    }
    if (rawLower.includes('enat')) {
      return 'Enat Bank';
    }
    if (rawLower.includes('siinqee')) {
      return 'Siinqee Bank';
    }
    if (rawLower.includes('tsedey')) {
      return 'Tsedey Bank';
    }
    if (rawLower.includes('berhan')) {
      return 'Berhan Bank';
    }
    if (rawOrigin.length >= 3 && rawOrigin.length <= 40) {
      return rawOrigin;
    }
  }

  // 2. Direct Telebirr mentions
  if (lower.includes('telebirr') || lower.includes('ቴሌብር') || lower.includes('tele birr')) {
    return 'Telebirr';
  }

  // 3. Direct CBE Birr mentions
  if (lower.includes('cbe birr') || lower.includes('cbebirr')) {
    return 'CBE Birr';
  }

  // 4. Direct M-Pesa mentions
  if (lower.includes('m-pesa') || lower.includes('mpesa')) {
    return 'M-Pesa';
  }

  // 5. Look for sender account numbers
  // CBE sender account (e.g. "from account 1********5869")
  const cbeSenderAcc = text.match(/(?:from\s+(?:account|a\/c)\s+)(1[0-9*xX]{5,20})/i);
  if (cbeSenderAcc) {
    return 'Commercial Bank of Ethiopia (CBE)';
  }

  // Awash sender account (e.g. "from account 0132...")
  const awashSenderAcc = text.match(/(?:from\s+(?:account|a\/c)\s+)(01[0-9*xX]{5,20})/i);
  if (awashSenderAcc) {
    return 'Awash Bank';
  }

  // 6. Destination CBE fallback (internal CBE-to-CBE transfer)
  if (destinationBank === 'CBE' || lower.includes('banking with cbe') || lower.includes('cbe.com.et')) {
    return 'Commercial Bank of Ethiopia (CBE)';
  }

  // 7. Destination AWASH fallback (internal Awash-to-Awash transfer)
  if (destinationBank === 'AWASH' || lower.includes('awash bank') || lower.includes('awashbank')) {
    return 'Awash Bank';
  }

  return destinationBank || 'Unknown';
}

/**
 * Detect bank type from SMS sender / content
 */
function detectBank(smsText, sender, settings = null) {
  const s = (sender || '').toLowerCase().trim();
  const t = (smsText || '').toLowerCase();

  // If user explicitly picked bank
  if (s === 'awash' || s.includes('awash')) return 'AWASH';
  if (s === 'cbe') return 'CBE';

  // 1. Check strong bank indicators
  const isAwash = t.includes('awash bank') || t.includes('awashbank') || t.includes('awash_bank') || /\b01[0-9*xX]{8,18}\b/.test(t) || t.includes('awb');
  const isCbe = t.includes('cbe.com.et') || t.includes('mbreciept') || t.includes('thanks for banking with cbe') || (/\b1000[0-9*xX]{6,14}\b/.test(t) && !isAwash);

  // If both are mentioned (e.g. transfer "via IPS Commercial Bank of Ethiopia" into Awash Bank):
  if (isAwash && isCbe) {
    // Check whose account is being credited
    if (/\b01[0-9*xX]{8,18}\b/.test(t)) return 'AWASH';
    if (/\b1000[0-9*xX]{6,14}\b/.test(t)) return 'CBE';
  }

  if (isAwash) return 'AWASH';
  if (isCbe) return 'CBE';

  // 2. Settings account match check (if SMS text contains account ending)
  if (settings) {
    if (settings.awashAccount && settings.awashAccount.length >= 4 && t.includes(settings.awashAccount.slice(-4))) {
      return 'AWASH';
    }
    if (settings.cbeAccount && settings.cbeAccount.length >= 4 && t.includes(settings.cbeAccount.slice(-4))) {
      return 'CBE';
    }
  }

  return 'UNKNOWN';
}

/**
 * Main parse function
 * Takes raw SMS text, sender info, and settings object { cbeAccount, awashAccount }
 */
function parseBankSms(smsText, sender = '', settings = null, fallbackDate = null) {
  if (!smsText || typeof smsText !== 'string' || !smsText.trim()) {
    return { success: false, error: 'Empty SMS text provided' };
  }

  // Ignore debit alerts (outgoing money / withdrawal / fee charge)
  if (isDebitSms(smsText)) {
    return {
      success: false,
      bank: detectBank(smsText, sender, settings),
      accountIgnored: true,
      isDebit: true,
      error: 'Debit transaction ignored: only incoming credit (deposit) transactions are recorded.'
    };
  }

  const bank = detectBank(smsText, sender, settings);
  let parsed = null;

  if (bank === 'CBE') {
    parsed = parseCbeSms(smsText, fallbackDate);
  } else if (bank === 'AWASH') {
    parsed = parseAwashSms(smsText, fallbackDate);
  } else {
    // Try Awash first if account matches 01, otherwise CBE
    if (/\b01[0-9*xX]{8,18}\b/.test(smsText)) {
      parsed = parseAwashSms(smsText, fallbackDate);
    } else {
      parsed = parseCbeSms(smsText, fallbackDate);
    }
    if (!parsed || (!parsed.amount && !parsed.reference)) {
      return {
        success: false,
        bank: 'UNKNOWN',
        error: 'Could not determine bank or extract transaction details from SMS'
      };
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

  const sourceBank = extractSourceBank(smsText, parsed.bank);

  return {
    success: true,
    bank: parsed.bank,
    amount: parsed.amount,
    currency: 'ETB',
    receiverAccount: parsed.receiverAccount || targetAccount || '',
    reference: parsed.reference,
    senderName: parsed.senderName || '',
    sourceBank,
    transactionDate: parsed.transactionDate || new Date(),
    rawSms: smsText.trim()
  };
}

module.exports = {
  isDebitSms,
  detectBank,
  isAccountMatching,
  extractSourceBank,
  parseCbeSms,
  parseAwashSms,
  parseBankSms
};
