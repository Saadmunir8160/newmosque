import { slugifyMosqueName } from './mosque-slug.util';

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
}

export type MosqueSeedFieldErrors = Partial<Record<keyof MosqueSeedFormValue | 'logo' | 'banner', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const website = form.website.trim();
  if (website && !isValidWebsite(website)) errors.website = 'Enter a valid website URL.';

  if (logoFile && !isImageFile(logoFile)) errors.logo = 'Logo must be an image file.';
  if (bannerFile && !isImageFile(bannerFile)) errors.banner = 'Banner must be an image file.';

  return errors;
}
