import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SKIP_UNAUTHORIZED_REDIRECT } from '../http/http-context.tokens';
import { Mosque, MosqueSetting } from '../models';

export interface PlatformStats {
  totalMosques: number;
  activeMosques: number;
  pendingReview?: number;
  pendingClaims: number;
  rejectedClaims?: number;
  totalUsers: number;
}

export interface PlatformDashboard {
  syncedAt?: string;
  platformStatus: 'Healthy' | 'Warning';
  healthScore: number;
  stats: PlatformStats;
  needsAttention: {
    pendingClaims: number;
    unclaimedMosques: number;
    missingOwners: number;
    pendingApprovals: number;
    duplicateListings: number;
    systemWarnings: number;
  };
  mosques: {
    total: number;
    active: number;
    claimPending?: number;
    unclaimed: number;
    suspended: number;
    pendingReview?: number;
    pendingClaims?: number;
    rejectedClaims?: number;
    avgProfileCompleteness?: number;
    byStatus?: Record<string, number>;
    recentAdditions: { id: number; name: string; city: string; status: string; ownerName?: string; createdAt: string }[];
  };
  users: {
    total: number;
    active: number;
    blocked: number;
    newUsers30d: number;
    byRole: { role: string; count: number }[];
  };
  systemHealth: {
    api: string;
    database: string;
    storage: string;
    email: string;
    queue: string;
    backup: string;
  };
  security: {
    activeSessions: number;
    failedLoginAttempts: number;
    blockedAccounts: number;
    suspiciousActivity: number;
  };
  analytics: {
    mosqueGrowth30d: number;
    userGrowth30d: number;
    featureUsage: { module: string; count: number }[];
    activityLast7: number;
    activityPrev7: number;
    mosqueChart: { date: string; count: number }[];
    userChart: { date: string; count: number }[];
    activityChart: { date: string; count: number }[];
  };
  content: {
    announcements: number;
    events: number;
    campaigns: number;
    guides: number;
  };
  notifications: { type: string; title: string; message: string; route: string; severity: string }[];
  recentActivity: AuditLogEntry[];
  auditPreview: AuditLogEntry[];
}

export interface PlatformUser {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  roles: string[];
  createdAt: string;
  homeMosqueId?: number | null;
  mosqueName?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
}

export interface MosqueSnapshot {
  mosque: Mosque;
  announcementCount: number;
  eventCount: number;
  studentCount: number;
  communityCount: number;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  actorId: string;
  actorName?: string;
  targetType?: string;
  targetId?: number;
  description: string;
  createdAt: string;
}

export interface RoleMonitorData {
  totalUsers: number;
  standardRoleAssignments: number;
  adminRoleAssignments: number;
  unassignedUsers: number;
  assignmentCompletionPercent: number;
  totalRoleTypes: number;
  workflow: { label: string; value: number }[];
  topAssignments: { userId: string; name: string; initials: string; primaryRole: string; roleCount: number; rank: number }[];
  auditTrail: AuditLogEntry[];
}

export interface MosquePerson {
  id: string;
  name: string;
  email: string;
}

export interface MosqueListing {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  mapLocation?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  admins: MosquePerson[];
  adminCount: number;
  userCount: number;
  isDuplicate: boolean;
  duplicateReason?: string;
  profileCompleteness?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface MosqueListingsSummary {
  total: number;
  active: number;
  pendingReview: number;
  pendingClaims: number;
  rejectedClaims: number;
}

export interface MosqueListingsResponse {
  total: number;
  duplicateCount: number;
  summary?: MosqueListingsSummary;
  items: MosqueListing[];
}

export interface PendingOwnershipClaim {
  claimId: number;
  claimReference?: string;
  mosqueId: number;
  mosqueName: string;
  city: string;
  address?: string;
  postcode?: string;
  slug: string;
  claimantId: string;
  claimantName: string;
  claimantEmail?: string;
  fullName?: string;
  phone?: string;
  position?: string;
  organization?: string;
  relationshipToMosque?: string;
  yearsAssociated?: number;
  reason?: string;
  documentUrl?: string;
  documents?: { label: string; url: string }[];
  status?: string;
  mosqueStatus: string;
  claimType?: string;
  submittedAt: string;
}

export interface PendingClaimsSummary {
  pending: number;
  approved?: number;
  rejected: number;
  claimPendingListings: number;
  pendingReviewListings: number;
}

export interface PendingClaimsResponse {
  summary: PendingClaimsSummary;
  items: PendingOwnershipClaim[];
}

export interface PlatformClaimDetail {
  claimId: number;
  claimReference?: string;
  mosqueId: number;
  mosqueName: string;
  mosqueAddress?: string;
  mosqueCity?: string;
  mosquePostcode?: string;
  mosqueCountry?: string;
  slug: string;
  applicant: {
    userId: string;
    fullName: string;
    email?: string;
    phone?: string;
    role?: string;
  };
  documents?: { label: string; url: string }[];
  proofDocumentUrl?: string;
  notes?: string;
  status: string;
  mosqueStatus: string;
  submittedDate: string;
  rejectionReason?: string;
}

export interface MosqueDetailResponse {
  mosque: Mosque;
  owner: MosquePerson | null;
  admins: MosquePerson[];
  userCount: number;
  isDuplicate: boolean;
  duplicateReason?: string;
  pendingClaim?: PendingOwnershipClaim | null;
  audit: AuditLogEntry[];
}

export interface UpdateMosquePayload {
  name?: string;
  slug?: string;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  twitterUrl?: string;
  shortDescription?: string;
  description?: string;
  mapLocation?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  status?: string;
  ownerId?: string;
  allowClaimRequests?: boolean;
  requireManualApproval?: boolean;
  publicProfileEnabled?: boolean;
}

export interface PlatformSettings {
  baAlawiDefault: string;
  shadhiliDefault: string;
  globalBanner: string;
}

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/platform`;
  private mutationContext = new HttpContext().set(SKIP_UNAUTHORIZED_REDIRECT, true);

  getStats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${this.base}/stats`);
  }

  getDashboard(): Observable<PlatformDashboard> {
    return this.http.get<PlatformDashboard>(`${this.base}/dashboard`);
  }

  getUsers(): Observable<PlatformUser[]> {
    return this.http.get<PlatformUser[]>(`${this.base}/users`);
  }

  assignRole(userId: string, role: string): Observable<unknown> {
    return this.http.post(`${this.base}/users/${userId}/roles`, { role });
  }

  removeRole(userId: string, role: string): Observable<unknown> {
    return this.http.delete(`${this.base}/users/${userId}/roles/${encodeURIComponent(role)}`);
  }

  updateUser(userId: string, body: { homeMosqueId?: number | null; clearMosque?: boolean; fullName?: string; email?: string }): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/users/${userId}`, body);
  }

  setUserActive(userId: string, active: boolean): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/users/${userId}/status`, active);
  }

  resetUserPassword(userId: string): Observable<{ message: string; temporaryPassword: string }> {
    return this.http.post<{ message: string; temporaryPassword: string }>(`${this.base}/users/${userId}/reset-password`, {});
  }

  deleteUser(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/users/${userId}`);
  }

  bulkUserAction(body: {
    userIds: string[];
    action: 'assignRole' | 'changeMosque' | 'activate' | 'deactivate' | 'delete';
    role?: string;
    mosqueId?: number | null;
  }): Observable<{ message: string; processed: number; errors: string[] }> {
    return this.http.post<{ message: string; processed: number; errors: string[] }>(`${this.base}/users/bulk`, body);
  }

  getPlatformPendingClaims(): Observable<PendingClaimsResponse> {
    return this.http.get<{
      summary: { pending: number };
      items: Record<string, unknown>[];
    }>(`${this.base}/claims/pending`).pipe(
      map(res => ({
        summary: {
          pending: res.summary.pending,
          rejected: 0,
          claimPendingListings: res.summary.pending,
          pendingReviewListings: 0,
        },
        items: (res.items ?? []).map(i => this.mapPlatformClaimItem(i)),
      })),
    );
  }

  getPlatformClaimDetail(claimId: number): Observable<PlatformClaimDetail> {
    return this.http.get<PlatformClaimDetail>(`${this.base}/claims/${claimId}`);
  }

  approvePlatformClaim(claimId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.base}/claims/${claimId}/approve`,
      {},
      { context: this.mutationContext },
    );
  }

  rejectPlatformClaim(claimId: number, reason: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.base}/claims/${claimId}/reject`,
      { reason },
      { context: this.mutationContext },
    );
  }

  private mapPlatformClaimItem(i: Record<string, unknown>): PendingOwnershipClaim {
    return {
      claimId: Number(i['claimId']),
      claimReference: String(i['claimReference'] ?? ''),
      mosqueId: Number(i['mosqueId']),
      mosqueName: String(i['mosqueName'] ?? ''),
      city: String(i['city'] ?? ''),
      slug: String(i['slug'] ?? ''),
      claimantId: String(i['applicantUserId'] ?? ''),
      claimantName: String(i['requestedBy'] ?? i['applicantName'] ?? ''),
      claimantEmail: i['applicantEmail'] as string | undefined,
      phone: (i['phone'] ?? i['applicantPhone']) as string | undefined,
      position: (i['role'] ?? i['position']) as string | undefined,
      reason: i['reason'] as string | undefined,
      documentUrl: i['proofDocumentUrl'] as string | undefined,
      documents: i['documents'] as { label: string; url: string }[] | undefined,
      status: String(i['status'] ?? 'Pending'),
      mosqueStatus: String(i['mosqueStatus'] ?? ''),
      submittedAt: String(i['submittedAt'] ?? i['submittedDate'] ?? ''),
    };
  }

  getPendingClaims(status: 'Pending' | 'Approved' | 'Rejected' | 'All' = 'Pending'): Observable<PendingClaimsResponse> {
    const params: Record<string, string> = {};
    if (status !== 'All') {
      params['status'] = status;
    }

    return this.http.get<{
      summary: PendingClaimsSummary;
      items: {
        claimId: number;
        mosqueId: number;
        mosqueName: string;
        city: string;
        slug: string;
        applicantUserId: string;
        applicantName: string;
        applicantEmail?: string;
        applicantPhone?: string;
        claimantPhone?: string;
        phone?: string;
        fullName?: string;
        position?: string;
        organization?: string;
        relationshipToMosque?: string;
        yearsAssociated?: number;
        claimReference?: string;
        reason?: string;
        proofDocumentUrl?: string;
        documents?: { label: string; url: string }[];
        status: string;
        mosqueStatus: string;
        submittedDate: string;
      }[];
    }>(`${environment.apiUrl}/admin/claims`, { params }).pipe(
      map(res => ({
        summary: {
          pending: res.summary.pending,
          approved: res.summary.approved ?? 0,
          rejected: res.summary.rejected,
          claimPendingListings: res.summary.claimPendingListings ?? 0,
          pendingReviewListings: res.summary.pendingReviewListings ?? 0,
        },
        items: res.items.map(i => ({
          claimId: i.claimId,
          claimReference: i.claimReference,
          mosqueId: i.mosqueId,
          mosqueName: i.mosqueName,
          city: i.city,
          slug: i.slug,
          claimantId: i.applicantUserId,
          claimantName: i.applicantName,
          claimantEmail: i.applicantEmail,
          fullName: i.fullName,
          phone: i.applicantPhone ?? i.claimantPhone ?? i.phone,
          position: i.position,
          organization: i.organization,
          relationshipToMosque: i.relationshipToMosque,
          yearsAssociated: i.yearsAssociated,
          reason: i.reason,
          documentUrl: i.proofDocumentUrl,
          documents: i.documents,
          status: i.status,
          mosqueStatus: i.mosqueStatus,
          submittedAt: i.submittedDate,
        })),
      }))
    );
  }

  approveClaim(mosqueId: number): Observable<Mosque> {
    return this.http.post<Mosque>(
      `${environment.apiUrl}/mosque/${mosqueId}/approve`,
      { mode: 'approveOnly' },
      { context: this.mutationContext }
    );
  }

  /** Claim-id based approve (Phase 3 alias). */
  approveClaimById(claimId: number): Observable<Mosque> {
    return this.http.post<Mosque>(
      `${environment.apiUrl}/claims/${claimId}/approve`,
      { mode: 'approveOnly' },
      { context: this.mutationContext }
    );
  }

  approveAndActivateClaim(mosqueId: number): Observable<{ mosque: Mosque; message?: string; activated?: boolean }> {
    return this.http.post<{ mosque: Mosque; message?: string; activated?: boolean }>(
      `${environment.apiUrl}/mosque/${mosqueId}/approve`,
      { mode: 'approveAndActivate' },
      { context: this.mutationContext }
    );
  }

  approveAndActivateClaimById(claimId: number): Observable<{ mosque: Mosque; message?: string; activated?: boolean }> {
    return this.http.post<{ mosque: Mosque; message?: string; activated?: boolean }>(
      `${environment.apiUrl}/claims/${claimId}/activate`,
      {},
      { context: this.mutationContext }
    );
  }

  activateMosque(mosqueId: number): Observable<Mosque> {
    return this.http.post<Mosque>(
      `${this.base}/mosques/${mosqueId}/activate`,
      {},
      { context: this.mutationContext }
    );
  }

  deactivateMosque(mosqueId: number): Observable<Mosque> {
    return this.http.post<Mosque>(
      `${this.base}/mosques/${mosqueId}/deactivate`,
      {},
      { context: this.mutationContext }
    );
  }

  rejectClaim(mosqueId: number, reason: string): Observable<unknown> {
    return this.http.post(
      `${environment.apiUrl}/mosque/${mosqueId}/reject`,
      { reason },
      { context: this.mutationContext }
    );
  }

  rejectClaimById(claimId: number, reason: string): Observable<unknown> {
    return this.http.post(
      `${environment.apiUrl}/claims/${claimId}/reject`,
      { reason },
      { context: this.mutationContext }
    );
  }

  updateClaim(claimId: number, payload: {
    fullName?: string;
    phone?: string;
    position?: string;
    organization?: string;
    relationshipToMosque?: string;
    yearsAssociated?: number;
    reason?: string;
  }): Observable<PendingOwnershipClaim> {
    return this.http.put<PendingOwnershipClaim>(
      `${environment.apiUrl}/admin/claims/${claimId}`,
      {
        fullName: payload.fullName,
        phone: payload.phone,
        position: payload.position,
        organization: payload.organization,
        relationshipToMosque: payload.relationshipToMosque,
        yearsAssociated: payload.yearsAssociated,
        reason: payload.reason,
      },
      { context: this.mutationContext }
    );
  }

  deleteClaim(claimId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${environment.apiUrl}/admin/claims/${claimId}`,
      { context: this.mutationContext }
    );
  }

  assignMosqueAdmin(mosqueId: number, userId: string, setAsOwner = false): Observable<unknown> {
    return this.http.post(`${this.base}/mosques/${mosqueId}/assign-admin`, { userId, setAsOwner });
  }

  removeMosqueAdmin(mosqueId: number, userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/mosques/${mosqueId}/admins/${userId}`);
  }

  seedMosque(mosque: Partial<Mosque>): Observable<Mosque> {
    return this.http.post<Mosque>(`${this.base}/mosques`, mosque);
  }

  checkMosqueSlug(slug: string): Observable<{ available: boolean; slug: string }> {
    return this.http.get<{ available: boolean; slug: string }>(`${this.base}/mosques/check-slug`, {
      params: { slug },
    });
  }

  /** @deprecated Use seedMosque — kept for compatibility */
  seedMosqueLegacy(mosque: Partial<Mosque>): Observable<Mosque> {
    return this.http.post<Mosque>(`${this.base}/mosques/seed`, mosque);
  }

  getMosqueListings(params?: { q?: string; status?: string; duplicatesOnly?: boolean; missingOwner?: boolean; sort?: string }): Observable<MosqueListingsResponse> {
    const p: Record<string, string> = {};
    if (params?.q) p['q'] = params.q;
    if (params?.status) p['status'] = params.status;
    if (params?.duplicatesOnly) p['duplicatesOnly'] = 'true';
    if (params?.missingOwner) p['missingOwner'] = 'true';
    if (params?.sort) p['sort'] = params.sort;
    return this.http.get<MosqueListingsResponse>(`${this.base}/mosques/listings`, { params: p });
  }

  getMosqueDetail(id: number): Observable<MosqueDetailResponse> {
    return this.http.get<MosqueDetailResponse>(`${this.base}/mosques/${id}/detail`);
  }

  updateMosque(id: number, payload: UpdateMosquePayload): Observable<Mosque> {
    return this.http.put<Mosque>(`${environment.apiUrl}/mosque/${id}`, payload);
  }

  bulkMosqueStatus(ids: number[], status: string): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(`${this.base}/mosques/bulk`, { ids, status });
  }

  getMosqueSnapshot(id: number): Observable<MosqueSnapshot> {
    return this.http.get<MosqueSnapshot>(`${this.base}/mosques/${id}/snapshot`);
  }

  getAuditLogs(limit = 100): Observable<AuditLogEntry[]> {
    return this.http.get<AuditLogEntry[]>(`${this.base}/audit-logs`, { params: { limit: limit.toString() } });
  }

  getRoleMonitor(from?: string, to?: string, auditLimit = 50): Observable<RoleMonitorData> {
    const params: Record<string, string> = { auditLimit: auditLimit.toString() };
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<RoleMonitorData>(`${this.base}/role-monitor`, { params });
  }

  getPlatformSettings(): Observable<PlatformSettings> {
    return this.http.get<PlatformSettings>(`${this.base}/settings`);
  }

  saveTariqaMapping(baAlawiDefault: string, shadhiliDefault: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/settings/tariqa`, { baAlawiDefault, shadhiliDefault });
  }

  saveGlobalBanner(text: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/settings/banner`, { text });
  }
}
