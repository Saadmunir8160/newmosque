import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MemberProgressSummary {
  wirdCompletedToday: number;
  adhkarCompletedToday: number;
  quranParasCompleted: number;
  eventsRegistered: number;
  communitiesJoined: number;
  participationRegistered: number;
}

export interface MemberNotificationItem {
  type: string;
  title: string;
  message?: string;
  route?: string;
  at?: string;
}

export interface MemberDashboardResponse {
  mosqueId: number;
  mosqueName: string;
  progress: MemberProgressSummary;
  notifications: MemberNotificationItem[];
}

export interface EventRegistrationDto {
  id: number;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  status: string;
  registeredAt: string;
}

export interface ReadingAllocationMine {
  id: number;
  campaignId: number;
  deceasedName: string;
  description: string;
  type: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class MemberService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getDashboard(mosqueId: number): Observable<MemberDashboardResponse> {
    return this.http.get<MemberDashboardResponse>(`${this.base}/member/dashboard`, {
      params: { mosqueId: mosqueId.toString() },
    });
  }

  getMyReadingAllocations(mosqueId: number): Observable<ReadingAllocationMine[]> {
    return this.http.get<ReadingAllocationMine[]>(`${this.base}/member/reading-allocations`, {
      params: { mosqueId: mosqueId.toString() },
    });
  }
}
