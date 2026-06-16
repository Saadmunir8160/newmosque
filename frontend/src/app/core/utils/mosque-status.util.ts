export const MOSQUE_STATUSES = [
  'PendingReview',
  'Unclaimed',
  'Claimed',
  'Active',
  'Suspended',
  'Archived',
] as const;

export type MosqueStatusValue = (typeof MOSQUE_STATUSES)[number];

export function formatMosqueStatus(status: string): string {
  return status
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase());
}

export function statusClass(status: string): string {
  const map: Record<string, string> = {
    PendingReview: 'status--pending',
    Unclaimed: 'status--unclaimed',
    Claimed: 'status--claimed',
    Active: 'status--active',
    Suspended: 'status--suspended',
    Archived: 'status--archived',
  };
  return map[status] ?? 'status--unclaimed';
}
