import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Announcement, Dua, JanazaAnnouncement, Mosque, MosqueEvent, PrayerTimesDaily, JumuahTime } from '../models';
import { AdhkarItem, RitualGuide, RitualGuideDetail, JourneyGuide, JourneyGuideDetail, Community } from './content.service';

export interface PublicHome {
  mosque: Mosque | null;
  announcements: Announcement[];
  upcomingEvents: MosqueEvent[];
  todayPrayerTimes: PrayerTimesDaily | null;
}

export interface PublicMonthlyPrayer {
  year: number;
  month: number;
  days: PrayerTimesDaily[];
}

@Injectable({ providedIn: 'root' })
export class GuestService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/public`;
  readonly defaultMosqueId = environment.defaultMosqueId;

  getHome(mosqueId = this.defaultMosqueId): Observable<PublicHome> {
    return this.http.get<PublicHome>(`${this.base}/home`, { params: { mosqueId } });
  }

  getMosque(mosqueId: number): Observable<Mosque> {
    return this.http.get<Mosque>(`${this.base}/mosques/${mosqueId}`);
  }

  getMosqueBySlug(slug: string): Observable<Mosque> {
    return this.http.get<Mosque>(`${environment.apiUrl}/mosques/${slug}`);
  }

  getDailyPrayer(mosqueId: number, date?: string): Observable<{ date: string; times: PrayerTimesDaily; jumuah: JumuahTime[] }> {
    const params = date ? { date } : undefined;
    return this.http.get<{ date: string; times: PrayerTimesDaily; jumuah: JumuahTime[] }>(
      `${this.base}/mosques/${mosqueId}/prayer-times/daily`, { params }
    );
  }

  getMonthlyPrayer(mosqueId: number, year?: number, month?: number): Observable<PublicMonthlyPrayer> {
    const params: Record<string, string> = {};
    if (year) params['year'] = String(year);
    if (month) params['month'] = String(month);
    return this.http.get<PublicMonthlyPrayer>(`${this.base}/mosques/${mosqueId}/prayer-times/monthly`, { params });
  }

  getAnnouncements(mosqueId: number, search?: string): Observable<Announcement[]> {
    const params = search?.trim() ? { search: search.trim() } : undefined;
    return this.http.get<Announcement[]>(`${this.base}/mosques/${mosqueId}/announcements`, { params });
  }

  getAnnouncement(mosqueId: number, id: number): Observable<Announcement> {
    return this.http.get<Announcement>(`${this.base}/mosques/${mosqueId}/announcements/${id}`);
  }

  getEvents(mosqueId: number, search?: string, upcomingOnly = true): Observable<MosqueEvent[]> {
    const params: Record<string, string> = { upcomingOnly: String(upcomingOnly) };
    if (search?.trim()) params['search'] = search.trim();
    return this.http.get<MosqueEvent[]>(`${this.base}/mosques/${mosqueId}/events`, { params });
  }

  getEvent(mosqueId: number, eventId: number): Observable<MosqueEvent> {
    return this.http.get<MosqueEvent>(`${this.base}/mosques/${mosqueId}/events/${eventId}`);
  }

  getJanaza(mosqueId: number, activeOnly = true): Observable<JanazaAnnouncement[]> {
    return this.http.get<JanazaAnnouncement[]>(`${this.base}/mosques/${mosqueId}/janaza`, {
      params: { activeOnly: String(activeOnly) },
    });
  }

  getCommunities(mosqueId?: number, search?: string): Observable<Community[]> {
    const params: Record<string, string> = {};
    if (mosqueId) params['mosqueId'] = String(mosqueId);
    if (search?.trim()) params['search'] = search.trim();
    return this.http.get<Community[]>(`${this.base}/communities`, { params });
  }

  getDuas(category?: string): Observable<Dua[]> {
    const params = category ? { category } : undefined;
    return this.http.get<Dua[]>(`${this.base}/duas`, { params });
  }

  getDuaCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/duas/categories`);
  }

  getAdhkar(category?: string): Observable<AdhkarItem[]> {
    const params = category ? { category } : undefined;
    return this.http.get<AdhkarItem[]>(`${this.base}/adhkar`, { params });
  }

  getRitualGuides(type?: string): Observable<RitualGuide[]> {
    const params = type ? { type } : undefined;
    return this.http.get<RitualGuide[]>(`${this.base}/ritual-guides`, { params });
  }

  getRitualGuide(id: number): Observable<RitualGuideDetail> {
    return this.http.get<RitualGuideDetail>(`${this.base}/ritual-guides/${id}`);
  }

  getJourneyGuides(type?: string): Observable<JourneyGuide[]> {
    const params = type ? { type } : undefined;
    return this.http.get<JourneyGuide[]>(`${this.base}/journey-guides`, { params });
  }

  getJourneyGuide(id: number): Observable<JourneyGuideDetail> {
    return this.http.get<JourneyGuideDetail>(`${this.base}/journey-guides/${id}`);
  }
}
