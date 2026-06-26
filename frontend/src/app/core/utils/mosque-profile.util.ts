import { Mosque } from '../models';

/** Client-side profile completeness (matches backend MosqueProfileCompleteness). */
export const MosqueProfileCompleteness = {
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
    ];
    const filled = fields.filter(v => v != null && String(v).trim() !== '').length;
    return fields.length ? Math.round((filled / fields.length) * 100) : 0;
  },
};
