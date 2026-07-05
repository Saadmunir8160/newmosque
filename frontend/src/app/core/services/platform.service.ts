import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ROLES } from '../constants/roles';
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

export interface MosqueInvitationItem {
  id: number;
  mosqueId: number;
  mosqueName: string;
  mosqueCity: string;
  mosqueStatus: string;
  inviteEmail: string;
  inviteName?: string | null;
  role: string;
  status: string;
  sentAt: string;
  expiresAt: string;
  invitedByName: string;
  acceptedAt?: string | null;
  acceptLink?: string | null;
}

export interface InvitePreview {
  mosqueId: number;
  mosqueName: string;
  mosqueCity: string;
  inviteEmail: string;
  inviteName?: string | null;
  role: string;
  expiresAt: string;
  requiresLogin: boolean;
}

export interface OversightJanazaRow {
  id: number;
  mosqueId: number;
  mosqueName: string;
  mosqueCity: string;
  mosqueStatus: string;
  name: string;
  dateOfDeath: string;
  janazaDate: string;
  janazaTime: string;
  location: string;
  burialLocation?: string | null;
  status: string;
  publishedAt?: string | null;
  createdAt: string;
}

export interface OversightPrayerRow {
  mosqueId: number;
  mosqueName: string;
  mosqueCity: string;
  mosqueStatus: string;
  date: string;
  hasTimes: boolean;
  status: string;
  fajrJamaat?: string | null;
  dhuhrJamaat?: string | null;
  asrJamaat?: string | null;
  maghribJamaat?: string | null;
  ishaJamaat?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

export interface OversightAnnouncementRow {
  id: number;
  mosqueId: number;
  mosqueName: string;
  mosqueCity: string;
  mosqueStatus: string;
  title: string;
  summary: string;
  status: string;
  isFeatured: boolean;
  publishedAt?: string | null;
  createdAt: string;
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

export interface DiscoveryRequestItem {
  id: number;
  createdAt: string;
  actorName: string | null;
  description: string;
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

  // Gap 3 fix: was calling wrong /admin/claims URL. Now correctly uses /platform/claims/pending
  // which is served by AdminClaimsController at api/v1/admin/claims
  getPendingClaims(status: 'Pending' | 'Approved' | 'Rejected' | 'All' = 'Pending'): Observable<PendingClaimsResponse> {
    const params: Record<string, string> = {};
    if (status !== 'All') params['status'] = status;
    return this.http.get<{
      summary: PendingClaimsSummary;
      items: Record<string, unknown>[];
    }>(`${environment.apiUrl}/admin/claims`, { params }).pipe(
      map(res => ({
        summary: {
          pending: res.summary.pending,
          approved: (res.summary as any).approved ?? 0,
          rejected: res.summary.rejected,
          claimPendingListings: res.summary.claimPendingListings ?? 0,
          pendingReviewListings: res.summary.pendingReviewListings ?? 0,
        },
        items: (res.items ?? []).map(i => this.mapPlatformClaimItem(i)),
      }))
    );
  }

  // Gap 4 fix: these methods had wrong URLs pointing to non-existent endpoints.
  // Now all claim approve/reject use the correct /platform/claims/{id}/approve|reject routes.
  approveClaim(claimId: number): Observable<{ success: boolean; message: string; mosque: Mosque }> {
    return this.http.post<{ success: boolean; message: string; mosque: Mosque }>(
      `${this.base}/claims/${claimId}/approve`,
      {},
      { context: this.mutationContext }
    );
  }

  approveClaimById(claimId: number): Observable<{ success: boolean; message: string; mosque: Mosque }> {
    return this.http.post<{ success: boolean; message: string; mosque: Mosque }>(
      `${this.base}/claims/${claimId}/approve`,
      {},
      { context: this.mutationContext }
    );
  }

  approveAndActivateClaim(claimId: number): Observable<{ success: boolean; message: string; mosque: Mosque }> {
    return this.http.post<{ success: boolean; message: string; mosque: Mosque }>(
      `${this.base}/claims/${claimId}/approve`,
      {},
      { context: this.mutationContext }
    );
  }

  approveAndActivateClaimById(claimId: number): Observable<{ success: boolean; message: string; mosque: Mosque }> {
    return this.http.post<{ success: boolean; message: string; mosque: Mosque }>(
      `${this.base}/claims/${claimId}/approve`,
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

  rejectClaim(claimId: number, reason: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.base}/claims/${claimId}/reject`,
      { reason },
      { context: this.mutationContext }
    );
  }

  rejectClaimById(claimId: number, reason: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.base}/claims/${claimId}/reject`,
      { reason },
      { context: this.mutationContext }
    );
  }

  updateClaim(claimId: number, payload: {
    fullName?: string; phone?: string; position?: string;
    organization?: string; relationshipToMosque?: string;
    yearsAssociated?: number; reason?: string;
  }): Observable<PendingOwnershipClaim> {
    // Uses AdminClaimsController — PUT endpoint to be added in Phase 3
    return this.http.put<PendingOwnershipClaim>(
      `${environment.apiUrl}/admin/claims/${claimId}`,
      payload,
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
    return this.http.put<Mosque>(`${this.base}/mosques/${id}`, payload);
  }

  deleteMosque(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base}/mosques/${id}`,
      { context: this.mutationContext },
    );
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

  getDiscoveryRequests(limit = 200): Observable<{ total: number; items: DiscoveryRequestItem[] }> {
    return this.http.get<{ total: number; items: DiscoveryRequestItem[] }>(
      `${this.base}/discovery/requests`,
      { params: { limit: limit.toString() } }
    );
  }

  getInvitations(status?: string): Observable<MosqueInvitationItem[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.http.get<MosqueInvitationItem[]>(`${this.base}/invitations`, { params });
  }

  resendInvitation(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/invitations/${id}/resend`, {});
  }

  revokeInvitation(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/invitations/${id}/revoke`, {});
  }

  sendMosqueInvite(mosqueId: number, payload: { email: string; name?: string; role?: string }): Observable<{
    message: string;
    invitationId: number;
    expiresAt: string;
    inviteEmail?: string;
    acceptLink?: string;
    emailDelivery?: 'smtp' | 'console';
  }> {
    return this.http.post<{
      message: string;
      invitationId: number;
      expiresAt: string;
      inviteEmail?: string;
      acceptLink?: string;
      emailDelivery?: 'smtp' | 'console';
    }>(
      `${environment.apiUrl}/mosques/${mosqueId}/invite`,
      { email: payload.email, name: payload.name, role: payload.role ?? ROLES.MosqueOwner },
      { context: this.mutationContext }
    );
  }

  getOversightJanaza(mosqueId?: number, limit = 200): Observable<OversightJanazaRow[]> {
    const params: Record<string, string> = { limit: String(limit) };
    if (mosqueId) params['mosqueId'] = String(mosqueId);
    return this.http.get<OversightJanazaRow[]>(`${this.base}/oversight/janaza`, { params });
  }

  getOversightPrayerTimes(date?: string, mosqueId?: number): Observable<OversightPrayerRow[]> {
    const params: Record<string, string> = {};
    if (date) params['date'] = date;
    if (mosqueId) params['mosqueId'] = String(mosqueId);
    return this.http.get<OversightPrayerRow[]>(`${this.base}/oversight/prayer-times`, { params });
  }

  getOversightAnnouncements(mosqueId?: number, limit = 200): Observable<OversightAnnouncementRow[]> {
    const params: Record<string, string> = { limit: String(limit) };
    if (mosqueId) params['mosqueId'] = String(mosqueId);
    return this.http.get<OversightAnnouncementRow[]>(`${this.base}/oversight/announcements`, { params });
  }
}
