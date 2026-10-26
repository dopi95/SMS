const XLSX = require('xlsx');
const { PDFParse } = require('pdf-parse');

const ETHIOPIAN_ACADEMIC_MONTHS = [
  'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June'
];

const MONTH_ALIASES = {
  'september': 'September',
  'meskerem': 'September',
  'መስከረም': 'September',
  'october': 'October',
  'tikimt': 'October',
  'ጥቅምት': 'October',
  'november': 'November',
  'hidar': 'November',
  'ህዳር': 'November',
  'ኅዳር': 'November',
  'december': 'December',
  'tahsas': 'December',
  'ታህሳስ': 'December',
  'ታኅሣሥ': 'December',
  'january': 'January',
  'tir': 'January',
  'ጥር': 'January',
  'february': 'February',
  'yekatit': 'February',
  'የካቲት': 'February',
  'march': 'March',
  'megabit': 'March',
  'መጋቢት': 'March',
  'april': 'April',
  'miazia': 'April',
  'ሚያዚያ': 'April',
  'ሚያዝያ': 'April',
  'may': 'May',
  'ginbot': 'May',
  'ግንቦት': 'May',
  'june': 'June',
  'sene': 'June',
  'ሰኔ': 'June'
};

/**
 * Extracts month from whole cell or explicit field
 */
const normalizeMonth = (val) => {
  if (!val) return null;
  const s = String(val).trim().toLowerCase().replace(/[^a-z0-9\u1200-\u137F]/g, '');
  if (MONTH_ALIASES[s]) return MONTH_ALIASES[s];
  return extractMonthFromText(val);
};

/**
 * Scans a narrative or description text for isolated whole-word month names
 * Avoids false positives on words like "remark" (mar), "doctor" (oct), "maybe" (may), etc.
 */
const extractMonthFromText = (text) => {
  if (!text) return null;
  const s = String(text).toLowerCase();

  // Amharic month full names
  if (s.includes('መስከረም')) return 'September';
  if (s.includes('ጥቅምት')) return 'October';
  if (s.includes('ህዳር') || s.includes('ኅዳር')) return 'November';
  if (s.includes('ታህሳስ') || s.includes('ታኅሣሥ')) return 'December';
  if (s.includes('ጥር')) return 'January';
  if (s.includes('የካቲት')) return 'February';
  if (s.includes('መጋቢት')) return 'March';
  if (s.includes('ሚያዚያ') || s.includes('ሚያዝያ')) return 'April';
  if (s.includes('ግንቦት')) return 'May';
  if (s.includes('ሰኔ')) return 'June';

  // English whole words only
  if (/\b(september|meskerem)\b/i.test(s)) return 'September';
  if (/\b(october|tikimt)\b/i.test(s)) return 'October';
  if (/\b(november|hidar)\b/i.test(s)) return 'November';
  if (/\b(december|tahsas)\b/i.test(s)) return 'December';
  if (/\b(january|tir)\b/i.test(s)) return 'January';
  if (/\b(february|yekatit)\b/i.test(s)) return 'February';
  if (/\b(march|megabit)\b/i.test(s)) return 'March';
  if (/\b(april|miazia)\b/i.test(s)) return 'April';
  if (/\b(may|ginbot)\b/i.test(s)) return 'May';
  if (/\b(june|sene)\b/i.test(s)) return 'June';

  return null;
};

const parseAmount = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val)
    .replace(/[^\d.-]/g, '')
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
};

const parseDateString = (val) => {
  if (!val) return new Date().toISOString().split('T')[0];
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
};

/**
 * Parses Excel / CSV buffer into normalized rows
 */
function parseExcelBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];

  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

  let headerIndex = -1;
  const headerKeywords = ['date', 'amount', 'amt', 'desc', 'particulars', 'student', 'name', 'credit', 'cr', 'ref', 'ቀን', 'መጠን', 'ስም', 'ብር'];

  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const row = rawRows[i];
    if (Array.isArray(row)) {
      const matchCount = row.filter(cell => {
        const str = String(cell).toLowerCase().trim();
        return headerKeywords.some(kw => str.includes(kw));
      }).length;
      if (matchCount >= 2) {
        headerIndex = i;
        break;
      }
    }
  }

  if (headerIndex === -1) headerIndex = 0;

  const headerRow = rawRows[headerIndex].map(h => String(h || '').trim());
  const dataRows = rawRows.slice(headerIndex + 1);

  const colMap = {
    amount: -1,
    description: -1,
    date: -1,
    studentName: -1,
    studentId: -1,
    paymentCode: -1,
    month: -1,
    year: -1,
    class: -1,
    section: -1
  };

  headerRow.forEach((h, idx) => {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    const original = h.toLowerCase();

    if (colMap.amount === -1 && (clean.includes('amount') || clean.includes('amt') || clean.includes('credit') || clean === 'cr' || clean.includes('paid') || clean.includes('deposit') || original.includes('መጠን') || original.includes('ብር') || original.includes('ክፍያ'))) {
      colMap.amount = idx;
    } else if (colMap.date === -1 && (clean.includes('date') || clean === 'dt' || clean.includes('time') || original.includes('ቀን'))) {
      colMap.date = idx;
    } else if (colMap.studentId === -1 && (clean.includes('studentid') || clean === 'id' || clean.includes('studentno') || clean.includes('regno') || clean.includes('rollno') || original.includes('መታወቂያ'))) {
      colMap.studentId = idx;
    } else if (colMap.paymentCode === -1 && (clean.includes('code') || clean.includes('paymentcode') || original.includes('ኮድ'))) {
      colMap.paymentCode = idx;
    } else if (colMap.studentName === -1 && (clean.includes('student') || clean.includes('name') || clean.includes('payer') || clean.includes('beneficiary') || original.includes('ስም') || original.includes('ተማሪ'))) {
      colMap.studentName = idx;
    } else if (colMap.month === -1 && (clean.includes('month') || clean === 'academicmonth' || original.includes('ወር'))) {
      colMap.month = idx;
    } else if (colMap.year === -1 && (clean.includes('year') || clean === 'academicyear' || original.includes('ዓመት') || original.includes('ዓ.ም'))) {
      colMap.year = idx;
    } else if (colMap.class === -1 && (clean.includes('class') || clean.includes('grade') || original.includes('ክፍል'))) {
      colMap.class = idx;
    } else if (colMap.section === -1 && (clean.includes('section') || clean === 'sec')) {
      colMap.section = idx;
    } else if (colMap.description === -1 && (clean.includes('desc') || clean.includes('particular') || clean.includes('narrat') || clean.includes('detail') || clean.includes('remark') || clean.includes('reason') || clean.includes('reference') || clean === 'ref' || original.includes('መግለጫ') || original.includes('ዝርዝር'))) {
      colMap.description = idx;
    }
  });

  const parsed = [];
  dataRows.forEach((row, rowIdx) => {
    if (!Array.isArray(row) || row.every(c => c === '' || c === null || c === undefined)) return;

    const rawAmount = colMap.amount !== -1 ? row[colMap.amount] : '';
    const amount = parseAmount(rawAmount);

    if (amount <= 0 && colMap.amount === -1) {
      for (let c = 0; c < row.length; c++) {
        const cand = parseAmount(row[c]);
        if (cand > 0 && c !== colMap.date && c !== colMap.studentId) {
          break;
        }
      }
    }

    const rawDesc = colMap.description !== -1 ? String(row[colMap.description] || '').trim() : '';
    const rawDate = colMap.date !== -1 ? row[colMap.date] : '';
    const rawName = colMap.studentName !== -1 ? String(row[colMap.studentName] || '').trim() : '';
    const rawId = colMap.studentId !== -1 ? String(row[colMap.studentId] || '').trim() : '';
    const rawCode = colMap.paymentCode !== -1 ? String(row[colMap.paymentCode] || '').trim() : '';
    const rawMonth = colMap.month !== -1 ? normalizeMonth(row[colMap.month]) : null;
    const rawYear = colMap.year !== -1 ? parseInt(row[colMap.year]) || null : null;

    let fullDescription = rawDesc;
    if (!fullDescription) {
      const extraParts = [];
      row.forEach((cell, idx) => {
        if (idx !== colMap.amount && idx !== colMap.date && cell) {
          extraParts.push(String(cell).trim());
        }
      });
      fullDescription = extraParts.join(' | ');
    }

    if (amount > 0 || rawName || rawId || fullDescription) {
      parsed.push({
        rawIndex: rowIdx + 1,
        amount,
        description: fullDescription,
        paymentDate: parseDateString(rawDate),
        studentName: rawName,
        studentIdInput: rawId,
        paymentCodeInput: rawCode,
        monthInput: rawMonth,
        yearInput: rawYear
      });
    }
  });

  return parsed;
}

/**
 * Parses PDF text into individual transaction entries
 */
async function parsePdfBuffer(buffer) {
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  const text = data?.text || '';
  if (!text.trim()) return [];

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const transactions = [];

  const dateRegex = /\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/;
  const amountRegex = /(?:ETB|Br|ብር)?\s*(\b\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\b\d{2,7}(?:\.\d{1,2})?)\s*(?:ETB|Br|ብር)?/gi;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      const numbers = [];
      let m;
      const re = new RegExp(amountRegex.source, 'gi');
      while ((m = re.exec(line)) !== null) {
        const val = parseAmount(m[1]);
        if (val > 0) numbers.push({ str: m[1], val, idx: m.index });
      }

      const validAmounts = numbers.filter(n => {
        const cleanDateStr = dateMatch[0].replace(/[^\d]/g, ' ');
        return !cleanDateStr.includes(n.str);
      });

      if (validAmounts.length > 0) {
        const chosenAmount = validAmounts[0].val;

        let desc = line
          .replace(dateMatch[0], '')
          .replace(validAmounts[0].str, '')
          .replace(/\b(?:CR|DR|ETB|Br|BIRR|TRANSFER|CBE|TELEBIRR|DEPOSIT)\b/gi, ' ')
          .replace(/[\|\t]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (i + 1 < lines.length && !lines[i + 1].match(dateRegex) && lines[i + 1].length > 3 && lines[i + 1].length < 100) {
          const nextLine = lines[i + 1].replace(/[\|\t]+/g, ' ').replace(/\s+/g, ' ').trim();
          if (!nextLine.toLowerCase().includes('page') && !nextLine.toLowerCase().includes('statement')) {
            desc += ' ' + nextLine;
          }
        }

        transactions.push({
          rawIndex: transactions.length + 1,
          amount: chosenAmount,
          description: desc,
          paymentDate: parseDateString(dateMatch[0]),
          studentName: '',
          studentIdInput: '',
          paymentCodeInput: '',
          monthInput: null,
          yearInput: null
        });
      }
    }
  }

  if (transactions.length === 0) {
    let current = null;
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.startsWith('student:') || lower.startsWith('name:') || lower.startsWith('ተማሪ:') || lower.startsWith('ስም:')) {
        if (current && (current.amount > 0 || current.studentName)) {
          transactions.push(current);
        }
        current = {
          rawIndex: transactions.length + 1,
          amount: 0,
          description: '',
          paymentDate: new Date().toISOString().split('T')[0],
          studentName: line.split(':')[1]?.trim() || '',
          studentIdInput: '',
          paymentCodeInput: '',
          monthInput: null,
          yearInput: null
        };
      } else if (current) {
        if (lower.includes('amount:') || lower.includes('መጠን:') || lower.includes('ብር:')) {
          current.amount = parseAmount(line.split(':')[1] || line);
        } else if (lower.includes('date:') || lower.includes('ቀን:')) {
          current.paymentDate = parseDateString(line.split(':')[1] || line);
        } else if (lower.includes('id:') || lower.includes('መታወቂያ:')) {
          current.studentIdInput = line.split(':')[1]?.trim() || '';
        } else if (lower.includes('month:') || lower.includes('ወር:')) {
          current.monthInput = normalizeMonth(line.split(':')[1] || line);
        } else if (lower.includes('desc:') || lower.includes('ref:') || lower.includes('መግለጫ:')) {
          current.description = line.split(':')[1]?.trim() || '';
        }
      }
    });
    if (current && (current.amount > 0 || current.studentName)) {
      transactions.push(current);
    }
  }

  return transactions;
}

/**
 * Universal file parser for Excel or PDF
 */
async function parsePaymentFile(buffer, filename, mimetype) {
  const ext = (filename || '').split('.').pop().toLowerCase();

  if (ext === 'pdf' || (mimetype && mimetype.includes('pdf'))) {
    return await parsePdfBuffer(buffer);
  } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || (mimetype && (mimetype.includes('sheet') || mimetype.includes('excel') || mimetype.includes('csv')))) {
    return parseExcelBuffer(buffer);
  }

  try {
    const excelRes = parseExcelBuffer(buffer);
    if (excelRes.length > 0) return excelRes;
  } catch (err) {
    // continue to pdf
  }
  return await parsePdfBuffer(buffer);
}

module.exports = {
  ETHIOPIAN_ACADEMIC_MONTHS,
  normalizeMonth,
  extractMonthFromText,
  parseAmount,
  parseDateString,
  parsePaymentFile
};
