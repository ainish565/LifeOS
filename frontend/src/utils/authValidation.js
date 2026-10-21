// Client-side checks mirroring backend/services/auth_service.py.
// The server re-validates everything; these just give instant feedback.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function validateEmail(email) {
  const value = email.trim()
  if (!value) return 'Email is required.'
  if (value.length > 254 || !EMAIL_RE.test(value)) return 'Enter a valid email address.'
  return null
}

export function validateLogin({ email, password }) {
  const errors = {}
  const emailError = validateEmail(email)
  if (emailError) errors.email = emailError
  if (!password) errors.password = 'Password is required.'
  return errors
}

export function validateRegister({ name, email, password, confirmPassword }) {
  const errors = {}

  const cleanName = name.trim()
  if (!cleanName) errors.name = 'Name is required.'
  else if (cleanName.length > 80) errors.name = 'Name must be at most 80 characters.'

  const emailError = validateEmail(email)
  if (emailError) errors.email = emailError

  if (!password) errors.password = 'Password is required.'
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.'
  else if (password.length > 128) errors.password = 'Password must be at most 128 characters.'
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'Password must contain at least one letter and one number.'
  }

  if (!confirmPassword) errors.confirm_password = 'Please confirm your password.'
  else if (confirmPassword !== password) errors.confirm_password = 'Passwords do not match.'

  return errors
}
