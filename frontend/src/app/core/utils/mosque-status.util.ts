export const MOSQUE_STATUSES = [
  'PendingReview',
  'Unclaimed',
  'ClaimPending',
  'Claimed',
  'Active',
  'Suspended',
  'Archived',
] as const;

/** Module 3.1 — Super Admin listings filter (All / Unclaimed / Claimed / Active). */
export const PROFILE_STATUS_FILTERS = ['Unclaimed', 'Claimed', 'Active'] as const;

export type MosqueStatusValue = (typeof MOSQUE_STATUSES)[number];

const STATUS_LABELS: Record<string, string> = {
  PendingReview: 'Pending Review',
  Unclaimed: 'Unclaimed',
  ClaimPending: 'Claim Pending',
  Claimed: 'Claimed',
  Active: 'Active',
  Suspended: 'Suspended',
  Archived: 'Archived',
};

export function formatMosqueStatus(status: string): string {
  if (STATUS_LABELS[status]) return STATUS_LABELS[status];
  return status
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase());
}

export function statusClass(status: string): string {
  const map: Record<string, string> = {
    PendingReview: 'status--pending',
    Unclaimed: 'status--unclaimed',
    ClaimPending: 'status--claimed',
    Claimed: 'status--claimed',
    Active: 'status--active',
    Suspended: 'status--suspended',
    Archived: 'status--archived',
  };
  return map[status] ?? 'status--unclaimed';
}

/** Public `/mosque/{slug}` is visible for these statuses. */
export function isMosquePubliclyVisible(status: string): boolean {
  return status === 'Unclaimed' || status === 'Claimed' || status === 'Active';
}

export interface PublicStatusCard {
  label: string;
  description: string;
  tone: 'amber' | 'blue' | 'green';
}

export function publicStatusCard(status: string): PublicStatusCard {
  switch (status) {
    case 'Claimed':
      return {
        label: 'Claimed',
        description: 'Ownership verification is currently in progress.',
        tone: 'blue',
      };
    case 'Active':
      return {
        label: 'Verified Mosque',
        description: 'This mosque has been verified and is managed by its official administrators.',
        tone: 'green',
      };
    default:
      return {
        label: 'Unclaimed Mosque',
        description: 'This mosque has not yet been claimed by its official administrators.',
        tone: 'amber',
      };
  }
}

export function canShowPublicClaimCta(status: string): boolean {
  return status === 'Unclaimed';
}
