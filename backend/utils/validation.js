const EN_NAME_REGEX = /^[A-Za-z\s]+$/;
const EN_HAS_LETTER_REGEX = /[A-Za-z]/;
const AM_NAME_REGEX = /^[\u1200-\u135A\u1380-\u139F\u2D80-\u2DDF\uAB01-\uAB2F\s]+$/;
const AM_HAS_LETTER_REGEX = /[\u1200-\u135A\u1380-\u139F\u2D80-\u2DDF\uAB01-\uAB2F]/;
const PARENT_NAME_REGEX = /^[A-Za-z\u1200-\u135A\u1380-\u139F\u2D80-\u2DDF\uAB01-\uAB2F\s]+$/;
const PARENT_HAS_LETTER_REGEX = /[A-Za-z\u1200-\u135A\u1380-\u139F\u2D80-\u2DDF\uAB01-\uAB2F]/;
const PHONE_REGEX = /^(09|07)\d{8}$/;

const sanitizeName = (str) => (typeof str === 'string' ? str.trim().replace(/\s+/g, ' ') : '');

const isValidEnglishName = (name) => {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  return EN_HAS_LETTER_REGEX.test(trimmed) && EN_NAME_REGEX.test(trimmed);
};

const isValidAmharicName = (name) => {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  return AM_HAS_LETTER_REGEX.test(trimmed) && AM_NAME_REGEX.test(trimmed);
};

const isValidParentName = (name) => {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  return PARENT_HAS_LETTER_REGEX.test(trimmed) && PARENT_NAME_REGEX.test(trimmed);
};

const isValidPhone = (phone) => {
  if (typeof phone !== 'string') return false;
  return PHONE_REGEX.test(phone.trim());
};

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateRequired = (fields, body) => {
  const missing = [];
  fields.forEach(field => {
    if (!body[field]) {
      missing.push(field);
    }
  });
  return missing;
};

module.exports = {
  validateEmail,
  validatePassword,
  validateRequired,
  sanitizeName,
  isValidEnglishName,
  isValidAmharicName,
  isValidParentName,
  isValidPhone,
};