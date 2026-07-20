import { Mosque, MosqueSocialLink } from '../models';

/** Resolve displayable social links — prefer `socialLinks` JSON, else legacy columns. */
export function resolveMosqueSocialLinks(m: Mosque): MosqueSocialLink[] {
  const fromJson = (m.socialLinks ?? []).filter(l => !!l?.url?.trim());
  if (fromJson.length > 0) return fromJson;

  const legacy: MosqueSocialLink[] = [];
  if (m.facebookUrl?.trim()) legacy.push({ platform: 'facebook', url: m.facebookUrl.trim() });
  if (m.instagramUrl?.trim()) legacy.push({ platform: 'instagram', url: m.instagramUrl.trim() });
  if (m.youtubeUrl?.trim()) legacy.push({ platform: 'youtube', url: m.youtubeUrl.trim() });
  if (m.twitterUrl?.trim()) legacy.push({ platform: 'x', url: m.twitterUrl.trim() });
  return legacy;
}

export function socialLinkLabel(link: MosqueSocialLink): string {
  if (link.label?.trim()) return link.label.trim();
  switch ((link.platform || '').toLowerCase()) {
    case 'facebook': return 'Facebook';
    case 'instagram': return 'Instagram';
    case 'youtube': return 'YouTube';
    case 'x':
    case 'twitter': return 'X / Twitter';
    default: return link.platform || 'Link';
  }
}

export function socialLinkCssClass(platform: string): string {
  switch ((platform || '').toLowerCase()) {
    case 'facebook': return 'pub-social__link--fb';
    case 'instagram': return 'pub-social__link--ig';
    case 'youtube': return 'pub-social__link--yt';
    case 'x':
    case 'twitter': return 'pub-social__link--tw';
    default: return '';
  }
}
