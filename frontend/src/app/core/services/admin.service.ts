import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Announcement, JanazaAnnouncement, Mosque, MosqueEvent, MosqueSetting, ParticipationOpportunity, PrayerTimesDaily } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;
  private mosqueId = environment.defaultMosqueId;

  // Super Admin — mosques
  getAllMosques(): Observable<Mosque[]> {
    return this.http.get<Mosque[]>(`${this.base}/mosques`);
  }

  createMosque(mosque: Partial<Mosque>): Observable<Mosque> {
    return this.http.post<Mosque>(`${this.base}/mosques`, mosque);
  }

  verifyMosque(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/mosques/${id}/verify`, {});
  }

  claimMosque(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/mosques/${id}/claim`, {});
  }

  updateMosque(id: number, mosque: Partial<Mosque>): Observable<Mosque> {
    return this.http.put<Mosque>(`${this.base}/mosques/${id}`, mosque);
  }

  assignStaff(mosqueId: number, email: string, role: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/mosques/${mosqueId}/assign-staff`, { email, role });
  }

  addJumuahSlot(mosqueId: number, slot: { slotNumber: number; jamaatTime: string }): Observable<unknown> {
    return this.http.post(`${this.base}/mosques/${mosqueId}/prayer-times/jumuah`, slot);
  }

  deleteJumuahSlot(mosqueId: number, slotId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/mosques/${mosqueId}/prayer-times/jumuah/${slotId}`);
  }

  getSettings(mosqueId = this.mosqueId): Observable<MosqueSetting[]> {
    return this.http.get<MosqueSetting[]>(`${this.base}/mosques/${mosqueId}/settings`);
  }

  setModuleFlag(mosqueId: number, moduleKey: string, enabled: boolean): Observable<MosqueSetting> {
    return this.http.put<MosqueSetting>(
      `${this.base}/mosques/${mosqueId}/settings/${moduleKey}?enabled=${enabled}`, {}
    );
  }

  // Prayer times admin
  upsertPrayerTimes(mosqueId: number, data: Partial<PrayerTimesDaily>): Observable<PrayerTimesDaily> {
    return this.http.put<PrayerTimesDaily>(`${this.base}/mosques/${mosqueId}/prayer-times/daily`, data);
  }

  // Announcements admin
  createAnnouncement(mosqueId: number, data: Partial<Announcement>): Observable<Announcement> {
    return this.http.post<Announcement>(`${this.base}/mosques/${mosqueId}/announcements`, data);
  }

  publishAnnouncement(mosqueId: number, id: number): Observable<Announcement> {
    return this.http.post<Announcement>(`${this.base}/mosques/${mosqueId}/announcements/${id}/publish`, {});
  }

  deleteAnnouncement(mosqueId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/mosques/${mosqueId}/announcements/${id}`);
  }

  // Events admin
  createEvent(mosqueId: number, data: Partial<MosqueEvent>): Observable<MosqueEvent> {
    return this.http.post<MosqueEvent>(`${this.base}/mosques/${mosqueId}/events`, data);
  }

  deleteEvent(mosqueId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/mosques/${mosqueId}/events/${id}`);
  }

  // Janaza
  createJanaza(mosqueId: number, data: Partial<JanazaAnnouncement>): Observable<JanazaAnnouncement> {
    return this.http.post<JanazaAnnouncement>(`${this.base}/mosques/${mosqueId}/janaza`, data);
  }

  // Participation
  createParticipation(mosqueId: number, data: Partial<ParticipationOpportunity>): Observable<ParticipationOpportunity> {
    return this.http.post<ParticipationOpportunity>(`${this.base}/mosques/${mosqueId}/participation`, data);
  }

  // Communities
  createCommunity(data: { name: string; type: string; description?: string; mosqueId?: number; isPublic: boolean }): Observable<unknown> {
    return this.http.post(`${this.base}/communities`, data);
  }
}
