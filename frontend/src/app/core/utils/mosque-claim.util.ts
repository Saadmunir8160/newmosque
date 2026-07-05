export const CLAIM_ROLES = [
  'Imam',
  'Mosque Chairman',
  'Committee Member',
  'Trustee',
  'Administrator',
  'Volunteer',
  'Other',
] as const;

export type ClaimRole = (typeof CLAIM_ROLES)[number];

const MAX_PDF_BYTES = 10 * 1024 * 1024;

const UK_PHONE_RE = /^(\+44|0)[1-9]\d{8,10}$/;

export function validateClaimForm(input: {
  phone: string;
  role: string;
  proofFile: File | null;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const phone = input.phone.trim().replace(/[\s-]/g, '');

  if (!phone) {
    errors['phone'] = 'Phone is required.';
  } else if (!UK_PHONE_RE.test(phone)) {
    errors['phone'] = 'Phone must be a valid UK number (+44 or 0 prefix).';
  }

  if (!input.role?.trim()) errors['role'] = 'Role is required.';

  if (!input.proofFile) {
    errors['proof'] = 'Proof document is required.';
  } else {
    const name = input.proofFile.name.toLowerCase();
    if (!name.endsWith('.pdf')) {
      errors['proof'] = 'Please upload a valid PDF document (maximum 10 MB).';
    } else if (input.proofFile.size > MAX_PDF_BYTES) {
      errors['proof'] = 'Please upload a valid PDF document (maximum 10 MB).';
    }
  }

  return errors;
}

export function readClaimApiError(err: unknown): string {
  const body = (err as { error?: { message?: string }; status?: number })?.error;
  if (body?.message) return body.message;
  const status = (err as { status?: number })?.status;
  if (status === 409) return 'A claim for this mosque is already under review.';
  if (status === 403) return 'Please verify your email before submitting a claim.';
  if (status === 0) return 'Unable to submit your claim. Please try again.';
  return 'Unable to submit your claim. Please try again.';
}
