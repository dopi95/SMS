/**
 * Utility to parse CBE and Awash Bank incoming transaction SMS messages.
 */

// Normalize account strings (remove spaces, hyphens)
function normalizeAccount(acc) {
  if (!acc) return '';
  return acc.toString().replace(/[\s\-_]/g, '').toLowerCase();
}

// Check if message is from non-bank telecom, airtime recharge, or personal P2P
function isNonBankOrTelecomMessage(smsText, sender) {
  const s = (sender || '').toLowerCase().trim();
  const t = (smsText || '').toLowerCase().trim();

  // 1. Telecom short codes & numbers: 994, 251994, 131, 810, 804, 802, 126, AATMA
  if (/^(251)?(994|131|810|804|802|126)$/i.test(s) || s === 'aatma') {
    return true;
  }

  // 2. Airtime & Data bundle & Telecom keywords
  if (t.includes('airtime') ||
      t.includes('internet plan') ||
      t.includes('data plan') ||
      t.includes('sim starter') ||
      t.includes('bonus for recharging') ||
      t.includes('recharged successfully') ||
      t.includes('airtime top-up') ||
      t.includes('package purchase') ||
      t.includes('monthly sim') ||
      t.includes('ethio telecom') ||
      t.includes('for transport service to') ||
      t.includes('recharged etb') ||
      t.includes('silver coin') ||
      t.includes('draw ticket') ||
      t.includes('luckyslot') ||
      t.includes('traffic violation')) {
    return true;
  }

  // 3. Telebirr P2P / merchant transfers that are not bank account transfers
  if ((s === '127' || t.includes('telebirr')) && !t.includes('cbe') && !t.includes('awash') && !/\b(1000[0-9*xX]{6,14}|01[0-9*xX]{8,18})\b/.test(t)) {
    return true;
  }

  return false;
}

/**
 * Checks if the account number found in the SMS matches the target configured account.
 * Handles:
 * - Full account numbers (e.g. 1000677952575, 013251373973500)
 * - Asterisk-masked accounts (CBE: 1********2575 or 1000****2575)
 * - X-masked accounts (Awash: 01325xxxxxx3500 or 01325XXXXXX3500)
 */
function isAccountMatching(smsAccount, targetAccount) {
  if (!targetAccount || !targetAccount.trim()) {
    return false;
  }
  if (!smsAccount || !smsAccount.trim()) {
    return false;
  }

  const sAcc = normalizeAccount(smsAccount);
  const tAcc = normalizeAccount(targetAccount);

  // 1. Direct equality
  if (sAcc === tAcc) return true;

  // 2. Full account containment (target account fully inside string)
  if (tAcc.length >= 10 && sAcc.includes(tAcc)) return true;

  // 3. Masked matching (supports both '*' and 'x' / 'X')
  // Example: 1********2575 with 1000677952575
  // Example: 01325xxxxxx3500 with 013251373973500
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

  return false;
}

/**
 * Scans the SMS text to find an explicit account matching the target school account.
 * Rejects random numbers or phone numbers.
 */
function findMatchingAccountInSms(smsText, targetAccount, bank) {
  if (!targetAccount || !targetAccount.trim() || !smsText) return null;
  const cleanTarget = targetAccount.replace(/\D/g, '');
  if (!cleanTarget) return null;

  // 1. Full account in text
  if (smsText.includes(cleanTarget)) {
    return cleanTarget;
  }

  // 2. Extract account candidates: e.g. 1********2575, 1000****2575, 01325xxxxxx3500
  const pattern = bank === 'AWASH'
    ? /\b(01[0-9]{1,4}[\*xX]{3,12}[0-9]{3,6}|01[0-9]{8,18})\b/gi
    : /\b(1[0-9]{0,4}[\*xX]{3,12}[0-9]{3,6}|1000[0-9]{6,14})\b/gi;

  const matches = smsText.match(pattern) || [];
  for (const m of matches) {
    if (isAccountMatching(m, cleanTarget)) {
      return m;
    }
  }

  return null;
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

  if (!text) return { senderName, recipientName, payerName: '', receiverName: '', reason };

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
  const toMatch = text.match(/(?:transferred(?:\s+(?:ETB|Birr)?\s*[\d,]+(?:\.\d{1,2})?)?\s+to|payment to|paid to|sent to|transfer to)\s+([A-Za-z\s]{2,35}?)(?:\s*\(|\s+on|\s*\.|\s*Ref|\s*,|\s*Txn|\s*Receipt|\s+from|\s*$)/i);
  if (toMatch) {
    const raw = toMatch[1].trim();
    if (!/^(your|account|etb|cbe|the|awash|a\/c|birr)/i.test(raw)) {
      recipientName = raw;
    }
  }

  // 3. Sender in credit/received: 'from [Name]', 'transferred from [Name]', 'by [Name]'
  const fromMatch = text.match(/(?:from|by|payer|transferred from)\s+([A-Za-z\s]{2,35}?)(?:\s*\(|\s+on|\s*\.|\s*Ref|\s*,|\s*Txn|\s*Receipt|\s*to\s+your|\s+via|\s+from|\s*$)/i);
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
      if (isDebit && !senderName) senderName = raw;
      else if (!isDebit && !recipientName) recipientName = raw;
    }
  }

  // 5. Service charge / fee description in debit
  const feeMatch = text.match(/for\s+([A-Za-z\s]{3,35}?)(?:\.|\s*Ref|\s*Txn|\s*Receipt|\s*$)/i);
  if (feeMatch) {
    const raw = feeMatch[1].trim();
    if (/service|fee|charge|bill|tax|sms/i.test(raw)) {
      reason = raw;
      if (!recipientName) recipientName = raw;
    }
  }

  const payerName = isDebit ? (senderName || '') : (senderName || '');
  const receiverName = isDebit ? (recipientName || '') : (recipientName || '');

  return { senderName, recipientName, payerName, receiverName, reason };
}

/**
 * Extract official bank receipt link from SMS text (AwashPay or CBE mb-receipt).
 * Completely ignores survey links (shorturl.at) and Google forms.
 */
function extractReceiptUrl(text) {
  if (!text) return '';
  const match = text.match(/https?:\/\/(?:apps\.cbe\.com\.et(?::\d+)?\/BranchReceipt|mbreciept\.cbe\.com\.et|awashpay\.awashbank\.com(?::\d+)?)[^\s]+/i)
    || text.match(/(?:for\s+)?Rec(?:ie|ei)pt\s*[:\s]+(https?:\/\/[^\s]+)/i)
    || text.match(/https?:\/\/[^\s]+(?:BranchReceipt|mbreciept|awashpay)[^\s]*/i)
    || text.match(/https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:cbe\.com\.et|awashbank\.com)[^\s]+/i);
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
    || text.match(/BranchReceipt\/(FT[A-Za-z0-9]+)/i)
    || text.match(/\b(FT[A-Za-z0-9]{8,18})\b/i);
  const receiptUrlMatch = text.match(/mbreciept\.cbe\.com\.et\/([A-Za-z0-9\-_]+)/i)
    || text.match(/BranchReceipt\/(FT[A-Za-z0-9]+)/i)
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

  // If debit, money is leaving the account - no external payer source bank
  if (isDebitSms(smsText)) {
    return '';
  }

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
  const cbeSenderAcc = text.match(/(?:from\s+(?:account|a\/c)\s+)(1[0-9*xX]{5,20})/i);
  if (cbeSenderAcc) {
    return 'Commercial Bank of Ethiopia (CBE)';
  }

  const awashSenderAcc = text.match(/(?:from\s+(?:account|a\/c)\s+)(01[0-9*xX]{5,20})/i);
  if (awashSenderAcc) {
    return 'Awash Bank';
  }

  // 6. Direct Bank receipts / identifiers
  if (destinationBank === 'CBE' || lower.includes('banking with cbe') || lower.includes('cbe.com.et') || text.match(/\bFT[0-9A-Za-z]{8,18}\b/)) {
    return 'Commercial Bank of Ethiopia (CBE)';
  }

  if (destinationBank === 'AWASH' || lower.includes('awash bank') || lower.includes('awashbank') || text.match(/\bAWB[0-9A-Za-z]{6,16}\b/)) {
    return 'Awash Bank';
  }

  // If cannot be identified, report Unknown Bank
  return 'Unknown Bank';
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

  // 1. Check strong bank indicators in SMS text
  const isAwash = t.includes('awash bank') || t.includes('awashbank') || t.includes('awashpay') || /\b01[0-9*xX]{8,18}\b/.test(t) || t.includes('awb');
  const isCbe = t.includes('commercial bank of ethiopia') || t.includes('cbe.com.et') || t.includes('mbreciept') || t.includes('thanks for banking with cbe') || /\b1000[0-9*xX]{6,14}\b/.test(t) || /\b1[\*xX]{6,12}[0-9]{3,6}\b/.test(t);

  // If both are mentioned (e.g. transfer "via IPS Commercial Bank of Ethiopia" into Awash Bank):
  if (isAwash && isCbe) {
    if (/\b01[0-9*xX]{8,18}\b/.test(t)) return 'AWASH';
    if (/\b1000[0-9*xX]{6,14}\b/.test(t) || /\b1[\*xX]{6,12}[0-9]{3,6}\b/.test(t)) return 'CBE';
  }

  if (isAwash) return 'AWASH';
  if (isCbe) return 'CBE';

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

  // 1. Immediately drop non-bank telecom, airtime, or spam messages
  if (isNonBankOrTelecomMessage(smsText, sender)) {
    return {
      success: false,
      bank: 'UNKNOWN',
      accountIgnored: true,
      error: 'Non-bank telecom, airtime, or personal message ignored'
    };
  }

  // 2. Identify the bank (must be CBE or AWASH)
  const bank = detectBank(smsText, sender, settings);
  if (bank !== 'CBE' && bank !== 'AWASH') {
    return {
      success: false,
      bank: 'UNKNOWN',
      accountIgnored: true,
      error: 'Message is not from Commercial Bank of Ethiopia (CBE) or Awash Bank'
    };
  }

  // 3. Extract transaction details according to bank
  let parsed = null;
  if (bank === 'CBE') {
    parsed = parseCbeSms(smsText, fallbackDate);
  } else {
    parsed = parseAwashSms(smsText, fallbackDate);
  }

  if (!parsed || !parsed.amount || isNaN(parsed.amount) || parsed.amount <= 0) {
    return {
      success: false,
      bank,
      error: 'Could not extract valid amount from SMS'
    };
  }

  // Generate fallback reference if missing
  if (!parsed.reference) {
    parsed.reference = 'REF-' + Date.now().toString(36).toUpperCase();
  }

  // 4. Strict check against user's configured account in Bank Settings
  let targetAccount = '';
  let isAccountActive = true;

  if (settings) {
    if (bank === 'CBE') {
      targetAccount = (settings.cbeAccount || '').trim();
      isAccountActive = settings.cbeActive !== false;
    } else if (bank === 'AWASH') {
      targetAccount = (settings.awashAccount || '').trim();
      isAccountActive = settings.awashActive !== false;
    }
  }

  if (!isAccountActive) {
    return {
      success: false,
      bank,
      accountIgnored: true,
      error: `${bank} transactions are currently disabled in settings`
    };
  }

  if (!targetAccount) {
    return {
      success: false,
      bank,
      accountIgnored: true,
      error: `No target ${bank} account configured in settings. Please set your account number in Bank Settings.`
    };
  }

  // MUST explicitly match the target account in the SMS (both credit or debit)
  const matchedAcc = findMatchingAccountInSms(smsText, targetAccount, bank);
  if (!matchedAcc) {
    return {
      success: false,
      bank,
      accountIgnored: true,
      targetAccount,
      extractedAccount: parsed.receiverAccount || '',
      error: `SMS does not contain the configured ${bank} account (${targetAccount}). Ignored.`
    };
  }

  // 5. Determine Credit vs Debit accurately
  let isDebit = isDebitSms(smsText);

  const cleanTarget = targetAccount.replace(/\D/g, '');
  const fromAccMatch = smsText.match(/from\s+(?:your\s+)?account\s+([0-9*xX]+)/i);
  const toAccMatch = smsText.match(/(?:to\s+(?:your\s+)?account|into\s+(?:your\s+)?account)\s+([0-9*xX]+)/i);

  if (fromAccMatch && isAccountMatching(fromAccMatch[1], cleanTarget)) {
    if (toAccMatch && !isAccountMatching(toAccMatch[1], cleanTarget)) {
      isDebit = true; // explicitly debited from target account
    }
  } else if (toAccMatch && isAccountMatching(toAccMatch[1], cleanTarget)) {
    isDebit = false; // explicitly credited to target account
  }

  const type = isDebit ? 'debit' : 'credit';
  const sourceBank = isDebit ? '' : extractSourceBank(smsText, bank);
  const names = extractTransactionNames(smsText, isDebit);

  const payerName = isDebit ? '' : (names.senderName || parsed.senderName || '').trim();
  const receiverName = (names.recipientName || '').trim();
  const formattedSenderName = payerName || receiverName;

  const receiptUrl = extractReceiptUrl(smsText);
  const hasBankReference = Boolean(parsed.reference && parsed.reference.trim() !== '' && !parsed.reference.includes('WISQB'));
  const fallbackRef = hasBankReference
    ? parsed.reference.trim()
    : 'REF-' + bank + '-' + (parsed.transactionDate ? new Date(parsed.transactionDate).getTime() : Date.now()) + '-' + Math.round(parsed.amount);

  return {
    success: true,
    bank,
    type,
    amount: parsed.amount,
    currency: 'ETB',
    receiverAccount: targetAccount,
    matchedAccountInSms: matchedAcc,
    reference: fallbackRef,
    hasBankReference,
    receiptUrl,
    senderName: formattedSenderName,
    payerName,
    receiverName,
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

const { scrapeReceiptDetails } = require('./receiptScraper');

/**
 * Async version of parseBankSms that automatically fetches and scrapes the receipt URL
 * if present (e.g. CBE BranchReceipt PDF or mobile receipt HTML) to enrich transaction details.
 */
async function parseBankSmsAsync(smsText, sender = '', settings = null, fallbackDate = null) {
  const parsed = parseBankSms(smsText, sender, settings, fallbackDate);
  if (!parsed.success) return parsed;

  if (parsed.receiptUrl && parsed.type !== 'debit') {
    try {
      const scraped = await scrapeReceiptDetails(parsed.receiptUrl, 8000);
      if (scraped.success) {
        if (scraped.payerName && scraped.payerName.trim()) {
          parsed.payerName = scraped.payerName.trim();
          parsed.senderName = parsed.payerName;
        }
        if (scraped.receiverName && scraped.receiverName.trim()) {
          parsed.receiverName = scraped.receiverName.trim();
        }
        if (scraped.sourceBank && scraped.sourceBank.trim()) {
          parsed.sourceBank = scraped.sourceBank.trim();
        }
        if (scraped.amount && !isNaN(scraped.amount) && scraped.amount > 0) {
          parsed.amount = scraped.amount;
        }
        if (scraped.reference && scraped.reference.trim()) {
          parsed.reference = scraped.reference.trim();
          parsed.hasBankReference = true;
        }
        if (scraped.transactionDate && !isNaN(new Date(scraped.transactionDate).getTime())) {
          parsed.transactionDate = scraped.transactionDate;
        }
      }
    } catch (e) {
      // Fallback: keep parsed data
    }
  }

  return parsed;
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
  parseBankSms,
  parseBankSmsAsync
};
