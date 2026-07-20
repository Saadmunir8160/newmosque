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

/**
 * Module 3.1 claim eligibility (ModuleRequirements):
 * - Mosque must be Unclaimed
 * - Any authenticated user may claim after email verification
 * - Super Admin cannot claim
 */
export function canShowClaimCta(input: {
  mosqueStatus: string;
  isSuperAdmin: boolean;
  userId?: string | null;
  ownerId?: string | null;
}): boolean {
  if (input.mosqueStatus !== 'Unclaimed') return false;
  if (input.isSuperAdmin) return false;
  if (input.userId && input.ownerId && input.userId === input.ownerId) return false;
  return true;
}

export function claimCtaHint(input: {
  isAuthenticated: boolean;
  emailConfirmed?: boolean | null;
}): string {
  if (!input.isAuthenticated) {
    return 'Sign in with a verified account to submit an ownership claim.';
  }
  if (input.emailConfirmed === false) {
    return 'Verify your email before submitting an ownership claim.';
  }
  return 'If you are an authorised representative, you can submit an ownership claim.';
}

const UK_PHONE_RE = /^(\+44|0)[1-9]\d{8,10}$/;

export function validateClaimForm(input: {
  phone: string;
  role: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const phone = input.phone.trim().replace(/[\s-]/g, '');

  if (!phone) {
    errors['phone'] = 'Phone is required.';
  } else if (!UK_PHONE_RE.test(phone)) {
    errors['phone'] = 'Phone must be a valid UK number (+44 or 0 prefix).';
  }

  if (!input.role?.trim()) errors['role'] = 'Role is required.';

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
