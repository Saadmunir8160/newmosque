/** Match backend SlugService.Normalize for client-side preview. */
export function slugifyMosqueName(input: string): string {
  if (!input?.trim()) return '';
  let slug = input.trim().toLowerCase().replace(/\s+/g, '-');
  slug = slug.replace(/[^a-z0-9-]/g, '');
  slug = slug.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return slug;
}
