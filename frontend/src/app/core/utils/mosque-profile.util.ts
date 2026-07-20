import { Mosque } from '../models';

/** Client-side profile completeness (aligned with backend MosqueProfileCompleteness). */
export const MosqueProfileCompleteness = {
  ActivationThreshold: 60,

  calculate(mosque: Mosque): number {
    const fields = [
      mosque.name,
      mosque.address,
      mosque.city,
      mosque.postcode,
      mosque.phone,
      mosque.email,
      mosque.description,
      mosque.logoUrl,
      mosque.bannerUrl,
      mosque.vision,
      mosque.history,
      mosque.establishedYear != null ? String(mosque.establishedYear) : '',
      (mosque.gallery?.length ?? 0) > 0 ? '1' : '',
      (mosque.leadership?.length ?? 0) > 0 ? '1' : '',
    ];
    const filled = fields.filter(v => v != null && String(v).trim() !== '').length;
    return fields.length ? Math.round((filled / fields.length) * 100) : 0;
  },

  /** Hard gate before ACTIVE: name, city, address, phone OR email. */
  meetsActivationGate(mosque: Pick<Mosque, 'name' | 'city' | 'address' | 'phone' | 'email'>): {
    ok: boolean;
    missing: string[];
    completeness: number;
  } {
    const missing: string[] = [];
    if (!mosque.name?.trim()) missing.push('name');
    if (!mosque.city?.trim()) missing.push('city');
    if (!mosque.address?.trim()) missing.push('address');
    if (!mosque.phone?.trim() && !mosque.email?.trim()) missing.push('phone or email');

    const completeness = 'id' in mosque && typeof (mosque as Mosque).id === 'number'
      ? this.calculate(mosque as Mosque)
      : 0;

    return { ok: missing.length === 0, missing, completeness };
  },

  isBelowWarningThreshold(completeness: number): boolean {
    return completeness < this.ActivationThreshold;
  },
};
