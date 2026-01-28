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

module.exports = { validateEmail, validatePassword, validateRequired };