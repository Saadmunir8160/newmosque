import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Announcement, JanazaAnnouncement, JumuahTime, Mosque,
  MosqueEvent, ParticipationOpportunity, PrayerTimesDaily, ReadingCampaign
} from '../models';

@Injectable({ providedIn: 'root' })
export class MosqueService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMosques(city?: string): Observable<Mosque[]> {
    const params = city ? { city } : undefined;
    return this.http.get<Mosque[]>(`${this.base}/mosques`, { params });
  }

  getBySlug(slug: string): Observable<Mosque> {
    return this.http.get<Mosque>(`${this.base}/mosques/${slug}`);
  }

  getDailyPrayerTimes(mosqueId: number, date?: string): Observable<{ times: PrayerTimesDaily; exceptions: unknown[] }> {
    const params = date ? { date } : undefined;
    return this.http.get<{ times: PrayerTimesDaily; exceptions: unknown[] }>(
      `${this.base}/mosques/${mosqueId}/prayer-times/daily`, { params }
    );
  }

  getJumuahTimes(mosqueId: number): Observable<JumuahTime[]> {
    return this.http.get<JumuahTime[]>(`${this.base}/mosques/${mosqueId}/prayer-times/jumuah`);
  }

  getAnnouncements(mosqueId: number, all = false): Observable<Announcement[]> {
    const params = all ? { all: 'true' } : undefined;
    return this.http.get<Announcement[]>(`${this.base}/mosques/${mosqueId}/announcements`, { params });
  }

  getEvents(mosqueId: number): Observable<MosqueEvent[]> {
    return this.http.get<MosqueEvent[]>(`${this.base}/mosques/${mosqueId}/events`);
  }

  getJanaza(mosqueId: number): Observable<JanazaAnnouncement[]> {
    return this.http.get<JanazaAnnouncement[]>(`${this.base}/mosques/${mosqueId}/janaza`);
  }

  getParticipation(mosqueId: number): Observable<ParticipationOpportunity[]> {
    return this.http.get<ParticipationOpportunity[]>(`${this.base}/mosques/${mosqueId}/participation`);
  }

  getReadingCampaigns(mosqueId: number): Observable<ReadingCampaign[]> {
    return this.http.get<ReadingCampaign[]>(`${this.base}/mosques/${mosqueId}/reading-campaigns`);
  }
}
