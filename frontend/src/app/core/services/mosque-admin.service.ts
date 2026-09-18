import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MosqueAdminStats {
  totalMembers: number;
  totalStudents: number;
  totalTeachers: number;
  upcomingEvents: number;
  activeCommunities: number;
  pendingParticipationRequests: number;
  activeAnnouncements: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface MosqueAdminDashboard {
  mosqueId: number;
  mosqueName: string;
  syncedAt: string;
  stats: MosqueAdminStats;
  charts: {
    monthlyAttendance: ChartPoint[];
    eventParticipation: ChartPoint[];
    studentGrowth: ChartPoint[];
    feeCollection: ChartPoint[];
  };
  recentActivity: { type: string; title: string; detail?: string; at: string }[];
  todayPrayer?: {
    fajr?: string;
    dhuhr?: string;
    asr?: string;
    maghrib?: string;
    isha?: string;
  };
}

export interface MosqueAdminUser {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  phone?: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
}

export interface MosqueAdminReport {
  reportType: string;
  generatedAt: string;
  rows: { label: string; category?: string; value: number; detail?: string; date?: string }[];
  summary: { totalRows: number; totalValue: number };
}

export interface PendingParticipation {
  id: number;
  opportunityId: number;
  opportunityTitle: string;
  userId: string;
  userName: string;
  registeredAt: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class MosqueAdminService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getDashboard(mosqueId: number): Observable<MosqueAdminDashboard> {
    return this.http.get<MosqueAdminDashboard>(`${this.base}/mosques/${mosqueId}/admin/dashboard`);
  }

  getUsers(mosqueId: number, category?: string, search?: string, activeOnly?: boolean): Observable<MosqueAdminUser[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    if (search) params = params.set('search', search);
    if (activeOnly) params = params.set('activeOnly', 'true');
    return this.http.get<MosqueAdminUser[]>(`${this.base}/mosques/${mosqueId}/admin/users`, { params });
  }

  bulkUserAction(mosqueId: number, req: { userIds: string[], action: string, role?: string }): Observable<any> {
    return this.http.post<any>(`${this.base}/mosques/${mosqueId}/admin/users/bulk`, req);
  }

  createUser(mosqueId: number, body: {
    email: string;
    fullName: string;
    phone?: string;
    role: string;
    password: string;
  }): Observable<MosqueAdminUser> {
    return this.http.post<MosqueAdminUser>(`${this.base}/mosques/${mosqueId}/admin/users`, body);
  }

  updateUser(mosqueId: number, userId: string, body: { fullName?: string; phone?: string; email?: string }): Observable<MosqueAdminUser> {
    return this.http.put<MosqueAdminUser>(`${this.base}/mosques/${mosqueId}/admin/users/${userId}`, body);
  }

  setUserActive(mosqueId: number, userId: string, active: boolean): Observable<MosqueAdminUser> {
    return this.http.patch<MosqueAdminUser>(`${this.base}/mosques/${mosqueId}/admin/users/${userId}/active`, { active });
  }

  getPendingParticipation(mosqueId: number): Observable<PendingParticipation[]> {
    return this.http.get<PendingParticipation[]>(`${this.base}/mosques/${mosqueId}/admin/participation/pending`);
  }

  updateParticipationStatus(mosqueId: number, registrationId: number, status: string): Observable<unknown> {
    return this.http.patch(`${this.base}/mosques/${mosqueId}/admin/participation/registrations/${registrationId}`, { status });
  }

  getReport(mosqueId: number, type: string, from?: string, to?: string): Observable<MosqueAdminReport> {
    const params = new URLSearchParams({ type });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return this.http.get<MosqueAdminReport>(`${this.base}/mosques/${mosqueId}/admin/reports?${params}`);
  }
}
