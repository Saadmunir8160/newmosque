import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MuridSummary {
  userId: string;
  fullName: string;
  email?: string;
  communities: { name: string; role: string }[];
  gatheringsAttended: number;
  gatheringsTotal: number;
  wirdCompleted: number;
  wirdTotal: number;
  quranParasCompleted: number;
  deathReadingsCompleted: number;
  deathReadingsTotal: number;
}

export interface TariqaCommunity {
  id: number;
  name: string;
  description?: string;
  mosqueId?: number;
  isPublic?: boolean;
  memberCount: number;
}

export interface CommunityMemberRow {
  id: number;
  userId: string;
  fullName: string;
  email?: string;
  role: string;
}

export interface GuidanceNote {
  id: number;
  communityId: number;
  muridUserId: string;
  type: 'Note' | 'FollowUp' | 'Recommendation';
  content: string;
  followUpDate?: string;
  isCompleted: boolean;
  createdAt: string;
  murid?: { fullName?: string };
}

export interface CommunityGathering {
  id: number;
  communityId: number;
  title: string;
  description?: string;
  gatheringType: 'DhikrGathering' | 'SpiritualProgram';
  date: string;
  startTime?: string;
  location?: string;
  attendance?: { userId: string; status: string; user?: { fullName?: string } }[];
}

export interface MuqaddamDashboard {
  assignedCommunities: number;
  totalMurids: number;
  upcomingGatherings: number;
  pendingFollowUps: number;
  participationRate: number;
  recentActivity: { type: string; title: string; detail?: string; at: string }[];
}

export interface MuqaddamReport {
  reportType: string;
  generatedAt: string;
  rows: { label: string; category?: string; value: number; detail?: string }[];
  summary: { totalRows: number; totalValue: number };
}

@Injectable({ providedIn: 'root' })
export class MuqaddamService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/muqaddam`;

  getDashboard(mosqueId?: number): Observable<MuqaddamDashboard> {
    const params = mosqueId ? { mosqueId: mosqueId.toString() } : undefined;
    return this.http.get<MuqaddamDashboard>(`${this.base}/dashboard`, { params });
  }

  getMurids(mosqueId?: number, search?: string): Observable<MuridSummary[]> {
    const params: Record<string, string> = {};
    if (mosqueId) params['mosqueId'] = mosqueId.toString();
    if (search?.trim()) params['search'] = search.trim();
    return this.http.get<MuridSummary[]>(`${this.base}/murids`, { params });
  }

  getCommunities(mosqueId?: number, search?: string): Observable<TariqaCommunity[]> {
    const params: Record<string, string> = {};
    if (mosqueId) params['mosqueId'] = mosqueId.toString();
    if (search?.trim()) params['search'] = search.trim();
    return this.http.get<TariqaCommunity[]>(`${this.base}/communities`, { params });
  }

  createCommunity(body: { name: string; description?: string; mosqueId?: number; isPublic?: boolean }): Observable<TariqaCommunity> {
    return this.http.post<TariqaCommunity>(`${this.base}/communities`, body);
  }

  updateCommunity(id: number, body: { name?: string; description?: string; isPublic?: boolean }): Observable<TariqaCommunity> {
    return this.http.put<TariqaCommunity>(`${this.base}/communities/${id}`, body);
  }

  getMembers(communityId: number): Observable<CommunityMemberRow[]> {
    return this.http.get<CommunityMemberRow[]>(`${this.base}/communities/${communityId}/members`);
  }

  addMember(communityId: number, email: string, role = 'Member'): Observable<unknown> {
    return this.http.post(`${this.base}/communities/${communityId}/members`, { email, role });
  }

  removeMember(communityId: number, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/communities/${communityId}/members/${userId}`);
  }

  getGuidanceNotes(communityId?: number, type?: string, search?: string): Observable<GuidanceNote[]> {
    const params: Record<string, string> = {};
    if (communityId) params['communityId'] = communityId.toString();
    if (type) params['type'] = type;
    if (search?.trim()) params['search'] = search.trim();
    return this.http.get<GuidanceNote[]>(`${this.base}/guidance-notes`, { params });
  }

  createGuidanceNote(body: {
    communityId: number;
    muridUserId: string;
    type: string;
    content: string;
    followUpDate?: string;
  }): Observable<GuidanceNote> {
    return this.http.post<GuidanceNote>(`${this.base}/guidance-notes`, body);
  }

  completeFollowUp(noteId: number): Observable<GuidanceNote> {
    return this.http.patch<GuidanceNote>(`${this.base}/guidance-notes/${noteId}/complete`, {});
  }

  getGatherings(communityId: number, type?: string): Observable<CommunityGathering[]> {
    const params = type ? { type } : undefined;
    return this.http.get<CommunityGathering[]>(`${this.base}/communities/${communityId}/gatherings`, { params });
  }

  createGathering(communityId: number, body: {
    title: string;
    description?: string;
    gatheringType: string;
    date: string;
    startTime?: string;
    location?: string;
  }): Observable<CommunityGathering> {
    return this.http.post<CommunityGathering>(`${this.base}/communities/${communityId}/gatherings`, body);
  }

  recordAttendance(gatheringId: number, records: { userId: string; status: string }[]): Observable<unknown> {
    return this.http.post(`${this.base}/gatherings/${gatheringId}/attendance`, records);
  }

  getReports(type: 'participation' | 'attendance', mosqueId?: number): Observable<MuqaddamReport> {
    const params: Record<string, string> = { type };
    if (mosqueId) params['mosqueId'] = mosqueId.toString();
    return this.http.get<MuqaddamReport>(`${this.base}/reports`, { params });
  }
}
