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
  const hasDebitKeyword = /\b(debited|debited from|debited with|withdrawn|withdrawal|service charge|fee charge)\b/i.test(text)
    || (/\b(you have transferred|transferred to|transfer to)\b/i.test(text) && !/\b(transferred to your|into your)\b/i.test(text));
  const hasCreditKeyword = /\b(credited|credited with|credited to|you have received|received from|transferred to your|into your account|deposit)\b/i.test(text);
  return hasDebitKeyword && !hasCreditKeyword;
}

/**
 * Extract names from transaction SMS.
 * Distinguishes Sender (From) and Recipient / Beneficiary (To).
 */
function extractTransactionNames(text, isDebit) {
  let senderName = '';
  let recipientName = '';
  let reason = '';

  if (!text) return { senderName, recipientName, reason };

  // 1. Parentheses name after account e.g. (Dagnachew Tesfaye) or (KEBEDE ABEBE)
  const parenMatch = text.match(/(?:account\s+[0-9*xX]+|payer|beneficiary|receiver|to)\s*\(([^)]+)\)/i)
    || text.match(/\(([A-Za-z\s]{3,35})\)\s*(?:account|has been|\.|\s*$)/i);
  if (parenMatch) {
    const raw = parenMatch[1].trim();
    if (!/^(your|account|etb|cbe|the|awash|a\/c|birr)/i.test(raw)) {
      if (isDebit) recipientName = raw;
      else senderName = raw;
    }
  }

  // 2. Beneficiary in debit/transfer: 'transferred to [Name]', 'payment to [Name]', 'paid to [Name]', 'sent to [Name]', 'to [Name]'
  const toMatch = text.match(/(?:transferred(?:\s+(?:ETB|Birr)?\s*[\d,]+(?:\.\d{1,2})?)?\s+to|payment to|paid to|sent to|transfer to)\s+([A-Za-z\s]{2,35}?)(?:\s*\(|\s+on|\s*\.|\s*Ref|\s*,|\s*Txn|\s*Receipt|\s*$)/i);
  if (toMatch) {
    const raw = toMatch[1].trim();
    if (!/^(your|account|etb|cbe|the|awash|a\/c|birr)/i.test(raw)) {
      recipientName = raw;
    }
  }

  // 3. Sender in credit/received: 'from [Name]', 'transferred from [Name]', 'by [Name]'
  const fromMatch = text.match(/(?:from|by|payer|transferred from)\s+([A-Za-z\s]{2,35}?)(?:\s*\(|\s+on|\s*\.|\s*Ref|\s*,|\s*Txn|\s*Receipt|\s*to\s+your|\s*$)/i);
  if (fromMatch) {
    const raw = fromMatch[1].trim();
    if (!/^(your|account|etb|cbe|the|awash|a\/c|ips|birr)/i.test(raw)) {
      senderName = raw;
    }
  }

  // 4. 'Dear [Name],' at the beginning of the message (if not 'Dear Customer')
  const dearMatch = text.match(/^Dear\s+([A-Za-z\s]{2,35}?)(?:,|\s+your|\s+you|\s+has)/i);
  if (dearMatch) {
    const raw = dearMatch[1].trim();
    if (!/^(customer|valued customer|client|user)/i.test(raw)) {
      if (!senderName) senderName = raw;
    }
  }

  // 5. Service charge / fee description in debit
  const feeMatch = text.match(/for\s+([A-Za-z\s]{3,35}?)(?:\.|\s*Ref|\s*Txn|\s*Receipt|\s*$)/i);
  if (feeMatch) {
    const raw = feeMatch[1].trim();
    if (/service|fee|charge|bill|tax|sms/i.test(raw)) {
      reason = raw;
    }
  }

  return { senderName, recipientName, reason };
}

/**
 * Extract official bank receipt link from SMS text (AwashPay or CBE mb-receipt).
 * Completely ignores survey links (shorturl.at) and Google forms.
 */
function extractReceiptUrl(text) {
  if (!text) return '';
  const match = text.match(/https?:\/\/(?:awashpay\.awashbank\.com(?::\d+)?|mbreciept\.cbe\.com\.et)[^\s]+/i)
    || text.match(/Receipt\s*(?:Link)?\s*[:\s]+(https?:\/\/[^\s]+)/i);
  if (match) {
    const raw = (match[1] || match[0]).trim();
    if (!/shorturl|forms\.gle|survey/i.test(raw)) {
      return raw.replace(/[\.,;]+$/, '');
    }
  }
  return '';
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
  const receiverAccMatch = text.match(/(?:to\s+(?:your\s+)?account|in\s+(?:your\s+)?account|into\s+(?:your\s+)?account|credited\s+to\s+(?:your\s+)?account|debited\s+from\s+(?:your\s+)?account|from\s+(?:your\s+)?account|credited\s+to|your\s+account|ሂሳብ)\s*[:#.]?\s*([0-9*xX]{6,20})/i);
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
  const refMatch = text.match(/(?:Ref|Reference|Ref\s*No|Txn\s*Id|Txn)\s*[:.]?\s*([A-Za-z0-9\-_]+)/i)
    || text.match(/\b(FT[A-Za-z0-9]{8,18})\b/i);
  const receiptUrlMatch = text.match(/mbreciept\.cbe\.com\.et\/([A-Za-z0-9\-_]+)/i)
    || text.match(/https?:\/\/[^\s\/]+(?:\/[^\s\/]+)*\/(v[0-9]+-[A-Za-z0-9\-_]+)/i);

  if (refMatch && !/^(forms|shorturl|survey|feedback|https)/i.test(refMatch[1])) {
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
  const receiverAccMatch = text.match(/(?:to\s+(?:your\s+)?(?:account|a\/c)|in\s+(?:your\s+)?(?:account|a\/c)|credited\s+to\s+(?:your\s+)?(?:account|a\/c)|debited\s+from\s+(?:your\s+)?(?:account|a\/c)|from\s+(?:your\s+)?(?:account|a\/c)|your\s+(?:account|a\/c)|account|a\/c|ሂሳብ)\s*[:#.]?\s*([0-9*xX]{6,20})/i);
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

  // 4. Reference / Txn ID / Receipt Link (NEVER match survey links like shorturl.at!)
  let reference = '';
  const refMatch = text.match(/(?:Txn\s*ID|Txn|Ref|Reference|Ref\s*No)\s*[:.]?\s*([A-Za-z0-9\-_]+)/i)
    || text.match(/\b(AWB[A-Za-z0-9]{6,16})\b/i);
  const awashReceiptMatch = text.match(/awashpay\.awashbank\.com(?::\d+)?\/([A-Za-z0-9\-_]+)/i);

  if (refMatch && !/^(survey|shorturl|feedback|https)/i.test(refMatch[1])) {
    reference = refMatch[1].trim();
  } else if (awashReceiptMatch) {
    reference = awashReceiptMatch[1].trim();
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
    let isMatch = false;

    // 1. Direct match with extracted account
    if (parsed.receiverAccount && isAccountMatching(parsed.receiverAccount, targetAccount)) {
      isMatch = true;
    } else {
      // 2. Check if raw SMS text contains target account, masked target account, or its last 4 digits (e.g. 7000)
      const cleanTarget = targetAccount.replace(/\D/g, '');
      if (isAccountMatching(smsText, targetAccount)) {
        parsed.receiverAccount = targetAccount;
        isMatch = true;
      } else if (cleanTarget.length >= 4 && smsText.replace(/[\s\-_]/g, '').includes(cleanTarget.slice(-4))) {
        parsed.receiverAccount = targetAccount;
        isMatch = true;
      } else {
        // 3. Check if SMS text explicitly mentions a DIFFERENT, conflicting account number
        const anyAccountMatch = smsText.match(/\b(01[0-9*xX]{8,18}|1000[0-9*xX]{6,14})\b/i);
        if (anyAccountMatch) {
          const foundAcc = anyAccountMatch[1];
          if (isAccountMatching(foundAcc, targetAccount)) {
            parsed.receiverAccount = targetAccount;
            isMatch = true;
          } else {
            isMatch = false; // Conflicting account explicitly found in text
          }
        } else if (!parsed.receiverAccount || parsed.receiverAccount.trim() === '') {
          // 4. No conflicting account mentioned in the SMS text -> default to configured school account
          parsed.receiverAccount = targetAccount;
          isMatch = true;
        }
      }
    }

    if (!isMatch) {
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

  const isDebit = isDebitSms(smsText);
  const type = isDebit ? 'debit' : 'credit';
  const sourceBank = extractSourceBank(smsText, parsed.bank);
  const names = extractTransactionNames(smsText, isDebit);

  let formattedSenderName = '';
  if (isDebit) {
    // If debit: record ONLY the receiver / beneficiary name. If not found, leave empty ('')
    formattedSenderName = (names.recipientName || '').trim();
  } else {
    // If credit: record ONLY the payer / sender name. If not found, leave empty ('')
    formattedSenderName = (names.senderName || parsed.senderName || '').trim();
  }

  const receiptUrl = extractReceiptUrl(smsText);
  const hasBankReference = Boolean(parsed.reference && parsed.reference.trim() !== '' && !parsed.reference.includes('WISQB'));
  const fallbackRef = hasBankReference
    ? parsed.reference.trim()
    : 'REF-' + parsed.bank + '-' + (parsed.transactionDate ? new Date(parsed.transactionDate).getTime() : Date.now()) + '-' + Math.round(parsed.amount);

  return {
    success: true,
    bank: parsed.bank,
    type,
    amount: parsed.amount,
    currency: 'ETB',
    receiverAccount: parsed.receiverAccount || targetAccount || '',
    reference: fallbackRef,
    hasBankReference,
    receiptUrl,
    senderName: formattedSenderName,
    sourceBank,
    transactionDate: parsed.transactionDate || new Date(),
    rawSms: smsText.trim()
  };
}

function extractSenderAccount(text) {
  if (!text) return '';
  const match = text.match(/(?:from\s+(?:account|a\/c|acc)\s+)([0-9*xX]{4,20})/i)
    || text.match(/(?:by\s+[A-Za-z\s]+\s+from\s+(?:account|a\/c)?\s*)([0-9*xX]{4,20})/i)
    || text.match(/(?:transferred\s+from\s+(?:account|a\/c)?\s*)([0-9*xX]{4,20})/i);
  return match ? match[1].trim() : '';
}

module.exports = {
  extractSenderAccount,
  extractReceiptUrl,
  extractTransactionNames,
  isDebitSms,
  detectBank,
  isAccountMatching,
  extractSourceBank,
  parseCbeSms,
  parseAwashSms,
  parseBankSms
};
