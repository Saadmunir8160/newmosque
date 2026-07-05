import { slugifyMosqueName } from './mosque-slug.util';
import { Mosque } from '../models';

export const EDIT_MOSQUE_STATUSES = [
  'Unclaimed',
  'Invited',
  'ClaimPending',
  'Claimed',
  'PendingReview',
  'Active',
  'Suspended',
  'Archived',
] as const;

export interface MosqueSeedFormValue {
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  timezone: string;
  ownerInviteEmail: string;
  ownerInviteName: string;
  ownerId: string;
  status: string;
}

export type MosqueSeedFieldErrors = Partial<Record<keyof MosqueSeedFormValue | 'logo' | 'banner', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UK_PHONE_RE = /^(\+44|0)[1-9]\d{8,10}$/;

export function normalizeUkPhone(phone: string): string {
  return phone.replace(/[\s-]/g, '');
}

export function isValidUkPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!trimmed) return true;
  return UK_PHONE_RE.test(normalizeUkPhone(trimmed));
}

export function resolveEditMosqueStatus(status: string | undefined): string {
  const value = status ?? 'Unclaimed';
  return (EDIT_MOSQUE_STATUSES as readonly string[]).includes(value) ? value : 'Unclaimed';
}

export function defaultMosqueSeedForm(): MosqueSeedFormValue {
  return {
    name: '',
    slug: '',
    description: '',
    address: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
    phone: '',
    email: '',
    website: '',
    timezone: 'Europe/London',
    ownerInviteEmail: '',
    ownerInviteName: '',
    ownerId: '',
    status: 'Unclaimed',
  };
}

export function mosqueSeedFormFromMosque(m: Mosque): MosqueSeedFormValue {
  return {
    name: m.name ?? '',
    slug: m.slug ?? '',
    description: m.description ?? '',
    address: m.address ?? '',
    city: m.city ?? '',
    postcode: m.postcode ?? '',
    country: m.country ?? 'United Kingdom',
    phone: m.phone ?? '',
    email: m.email ?? '',
    website: m.website ?? '',
    timezone: m.timezone ?? 'Europe/London',
    ownerInviteEmail: '',
    ownerInviteName: '',
    ownerId: m.ownerId ?? '',
    status: resolveEditMosqueStatus(m.status),
  };
}

export function normalizeSeedSlug(input: string): string {
  return slugifyMosqueName(input);
}

export function isValidWebsite(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isImageFile(file: File | null): boolean {
  return !!file && file.type.startsWith('image/');
}

export function validateMosqueSeedForm(
  form: MosqueSeedFormValue,
  logoFile: File | null,
  bannerFile: File | null,
): MosqueSeedFieldErrors {
  const errors: MosqueSeedFieldErrors = {};
  const name = form.name.trim();

  if (!name) errors.name = 'Mosque name is required.';
  else if (name.length < 3) errors.name = 'Mosque name must be at least 3 characters.';

  if (!form.city.trim()) errors.city = 'City is required.';

  const slug = normalizeSeedSlug(form.slug || form.name);
  if (!slug) errors.slug = 'Slug is required.';
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.slug = 'Slug must be lowercase and hyphen-separated.';
  }

  const email = form.email.trim();
  if (email && !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';

  const ownerInviteEmail = form.ownerInviteEmail.trim();
  if (ownerInviteEmail && !EMAIL_RE.test(ownerInviteEmail)) {
    errors.ownerInviteEmail = 'Enter a valid owner invite email.';
  }

  const website = form.website.trim();
  if (website && !isValidWebsite(website)) errors.website = 'Enter a valid website URL.';

  const phone = form.phone.trim();
  if (phone && !isValidUkPhone(phone)) {
    errors.phone = 'Enter a valid UK phone number (+44 or 0 prefix).';
  }

  if (logoFile && !isImageFile(logoFile)) errors.logo = 'Logo must be an image file.';
  if (bannerFile && !isImageFile(bannerFile)) errors.banner = 'Banner must be an image file.';

  return errors;
}
