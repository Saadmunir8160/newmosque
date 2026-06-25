export interface PasswordStrength {
  score: number;
  label: string;
  percent: number;
  valid: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function passwordStrength(password: string): PasswordStrength {
  const pw = password ?? '';
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  const percent = Math.min(100, Math.round((score / 6) * 100));
  const valid =
    pw.length >= 8 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /\d/.test(pw) &&
    /[^a-zA-Z0-9]/.test(pw);

  let label = 'Too weak';
  if (score >= 5) label = 'Strong';
  else if (score >= 4) label = 'Good';
  else if (score >= 3) label = 'Fair';

  return { score, label, percent, valid };
}

export function validateRegistrationForm(input: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (!name) errors['fullName'] = 'Full name is required.';
  if (!email) errors['email'] = 'Email is required.';
  else if (!isValidEmail(email)) errors['email'] = 'Enter a valid email address.';

  const strength = passwordStrength(input.password);
  if (!input.password) errors['password'] = 'Password is required.';
  else if (!strength.valid) {
    errors['password'] = 'Password must be 8+ characters with upper, lower, number, and special character.';
  }

  if (!input.confirmPassword) errors['confirmPassword'] = 'Please confirm your password.';
  else if (input.password !== input.confirmPassword) errors['confirmPassword'] = 'Passwords do not match.';

  if (!input.acceptedTerms) errors['terms'] = 'You must agree to the Terms & Privacy Policy.';

  return errors;
}
