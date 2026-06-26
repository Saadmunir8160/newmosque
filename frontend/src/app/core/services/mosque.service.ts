import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Announcement, JanazaAnnouncement, JumuahTime, Mosque,
  MosqueEvent, ParticipationOpportunity, PrayerTimesDaily, ReadingCampaign, MosqueSetting
} from '../models';

interface EventRegistrationRow {
  id: number;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  status: string;
  registeredAt: string;
}

@Injectable({ providedIn: 'root' })
export class MosqueService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMosques(city?: string): Observable<Mosque[]> {
    const params = city ? { city } : undefined;
    return this.http.get<Mosque[]>(`${this.base}/mosques`, { params });
  }

  getPublicBySlug(slug: string): Observable<Mosque> {
    return this.http.get<Mosque>(`${this.base}/mosques/${slug}`);
  }

  getBySlug(slug: string): Observable<Mosque> {
    return this.http.get<Mosque>(`${this.base}/mosques/slug/${slug}`);
  }

  getBySlugPath(slug: string): Observable<Mosque> {
    return this.http.get<Mosque>(`${this.base}/mosques/slug/${slug}`);
  }

  getById(id: number): Observable<Mosque> {
    return this.http.get<Mosque>(`${this.base}/mosques/${id}`);
  }

  getFeatures(mosqueId: number): Observable<MosqueSetting[]> {
    return this.http.get<MosqueSetting[]>(`${this.base}/mosques/${mosqueId}/features`);
  }

  getDailyPrayerTimes(mosqueId: number, date?: string): Observable<{ times: PrayerTimesDaily | null; exceptions: unknown[] }> {
    const params = date ? { date } : undefined;
    return this.http.get<{ times: PrayerTimesDaily | null; exceptions: unknown[] }>(
      `${this.base}/mosques/${mosqueId}/prayer-times/daily`, { params }
    );
  }

  getJumuahTimes(mosqueId: number): Observable<JumuahTime[]> {
    return this.http.get<JumuahTime[]>(`${this.base}/mosques/${mosqueId}/prayer-times/jumuah`);
  }

  getAnnouncements(mosqueId: number, all = false, search?: string, status?: string): Observable<Announcement[]> {
    const params: Record<string, string> = {};
    if (all) params['all'] = 'true';
    if (search?.trim()) params['search'] = search.trim();
    if (status) params['status'] = status;
    return this.http.get<Announcement[]>(`${this.base}/mosques/${mosqueId}/announcements`, { params });
  }

  getEvents(mosqueId: number, search?: string, type?: string, upcomingOnly = true, status?: string): Observable<MosqueEvent[]> {
    const params: Record<string, string> = { upcomingOnly: String(upcomingOnly) };
    if (search?.trim()) params['search'] = search.trim();
    if (type) params['type'] = type;
    if (status) params['status'] = status;
    return this.http.get<MosqueEvent[]>(`${this.base}/mosques/${mosqueId}/events`, { params });
  }

  getMyEventRegistrations(mosqueId: number): Observable<number[]> {
    return this.http.get<EventRegistrationRow[]>(`${this.base}/mosques/${mosqueId}/events/mine/registrations`)
      .pipe(map(rows => rows.map(r => r.eventId)));
  }

  registerForEvent(mosqueId: number, eventId: number): Observable<unknown> {
    return this.http.post(`${this.base}/mosques/${mosqueId}/events/${eventId}/register`, {});
  }

  cancelEventRegistration(mosqueId: number, eventId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/mosques/${mosqueId}/events/${eventId}/register`);
  }

  getJanaza(mosqueId: number, search?: string): Observable<JanazaAnnouncement[]> {
    const params = search?.trim() ? { search: search.trim() } : undefined;
    return this.http.get<JanazaAnnouncement[]>(`${this.base}/mosques/${mosqueId}/janaza`, { params });
  }

  getParticipation(mosqueId: number): Observable<ParticipationOpportunity[]> {
    return this.http.get<ParticipationOpportunity[]>(`${this.base}/mosques/${mosqueId}/participation`);
  }

  getMyParticipationIds(mosqueId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.base}/mosques/${mosqueId}/participation/mine`);
  }

  registerParticipation(mosqueId: number, opportunityId: number): Observable<unknown> {
    return this.http.post(`${this.base}/mosques/${mosqueId}/participation/${opportunityId}/register`, {});
  }

  getReadingCampaigns(mosqueId: number): Observable<ReadingCampaign[]> {
    return this.http.get<ReadingCampaign[]>(`${this.base}/mosques/${mosqueId}/reading-campaigns`);
  }
}
