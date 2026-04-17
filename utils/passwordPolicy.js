const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8)
    errors.push("Password must be at least 8 characters");

  if (!/[A-Z]/.test(password))
    errors.push("Password must contain at least one uppercase letter");

  if (!/[a-z]/.test(password))
    errors.push("Password must contain at least one lowercase letter");

  if (!/[0-9]/.test(password))
    errors.push("Password must contain at least one number");

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    errors.push("Password must contain at least one special character (!@#$%^&* etc)");

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = { validatePassword };