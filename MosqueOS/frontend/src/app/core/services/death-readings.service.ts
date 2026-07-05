import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DeathReadingMonitor {
  campaignId: number;
  title: string;
  deceasedName: string;
  isActive: boolean;
  isArchived: boolean;
  targetReadings: number;
  completedReadings: number;
  remainingReadings: number;
  completionPercent: number;
  activeContributors: number;
  topContributors: { userId: string; name: string; initials: string; readingCount: number; rank: number }[];
  recentActivity: { userName: string; readingCount: number; at: string }[];
  groupProgress: { region: string; completed: number; target: number; percent: number }[];
}

@Injectable({ providedIn: 'root' })
export class DeathReadingsService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMonitor(mosqueId: number, from?: string, to?: string): Observable<DeathReadingMonitor> {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<DeathReadingMonitor>(`${this.base}/mosques/${mosqueId}/reading-campaigns/monitor`, { params });
  }

  updateTarget(mosqueId: number, campaignId: number, targetReadings: number): Observable<{ targetReadings: number }> {
    return this.http.put<{ targetReadings: number }>(
      `${this.base}/mosques/${mosqueId}/reading-campaigns/${campaignId}/target`,
      { targetReadings }
    );
  }

  archive(mosqueId: number, campaignId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.base}/mosques/${mosqueId}/reading-campaigns/${campaignId}/archive`, {}
    );
  }

  reset(mosqueId: number, campaignId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.base}/mosques/${mosqueId}/reading-campaigns/${campaignId}/reset`, {}
    );
  }

  exportUrl(mosqueId: number, campaignId: number): string {
    return `${this.base}/mosques/${mosqueId}/reading-campaigns/${campaignId}/export`;
  }
}
