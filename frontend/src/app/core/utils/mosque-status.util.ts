export const MOSQUE_STATUSES = [
  'Unclaimed',
  'Claimed',
  'Active',
] as const;

/** Module 3.1 — Super Admin listings filter (All / Unclaimed / Claimed / Active). */
export const PROFILE_STATUS_FILTERS = ['Unclaimed', 'Claimed', 'Active'] as const;

export type MosqueStatusValue = (typeof MOSQUE_STATUSES)[number];

const STATUS_LABELS: Record<string, string> = {
  // Module 3.1 core statuses
  Unclaimed: 'UNCLAIMED',
  Claimed: 'CLAIMED',
  Active: 'ACTIVE',
};

export function formatMosqueStatus(status: string): string {
  if (STATUS_LABELS[status]) return STATUS_LABELS[status];
  return status
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase());
}

export function statusClass(status: string): string {
  const map: Record<string, string> = {
    // Module 3.1 core
    Unclaimed: 'status--unclaimed',
    Claimed: 'status--claimed',
    Active: 'status--active',
  };
  return map[status] || 'status--unclaimed';
}

/** Public `/mosque/{slug}` is visible for Unclaimed + Active (Claimed hidden until activation). */
export function isMosquePubliclyVisible(status: string): boolean {
  const s = status === 'ClaimPending' ? 'Unclaimed' : status;
  return s === 'Unclaimed' || s === 'Active';
}

/** Profile CRUD allowed for Claimed + Active (matches backend MosquePublicVisibility.CanEditProfile). */
export function isMosqueProfileEditableStatus(status: string): boolean {
  return status === 'Claimed' || status === 'Active';
}

export interface PublicStatusCard {
  label: string;
  description: string;
  tone: string;
}

export function publicStatusCard(status: string): { label: string; description: string; tone: string } {
  const normalized = status === 'ClaimPending' ? 'Unclaimed' : status;
  const base = {
    Unclaimed: {
      label: 'Unclaimed listing',
      description: 'This mosque profile was generated from a public directory. The mosque administration has not yet claimed it.',
      tone: 'neutral',
    },
    Claimed: {
      label: 'Claimed — awaiting activation',
      description: 'Ownership has been approved. A Super Admin must activate this listing before it appears on the public directory.',
      tone: 'info',
    },
    Active: {
      label: 'Active profile',
      description: 'This mosque profile is actively managed by its authorised administration team.',
      tone: 'success',
    },
  } as Record<string, { label: string; description: string; tone: string }>;

  return base[normalized] || {
    label: formatMosqueStatus(normalized),
    description: 'Status unavailable.',
    tone: 'neutral',
  };
}

/** Claim CTA only on Unclaimed listings that still accept claims (pending claim sets allowClaimRequests=false). */
export function canShowPublicClaimCta(status: string, allowClaimRequests = true): boolean {
  const s = status === 'ClaimPending' ? 'Unclaimed' : status;
  return s === 'Unclaimed' && allowClaimRequests !== false;
}
