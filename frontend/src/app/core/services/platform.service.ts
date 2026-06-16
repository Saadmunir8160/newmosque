import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Mosque, MosqueSetting } from '../models';

export interface PlatformStats {
  totalMosques: number;
  activeMosques: number;
  pendingClaims: number;
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
    claimed: number;
    unclaimed: number;
    suspended: number;
    pendingReview?: number;
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
  targetType?: string;
  targetId?: number;
  description: string;
  createdAt: string;
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
  createdAt: string;
  updatedAt?: string;
}

export interface MosqueListingsResponse {
  total: number;
  duplicateCount: number;
  items: MosqueListing[];
}

export interface MosqueDetailResponse {
  mosque: Mosque;
  owner: MosquePerson | null;
  admins: MosquePerson[];
  userCount: number;
  isDuplicate: boolean;
  duplicateReason?: string;
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
  description?: string;
  mapLocation?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  status?: string;
  ownerId?: string;
}

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/platform`;

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

  getPendingClaims(): Observable<Mosque[]> {
    return this.http.get<Mosque[]>(`${this.base}/claims/pending`);
  }

  approveClaim(mosqueId: number): Observable<Mosque> {
    return this.http.post<Mosque>(`${this.base}/mosques/${mosqueId}/approve-claim`, {});
  }

  rejectClaim(mosqueId: number, reason?: string): Observable<unknown> {
    return this.http.post(`${this.base}/mosques/${mosqueId}/reject-claim`, { reason });
  }

  assignMosqueAdmin(mosqueId: number, userId: string, setAsOwner = false): Observable<unknown> {
    return this.http.post(`${this.base}/mosques/${mosqueId}/assign-admin`, { userId, setAsOwner });
  }

  seedMosque(mosque: Partial<Mosque>): Observable<Mosque> {
    return this.http.post<Mosque>(`${this.base}/mosques/seed`, mosque);
  }

  getMosqueListings(params?: { q?: string; status?: string; duplicatesOnly?: boolean }): Observable<MosqueListingsResponse> {
    const p: Record<string, string> = {};
    if (params?.q) p['q'] = params.q;
    if (params?.status) p['status'] = params.status;
    if (params?.duplicatesOnly) p['duplicatesOnly'] = 'true';
    return this.http.get<MosqueListingsResponse>(`${this.base}/mosques/listings`, { params: p });
  }

  getMosqueDetail(id: number): Observable<MosqueDetailResponse> {
    return this.http.get<MosqueDetailResponse>(`${this.base}/mosques/${id}/detail`);
  }

  updateMosque(id: number, payload: UpdateMosquePayload): Observable<Mosque> {
    return this.http.put<Mosque>(`${this.base}/mosques/${id}`, payload);
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
}
