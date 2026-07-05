import { HttpContextToken } from '@angular/common/http';

/** Issue 2 — opt out of global 403 → /unauthorized redirect (e.g. claim form handles 403 inline). */
export const SKIP_UNAUTHORIZED_REDIRECT = new HttpContextToken<boolean>(() => false);
