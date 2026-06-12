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

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/platform`;

  getStats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${this.base}/stats`);
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

  getMosqueSnapshot(id: number): Observable<MosqueSnapshot> {
    return this.http.get<MosqueSnapshot>(`${this.base}/mosques/${id}/snapshot`);
  }

  getAuditLogs(limit = 100): Observable<AuditLogEntry[]> {
    return this.http.get<AuditLogEntry[]>(`${this.base}/audit-logs`, { params: { limit: limit.toString() } });
  }
}
