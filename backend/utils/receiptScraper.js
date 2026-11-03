const https = require('https');
const http = require('http');
const { PDFParse } = require('pdf-parse');

/**
 * Normalizes bank names found in receipt text
 */
function cleanBankName(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const l = raw.toLowerCase().trim();

  if (l.includes('telebirr') || l.includes('tele birr') || l.includes('ቴሌብር')) return 'Telebirr';
  if (l.includes('cbe birr') || l.includes('cbebirr')) return 'CBE Birr';
  if (l.includes('m-pesa') || l.includes('mpesa')) return 'M-Pesa';
  if (l.includes('awash')) return 'Awash Bank';
  if (l.includes('dashen')) return 'Dashen Bank';
  if (l.includes('abyssinia') || l.includes('boa')) return 'Bank of Abyssinia';
  if (l.includes('cooperative bank of oromia') || l.includes('coop') || l.includes('oromia')) return 'Cooperative Bank of Oromia';
  if (l.includes('zemen')) return 'Zemen Bank';
  if (l.includes('hibret') || l.includes('united')) return 'Hibret Bank';
  if (l.includes('nib')) return 'Nib International Bank';
  if (l.includes('wegagen')) return 'Wegagen Bank';
  if (l.includes('amhara')) return 'Amhara Bank';
  if (l.includes('enat')) return 'Enat Bank';
  if (l.includes('siinqee')) return 'Siinqee Bank';
  if (l.includes('tsedey')) return 'Tsedey Bank';
  if (l.includes('berhan')) return 'Berhan Bank';
  if (l.includes('commercial bank') || l.includes('cbe')) return 'Commercial Bank of Ethiopia (CBE)';

  // Fallback: strip legal entity suffix like S.C or transfer descriptions
  return raw
    .replace(/\/.*$/, '')
    .replace(/S\.?C\.?.*$/i, '')
    .replace(/Account Transfer.*$/i, '')
    .trim();
}

/**
 * Downloads a URL buffer (handles redirects, self-signed certs, and port numbers)
 */
function downloadUrlBuffer(targetUrl, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(targetUrl);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      const agent = isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined;

      const req = client.get(targetUrl, { agent, timeout: timeoutMs }, (res) => {
        // Handle HTTP redirect (301, 302, 307, 308)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const nextUrl = new URL(res.headers.location, targetUrl).href;
          return downloadUrlBuffer(nextUrl, timeoutMs).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Receipt request timed out'));
      });

      req.on('error', err => reject(err));
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Parses CBE BranchReceipt PDF document (e.g. from apps.cbe.com.et:100/BranchReceipt/...)
 */
async function parseCbePdfReceipt(buffer) {
  const parser = new PDFParse(new Uint8Array(buffer));
  await parser.load();
  const { text } = await parser.getText();
  if (!text) return null;

  const mPayer = text.match(/Payer\s+([^\n]+)/i);
  const mReceiver = text.match(/Receiver\s+([^\n]+)/i);
  const mReason = text.match(/Reason\s*\/\s*Type\s*of\s*service\s*([^\n]+(?:\n[^\n]+)?)/i);
  const mAmount = text.match(/Transferred\s*Amount\s*([0-9.,]+)\s*ETB/i)
    || text.match(/Total\s*amount\s*debited\s*from\s*customers\s*account\s*([0-9.,]+)\s*ETB/i);
  const mDate = text.match(/Payment\s*Date\s*&\s*Time\s*([^\n]+)/i);
  const mRef = text.match(/Reference\s*No\.?\s*(?:\([^)]+\))?\s*([A-Za-z0-9]+)/i)
    || text.match(/VAT\s*Receipt\s*No:\s*([A-Za-z0-9]+)/i);

  let payerName = mPayer ? mPayer[1].trim() : '';
  let sourceBank = '';
  const reasonText = mReason ? mReason[1].replace(/\n/g, ' ').trim() : '';

  if (payerName.toLowerCase().includes('telebirr') || reasonText.toLowerCase().includes('telebirr')) {
    sourceBank = 'Telebirr';
    payerName = 'Telebirr User';
  } else if (reasonText) {
    sourceBank = cleanBankName(reasonText);
  }

  // If payer is empty or still "TeleBirr To CBE...", clean it up
  if (payerName.toLowerCase().includes('settlement') || payerName.toLowerCase().includes('telebirr to cbe')) {
    payerName = 'Telebirr User';
    sourceBank = 'Telebirr';
  }

  let transactionDate = null;
  if (mDate) {
    const parsedDate = new Date(mDate[1].trim());
    if (!isNaN(parsedDate.getTime())) {
      transactionDate = parsedDate;
    }
  }

  return {
    payerName,
    receiverName: mReceiver ? mReceiver[1].trim() : '',
    sourceBank: sourceBank || 'Commercial Bank of Ethiopia (CBE)',
    amount: mAmount ? parseFloat(mAmount[1].replace(/,/g, '')) : null,
    transactionDate,
    reference: mRef ? mRef[1].trim() : ''
  };
}

/**
 * Parses CBE HTML Mobile Receipt (e.g. from mbreciept.cbe.com.et/v2-...)
 */
function parseCbeHtmlReceipt(html) {
  if (!html) return null;
  const cleanHtml = html.replace(/<[^>]+>/g, ' ');

  const mPayer = cleanHtml.match(/(?:Payer\s*Name|Payer|From\s*Account|Debited\s*From)\s*[:]?\s*([A-Za-z\s]{3,40})/i);
  const mReceiver = cleanHtml.match(/(?:Receiver\s*Name|Receiver|Credited\s*To|Beneficiary)\s*[:]?\s*([A-Za-z\s]{3,40})/i);
  const mAmount = cleanHtml.match(/(?:Amount|Transferred\s*Amount)\s*[:]?\s*(?:ETB|Birr)?\s*([0-9.,]+)/i);
  const mRef = cleanHtml.match(/(?:Txn\s*Id|Reference|Ref\s*No|FT\s*No)\s*[:]?\s*([A-Za-z0-9\-]+)/i);
  const mDate = cleanHtml.match(/(?:Date|Payment\s*Date|Transaction\s*Date)\s*[:]?\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/i);

  let transactionDate = null;
  if (mDate) {
    const parsedDate = new Date(mDate[1].trim().replace(/-/g, '/'));
    if (!isNaN(parsedDate.getTime())) {
      transactionDate = parsedDate;
    }
  }

  return {
    payerName: mPayer ? mPayer[1].trim() : '',
    receiverName: mReceiver ? mReceiver[1].trim() : '',
    sourceBank: 'Commercial Bank of Ethiopia (CBE)',
    amount: mAmount ? parseFloat(mAmount[1].replace(/,/g, '')) : null,
    transactionDate,
    reference: mRef ? mRef[1].trim() : ''
  };
}

/**
 * Main function to fetch and scrape receipt details from a URL
 */
async function scrapeReceiptDetails(receiptUrl, timeoutMs = 8000) {
  if (!receiptUrl || typeof receiptUrl !== 'string' || !receiptUrl.startsWith('http')) {
    return { success: false, error: 'Invalid receipt URL' };
  }

  try {
    const buffer = await downloadUrlBuffer(receiptUrl.trim(), timeoutMs);

    // Check if buffer is PDF
    const isPdf = buffer.slice(0, 5).toString('ascii').startsWith('%PDF');

    if (isPdf) {
      const parsed = await parseCbePdfReceipt(buffer);
      if (parsed) {
        return { success: true, receiptType: 'pdf', ...parsed };
      }
    } else {
      // Treat as HTML text
      const htmlText = buffer.toString('utf-8');
      const parsed = parseCbeHtmlReceipt(htmlText);
      if (parsed) {
        return { success: true, receiptType: 'html', ...parsed };
      }
    }

    return { success: false, error: 'Could not extract transaction data from receipt' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  cleanBankName,
  scrapeReceiptDetails,
  downloadUrlBuffer
};

