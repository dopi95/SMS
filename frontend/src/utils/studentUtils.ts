export const toTitleCase = (str?: string): string => {
  if (!str) return ''
  const s = String(str).trim().replace(/\s+/g, ' ')
  if (!s) return ''
  return s
    .toLowerCase()
    .replace(/(?:^|[^\p{L}\p{N}])(\p{L})/gu, (match, letter) =>
      match.slice(0, -letter.length) + letter.toUpperCase()
    )
}

export interface MinimalStudent {
  firstName?: string
  middleName?: string
  lastName?: string
  firstNameAmharic?: string
  middleNameAmharic?: string
  lastNameAmharic?: string
}

/**
 * Returns the student's full name based on the current active language.
 * When language is 'am' (Amharic), it returns the Amharic full name.
 * If the Amharic name is missing, empty, or whitespace, it reliably falls back
 * to the formatted English name.
 */
export const getStudentDisplayName = (
  student?: MinimalStudent | null,
  language: string = 'en'
): string => {
  if (!student) return ''

  if (language === 'am') {
    const amharicParts = [
      student.firstNameAmharic?.trim(),
      student.middleNameAmharic?.trim(),
      student.lastNameAmharic?.trim()
    ].filter((p): p is string => Boolean(p && p.length > 0))

    if (amharicParts.length > 0) {
      return amharicParts.join(' ')
    }
  }

  const englishParts = [
    toTitleCase(student.firstName?.trim()),
    toTitleCase(student.middleName?.trim()),
    toTitleCase(student.lastName?.trim())
  ].filter((p): p is string => Boolean(p && p.length > 0))

  return englishParts.join(' ') || '-'
}

