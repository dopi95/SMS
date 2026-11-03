/**
 * Intelligent Ethiopian student matching utility for Bank SMS payments.
 * Matches incoming bank SMS payer name to student's father, mother, or student names.
 *
 * Requirements:
 * 1. Checks full name of the payer against:
 *    - Father's full name (fatherName or middleName + lastName)
 *    - Mother's full name (motherName)
 *    - Student's full name (firstName + middleName + lastName)
 * 2. If the full name matches (both first and middle name of parent/student match payer):
 *    - Match directly.
 *    - Support multiple students because they can be siblings sharing the same father/mother.
 * 3. If first and middle name do not both match:
 *    - Detect all related / partial name matches (shared first name, shared father name, transliteration variations).
 *    - Return them as suggested / related matches so the user can review, select one or more, remove others, and confirm.
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
 * - Minor suffix difference (tesfay vs tesfaye, dagnachew vs dagnachewu, alem vs alemu)
 * - 1 typo / substitution for words >= 4 chars (elias vs elyas)
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
 * Detailed evaluation of a candidate name (father, mother, or student) against payer tokens.
 * Returns: { isExact: boolean, isRelated: boolean, score: number, reason: string }
 */
function evaluateCandidateMatch(candidateTokens, payerTokens, roleLabel) {
  if (!candidateTokens || candidateTokens.length === 0 || !payerTokens || payerTokens.length === 0) {
    return { isExact: false, isRelated: false, score: 0, reason: null };
  }

  const c1 = candidateTokens[0];
  const c2 = candidateTokens[1] || '';
  const p1 = payerTokens[0];
  const p2 = payerTokens[1] || '';

  // 1. EXACT FULL NAME MATCH:
  // Both First Name AND Middle Name of the candidate match Payer's First and Middle name!
  if (c1 && c2 && p1 && p2 && tokensMatch(c1, p1) && tokensMatch(c2, p2)) {
    return {
      isExact: true,
      isRelated: false,
      score: 100,
      reason: `Full name matches ${roleLabel} (${candidateTokens.join(' ')})`
    };
  }

  // Also check if candidate has 3 tokens and payer has 3 tokens matching all
  if (candidateTokens.length >= 2 && payerTokens.length >= 2) {
    const bothMatch = tokensMatch(candidateTokens[0], payerTokens[0]) && tokensMatch(candidateTokens[1], payerTokens[1]);
    if (bothMatch) {
      return {
        isExact: true,
        isRelated: false,
        score: 100,
        reason: `Full name matches ${roleLabel} (${candidateTokens.join(' ')})`
      };
    }
  }

  // 2. RELATED / PARTIAL MATCHES:
  // a) Shared first name (p1 matches c1)
  if (c1 && p1 && tokensMatch(c1, p1)) {
    return {
      isExact: false,
      isRelated: true,
      score: 75,
      reason: `Shared first name (${p1}) with ${roleLabel}`
    };
  }

  // b) Shared second/father name (p2 matches c2, or p1 matches c2)
  if (c2 && p2 && tokensMatch(c2, p2)) {
    return {
      isExact: false,
      isRelated: true,
      score: 70,
      reason: `Shared father/family name (${p2}) with ${roleLabel}`
    };
  }

  if (c2 && p1 && tokensMatch(c2, p1)) {
    return {
      isExact: false,
      isRelated: true,
      score: 65,
      reason: `Payer first name matches ${roleLabel}'s father name (${p1})`
    };
  }

  // c) Any token in payer matches any token in candidate
  for (const pToken of payerTokens) {
    for (const cToken of candidateTokens) {
      if (tokensMatch(pToken, cToken)) {
        return {
          isExact: false,
          isRelated: true,
          score: 55,
          reason: `Related name token (${pToken}) in ${roleLabel}`
        };
      }
    }
  }

  return { isExact: false, isRelated: false, score: 0, reason: null };
}

/**
 * Evaluates a single student against the payer name and optional SMS text.
 * Returns: { matchType: 'exact' | 'related' | 'none', score: number, reason: string }
 */
function scoreStudentMatchDetailed(student, payerName, smsText = '') {
  if (!student) return { matchType: 'none', score: 0, reason: null };

  const payerTokens = extractNameTokens(payerName);
  let bestResult = { matchType: 'none', score: 0, reason: null };

  // 1. Payment code in SMS (Highest confidence exact match if present)
  if (student.paymentCode && smsText) {
    const cleanCode = student.paymentCode.trim().toUpperCase();
    if (cleanCode.length >= 4 && !IGNORED_PAYMENT_CODES.has(cleanCode)) {
      const escapedCode = cleanCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const codeRegex = new RegExp(`\\b${escapedCode}\\b`, 'i');
      if (codeRegex.test(smsText)) {
        return {
          matchType: 'exact',
          score: 100,
          reason: `Exact payment code matched in SMS (${cleanCode})`
        };
      }
    }
  }

  if (payerTokens.length === 0) {
    return bestResult;
  }

  // Candidates list to check for this student
  const candidates = [];

  // A. Registered Father's Name
  if (student.fatherName) {
    candidates.push({
      tokens: extractNameTokens(student.fatherName),
      role: `Father's name (${student.fatherName})`
    });
  }

  // B. Derived Father's Name (middleName + lastName)
  if (student.middleName && student.lastName) {
    candidates.push({
      tokens: extractNameTokens(`${student.middleName} ${student.lastName}`),
      role: `Father's name (${student.middleName} ${student.lastName})`
    });
  }

  // C. Registered Mother's Name
  if (student.motherName) {
    candidates.push({
      tokens: extractNameTokens(student.motherName),
      role: `Mother's name (${student.motherName})`
    });
  }

  // D. Student's Full Name (English)
  if (student.firstName && (student.middleName || student.lastName)) {
    candidates.push({
      tokens: extractNameTokens(`${student.firstName} ${student.middleName || ''} ${student.lastName || ''}`),
      role: `Student's full name (${student.firstName} ${student.middleName || ''})`
    });
  }

  for (const cand of candidates) {
    const res = evaluateCandidateMatch(cand.tokens, payerTokens, cand.role);
    if (res.isExact) {
      // Immediate return for exact match
      return { matchType: 'exact', score: res.score, reason: res.reason };
    }
    if (res.isRelated && res.score > bestResult.score) {
      bestResult = { matchType: 'related', score: res.score, reason: res.reason };
    }
  }

  return bestResult;
}

/**
 * Scans all students to find both EXACT matches (including siblings)
 * and RELATED matches (partial matches for user review and manual selection).
 *
 * @param {Array} students
 * @param {string} payerName
 * @param {string} [smsText]
 * @returns {{ exactMatches: Array<{ student: Object, score: number, reason: string, matchType: string }>, relatedMatches: Array<{ student: Object, score: number, reason: string, matchType: string }> }}
 */
function findAllMatchingStudents(students, payerName, smsText = '') {
  if (!students || !Array.isArray(students) || students.length === 0 || !payerName || !payerName.trim()) {
    return { exactMatches: [], relatedMatches: [] };
  }

  const exactMatches = [];
  const relatedMatches = [];

  for (const student of students) {
    const evaluation = scoreStudentMatchDetailed(student, payerName, smsText);

    if (evaluation.matchType === 'exact') {
      exactMatches.push({
        student,
        score: evaluation.score,
        reason: evaluation.reason,
        matchType: 'exact'
      });
    } else if (evaluation.matchType === 'related' && evaluation.score >= 50) {
      relatedMatches.push({
        student,
        score: evaluation.score,
        reason: evaluation.reason,
        matchType: 'related'
      });
    }
  }

  // Sort related matches descending by score
  relatedMatches.sort((a, b) => b.score - a.score);

  return {
    exactMatches,
    // Limit related matches to top 15 most relevant
    relatedMatches: relatedMatches.slice(0, 15)
  };
}

/**
 * Backward compatible helper that returns the first best matched student
 */
function findMatchingStudent(students, payerName, smsText = '') {
  const result = findAllMatchingStudents(students, payerName, smsText);
  if (result.exactMatches.length > 0) {
    return result.exactMatches[0].student;
  }
  return null;
}

/**
 * Score student match for backward compatibility
 */
function scoreStudentMatch(student, payerName, smsText = '') {
  const evalResult = scoreStudentMatchDetailed(student, payerName, smsText);
  return { score: evalResult.score, reason: evalResult.reason };
}

module.exports = {
  levenshteinDistance,
  cleanToken,
  tokensMatch,
  extractNameTokens,
  evaluateCandidateMatch,
  scoreStudentMatchDetailed,
  findAllMatchingStudents,
  findMatchingStudent,
  scoreStudentMatch
};
