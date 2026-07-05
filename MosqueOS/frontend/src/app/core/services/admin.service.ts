import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SKIP_UNAUTHORIZED_REDIRECT } from '../http/http-context.tokens';
import { Announcement, JanazaAnnouncement, Mosque, MosqueEvent, MosqueSetting, MosqueStaffMember, ParticipationOpportunity, PrayerTimesDaily } from '../models';

export interface PrayerExceptionRow {
  id: number;
  mosqueId: number;
  date: string;
  prayer: string;
  overrideValue: string;
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;
  private mosqueId = environment.defaultMosqueId;
  private mutationContext = new HttpContext().set(SKIP_UNAUTHORIZED_REDIRECT, true);

  // Super Admin — mosques
  getAllMosques(): Observable<Mosque[]> {
    return this.http.get<any>(`${this.base}/mosques`, { params: { adminList: 'true' } }).pipe(
      map(res => Array.isArray(res) ? res : (res?.items ?? []))
    );
  }

  /** Public directory — Active and Unclaimed only. */
  getDirectoryMosques(city?: string): Observable<Mosque[]> {
    const params: Record<string, string> = {};
    if (city) params['city'] = city;
    return this.http.get<any>(`${this.base}/mosques`, { params }).pipe(
      map(res => Array.isArray(res) ? res : (res?.items ?? []))
    );
  }

  createMosque(mosque: Partial<Mosque>): Observable<Mosque> {
    return this.http.post<Mosque>(`${this.base}/mosques`, mosque);
  }

  getOwnerMosque(mosqueId?: number): Observable<{
    mosque: Mosque | null;
    profileCompleteness: number;
    missingFields: string[];
  }> {
    const params: Record<string, string> = {};
    if (mosqueId != null) params['mosqueId'] = String(mosqueId);
    return this.http.get<{
      mosque: Mosque | null;
      profileCompleteness: number;
      missingFields: string[];
    }>(`${this.base}/mosques/my-mosque`, { params, context: this.mutationContext });
  }

  getMyClaims(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/mosques/my-claims`).pipe(
      map(items => (items ?? []).map((c: any) => ({
        ...c,
        reviewStatus: c.reviewStatus ?? c.status ?? 'Pending',
        mosqueStatus: c.mosqueStatus ?? 'Unknown',
      })))
    );
  }

  /** Member/owner submits a new mosque listing for super-admin review. */
  submitNewMosqueListing(body: Partial<Mosque>): Observable<unknown> {
    return this.http.post(`${this.base}/mosques/submit`, body, { context: this.mutationContext });
  }

  submitMosqueForReview(mosqueId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.base}/mosques/${mosqueId}/submit-for-review`,
      {},
      { context: this.mutationContext },
    );
  }

  submitClaim(mosqueId: number, body: Record<string, unknown>): Observable<unknown> {
    return this.http.post(`${this.base}/mosques/${mosqueId}/claim`, body, { context: this.mutationContext });
  }

  submitClaimForm(mosqueId: number, form: FormData): Observable<unknown> {
    return this.http.post(`${this.base}/mosques/${mosqueId}/claim`, form, { context: this.mutationContext });
  }

  getMosqueStaff(mosqueId: number): Observable<MosqueStaffMember[]> {
    return this.http.get<MosqueStaffMember[]>(`${this.base}/mosques/${mosqueId}/staff`);
  }

  removeStaff(mosqueId: number, userId: string, role: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base}/mosques/${mosqueId}/staff?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`
    );
  }

  updateMosque(id: number, mosque: Partial<Mosque>): Observable<Mosque> {
    return this.http.put<Mosque>(`${this.base}/mosques/${id}`, mosque);
  }

  uploadMosqueImage(mosqueId: number, file: File, field: 'logo' | 'banner'): Observable<{ url: string; field: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string; field: string }>(
      `${this.base}/mosques/${mosqueId}/upload-image?field=${field}`, form
    );
  }

  deleteMosqueImage(mosqueId: number, field: 'logo' | 'banner'): Observable<{ message: string; field: string }> {
    return this.http.delete<{ message: string; field: string }>(
      `${this.base}/mosques/${mosqueId}/image?field=${field}`,
      { context: this.mutationContext },
    );
  }

  deleteMosque(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/mosques/${id}`);
  }

  getMosqueById(id: number): Observable<Mosque> {
    return this.http.get<Mosque>(`${this.base}/mosques/${id}`);
  }

  getMosqueModules(mosqueId: number): Observable<MosqueSetting[]> {
    return this.http.get<MosqueSetting[]>(`${this.base}/mosques/${mosqueId}/modules`);
  }

  updateMosqueModules(mosqueId: number, modules: { moduleKey: string; isEnabled: boolean }[]): Observable<MosqueSetting[]> {
    return this.http.put<MosqueSetting[]>(
      `${this.base}/mosques/${mosqueId}/modules`,
      modules.map(m => ({ moduleKey: m.moduleKey, enabled: m.isEnabled })),
    );
  }

  getMosqueFeatures(mosqueId: number): Observable<MosqueSetting[]> {
    return this.http.get<MosqueSetting[]>(`${this.base}/mosques/${mosqueId}/features`);
  }

  updateMosqueFeatures(mosqueId: number, modules: { moduleKey: string; isEnabled: boolean }[]): Observable<MosqueSetting[]> {
    return this.http.put<MosqueSetting[]>(`${this.base}/mosques/${mosqueId}/settings`, { modules });
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

  getPrayerExceptions(mosqueId: number): Observable<PrayerExceptionRow[]> {
    return this.http.get<PrayerExceptionRow[]>(`${this.base}/mosques/${mosqueId}/prayer-times/exceptions`);
  }

  addPrayerException(mosqueId: number, data: Partial<PrayerExceptionRow>): Observable<PrayerExceptionRow> {
    return this.http.post<PrayerExceptionRow>(`${this.base}/mosques/${mosqueId}/prayer-times/exceptions`, data);
  }

  deletePrayerException(mosqueId: number, exceptionId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/mosques/${mosqueId}/prayer-times/exceptions/${exceptionId}`);
  }

  updateAnnouncement(mosqueId: number, id: number, data: Partial<Announcement>): Observable<Announcement> {
    return this.http.put<Announcement>(`${this.base}/mosques/${mosqueId}/announcements/${id}`, data);
  }

  updateEvent(mosqueId: number, id: number, data: Partial<MosqueEvent>): Observable<MosqueEvent> {
    return this.http.put<MosqueEvent>(`${this.base}/mosques/${mosqueId}/events/${id}`, data);
  }

  deleteJanaza(mosqueId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/mosques/${mosqueId}/janaza/${id}`);
  }

  updateJanaza(mosqueId: number, id: number, data: Partial<JanazaAnnouncement>): Observable<JanazaAnnouncement> {
    return this.http.put<JanazaAnnouncement>(`${this.base}/mosques/${mosqueId}/janaza/${id}`, data);
  }

  publishJanaza(mosqueId: number, id: number): Observable<JanazaAnnouncement> {
    return this.http.post<JanazaAnnouncement>(`${this.base}/mosques/${mosqueId}/janaza/${id}/publish`, {});
  }

  createMadrassahClass(mosqueId: number, data: { name: string; schedule?: string; teacherId?: string }): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/madrassah/classes`, { ...data, mosqueId });
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
