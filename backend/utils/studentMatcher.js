/**
 * Intelligent Ethiopian student matching utility for Bank SMS payments.
 * Matches incoming bank SMS payer name to student's father, mother, or student names,
 * accommodating spelling variations, transliterations, and differing name lengths (2 vs 3 names).
 */

// Common words to ignore when tokenizing names
const IGNORED_NAME_WORDS = new Set([
  'ato', 'w/ro', 'wro', 'w/r', 'dr', 'mr', 'mrs', 'ms',
  'dear', 'customer', 'account', 'from', 'by', 'via', 'ips',
  'etb', 'birr', 'bank', 'cbe', 'awash', 'telebirr', 'cbebirr'
]);

// Ignored payment code substrings that could falsely match in normal SMS text
const IGNORED_PAYMENT_CODES = new Set([
  'ETB', 'BIRR', 'CBE', 'AWASH', 'BANK', 'PAID', 'REF', 'TXN',
  'FROM', 'YOUR', 'ACCOUNT', 'DATE', 'THANKS', 'CUSTOMER', 'DEAR'
]);

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function cleanToken(token) {
  if (!token) return '';
  return token
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

function extractNameTokens(nameStr) {
  if (!nameStr || typeof nameStr !== 'string') return [];
  return nameStr
    .split(/[\s\-_\/,\.]+/)
    .map(cleanToken)
    .filter(t => t.length >= 2 && !IGNORED_NAME_WORDS.has(t));
}

/**
 * Checks if two single name tokens match, tolerating common transliteration differences:
 * - Direct equality (elias == elias)
 * - Minor suffix difference (tesfay vs tesfaye, dagnachew vs dagnachewu)
 * - 1 typo / substitution for words >= 5 chars (elias vs elyas)
 */
function tokensMatch(t1, t2) {
  if (!t1 || !t2) return false;
  if (t1 === t2) return true;

  // Prefix match if diff is 1 or 2 chars (e.g. tesfay vs tesfaye, alem vs alemu)
  const lenDiff = Math.abs(t1.length - t2.length);
  if (lenDiff <= 2 && (t1.startsWith(t2) || t2.startsWith(t1))) {
    return true;
  }

  // Levenshtein typo tolerance for tokens >= 4 chars
  if (t1.length >= 4 && t2.length >= 4) {
    const dist = levenshteinDistance(t1, t2);
    if (dist <= 1) return true;
  }

  return false;
}

/**
 * Matches a candidate name (e.g. student's fatherName or motherName)
 * against the payer's name tokens.
 * Returns match score (0 to 100), or 0 if insufficient match.
 */
function matchCandidateTokens(candidateTokens, payerTokens) {
  if (!candidateTokens || candidateTokens.length < 2) return 0;
  if (!payerTokens || payerTokens.length < 2) return 0;

  let matchedCount = 0;
  const matchedPayerIndices = new Set();

  for (const cToken of candidateTokens) {
    for (let pIdx = 0; pIdx < payerTokens.length; pIdx++) {
      if (matchedPayerIndices.has(pIdx)) continue;
      if (tokensMatch(cToken, payerTokens[pIdx])) {
        matchedCount++;
        matchedPayerIndices.add(pIdx);
        break;
      }
    }
  }

  // We require at least 2 distinct matching name tokens (e.g. First + Father's name)
  if (matchedCount < 2) {
    return 0;
  }

  // Score calculation:
  // Percentage of candidate tokens matched (max candidate tokens is usually 2 or 3)
  const ratio = matchedCount / candidateTokens.length;
  // If candidate has 2 names and both matched -> 100
  // If candidate has 3 names and 2 matched -> 80
  // If candidate has 3 names and all 3 matched -> 100
  if (ratio >= 0.99) return 100;
  if (matchedCount >= 2 && candidateTokens.length <= 3) return 85;

  return Math.round(ratio * 80);
}

/**
 * Calculates a match confidence score for a student given the payer name and raw SMS text.
 * Checks:
 * 1. Registered father's name (fatherName)
 * 2. Father's name from student's middleName + lastName
 * 3. Registered mother's name (motherName)
 * 4. Student's own name (firstName + middleName + lastName)
 * 5. Payment code with strict word boundary checks
 */
function scoreStudentMatch(student, payerName, smsText = '') {
  if (!student) return { score: 0, reason: null };

  const payerTokens = extractNameTokens(payerName);
  let bestScore = 0;
  let bestReason = null;

  // 1. Check Father's Name (highest priority)
  if (student.fatherName && payerTokens.length >= 2) {
    const fatherTokens = extractNameTokens(student.fatherName);
    const score = matchCandidateTokens(fatherTokens, payerTokens);
    if (score > bestScore) {
      bestScore = score;
      bestReason = `Matched Father's name (${student.fatherName})`;
    }
  }

  // 2. Check student's middleName + lastName (which represents father's first + last name in Ethiopia)
  if (student.middleName && student.lastName && payerTokens.length >= 2) {
    const derivedFatherTokens = extractNameTokens(`${student.middleName} ${student.lastName}`);
    const score = matchCandidateTokens(derivedFatherTokens, payerTokens);
    if (score > bestScore) {
      bestScore = score;
      bestReason = `Matched Father's name (${student.middleName} ${student.lastName})`;
    }
  }

  // 3. Check Mother's Name
  if (student.motherName && payerTokens.length >= 2) {
    const motherTokens = extractNameTokens(student.motherName);
    const score = matchCandidateTokens(motherTokens, payerTokens);
    if (score > bestScore) {
      bestScore = score;
      bestReason = `Matched Mother's name (${student.motherName})`;
    }
  }

  // 4. Check Student's full name (if student themselves paid or is named in SMS)
  if (student.firstName && (student.middleName || student.lastName) && payerTokens.length >= 2) {
    const studentTokens = extractNameTokens(`${student.firstName} ${student.middleName || ''} ${student.lastName || ''}`);
    const score = matchCandidateTokens(studentTokens, payerTokens);
    if (score > bestScore) {
      bestScore = score;
      bestReason = `Matched Student's full name (${student.firstName} ${student.middleName || ''} ${student.lastName || ''})`;
    }
  }

  // 5. Payment code match (only if strict, >= 4 chars, and not common SMS word)
  if (student.paymentCode && smsText) {
    const cleanCode = student.paymentCode.trim().toUpperCase();
    if (cleanCode.length >= 4 && !IGNORED_PAYMENT_CODES.has(cleanCode)) {
      const escapedCode = cleanCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const codeRegex = new RegExp(`\\b${escapedCode}\\b`, 'i');
      if (codeRegex.test(smsText)) {
        // High confidence exact payment code
        if (bestScore < 95) {
          bestScore = 95;
          bestReason = `Matched Payment Code (${cleanCode})`;
        }
      }
    }
  }

  return { score: bestScore, reason: bestReason };
}

/**
 * Searches a list of students to find the best match for the given payer name & SMS text.
 * Requires a minimum score of 75 (at least 2 matching tokens).
 */
function findMatchingStudent(students, payerName, smsText = '') {
  if (!students || !Array.isArray(students) || students.length === 0) {
    return null;
  }

  let highestScore = 0;
  let matchedStudent = null;

  for (const student of students) {
    const result = scoreStudentMatch(student, payerName, smsText);
    if (result.score >= 75 && result.score > highestScore) {
      highestScore = result.score;
      matchedStudent = student;
    }
  }

  return matchedStudent;
}

module.exports = {
  levenshteinDistance,
  cleanToken,
  tokensMatch,
  extractNameTokens,
  matchCandidateTokens,
  scoreStudentMatch,
  findMatchingStudent
};

