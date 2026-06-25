import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { JumuahTime, PrayerTimesDaily } from '../models';

export interface PrayerEditorDashboard {
  mosqueId: number;
  mosqueName: string;
  today: string;
  todayStatus?: string;
  draftDays: number;
  publishedDays: number;
  jumuahSlots: number;
  hasRamadanTimetable: boolean;
  ramadanStatus?: string;
  specialTimingsCount: number;
}

export interface PrayerException {
  id: number;
  mosqueId: number;
  date: string;
  prayer: string;
  overrideValue: string;
  reason?: string;
}

export interface RamadanDayEntry {
  id?: number;
  timetableId?: number;
  dayNumber: number;
  date: string;
  suhoorEnd: string;
  iftarJamaat: string;
  taraweehJamaat?: string;
  notes?: string;
}

export interface RamadanTimetable {
  id: number;
  mosqueId: number;
  year: number;
  hijriYear?: string;
  title: string;
  status: string;
  days: RamadanDayEntry[];
}

export interface PrayerSpecialTiming {
  id: number;
  mosqueId: number;
  date: string;
  label: string;
  time: string;
  notes?: string;
  isRamadan: boolean;
}

export interface PrayerAuditLog {
  id: number;
  mosqueId: number;
  date?: string;
  changedById: string;
  changeDescription: string;
  actionType?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PrayerEditorService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getDashboard(mosqueId: number): Observable<PrayerEditorDashboard> {
    return this.http.get<PrayerEditorDashboard>(`${this.base}/mosques/${mosqueId}/prayer-times/editor/dashboard`);
  }

  getDaily(mosqueId: number, date?: string): Observable<{ times: PrayerTimesDaily; exceptions: PrayerException[] }> {
    const params: Record<string, string> = { includeDraft: 'true' };
    if (date) params['date'] = date;
    return this.http.get<{ times: PrayerTimesDaily; exceptions: PrayerException[] }>(
      `${this.base}/mosques/${mosqueId}/prayer-times/daily`, { params }
    );
  }

  getMonthly(mosqueId: number, year: number, month: number): Observable<PrayerTimesDaily[]> {
    return this.http.get<PrayerTimesDaily[]>(`${this.base}/mosques/${mosqueId}/prayer-times/monthly`, {
      params: { year: year.toString(), month: month.toString(), includeDraft: 'true' },
    });
  }

  saveDaily(mosqueId: number, data: Partial<PrayerTimesDaily>, publish = false): Observable<PrayerTimesDaily> {
    return this.http.put<PrayerTimesDaily>(
      `${this.base}/mosques/${mosqueId}/prayer-times/daily?publish=${publish}`, data
    );
  }

  publishDaily(mosqueId: number, date: string): Observable<PrayerTimesDaily> {
    return this.http.post<PrayerTimesDaily>(`${this.base}/mosques/${mosqueId}/prayer-times/daily/publish`, { date });
  }

  publishMonth(mosqueId: number, year: number, month: number): Observable<{ published: number }> {
    return this.http.post<{ published: number }>(`${this.base}/mosques/${mosqueId}/prayer-times/daily/publish-month`, { year, month });
  }

  getJumuah(mosqueId: number): Observable<JumuahTime[]> {
    return this.http.get<JumuahTime[]>(`${this.base}/mosques/${mosqueId}/prayer-times/jumuah`);
  }

  addJumuah(mosqueId: number, slot: Partial<JumuahTime>): Observable<JumuahTime> {
    return this.http.post<JumuahTime>(`${this.base}/mosques/${mosqueId}/prayer-times/jumuah`, slot);
  }

  updateJumuah(mosqueId: number, slotId: number, slot: Partial<JumuahTime>): Observable<JumuahTime> {
    return this.http.put<JumuahTime>(`${this.base}/mosques/${mosqueId}/prayer-times/jumuah/${slotId}`, slot);
  }

  deleteJumuah(mosqueId: number, slotId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/mosques/${mosqueId}/prayer-times/jumuah/${slotId}`);
  }

  getRamadan(mosqueId: number, year?: number): Observable<RamadanTimetable> {
    const params: Record<string, string> = { includeDraft: 'true' };
    if (year) params['year'] = year.toString();
    return this.http.get<RamadanTimetable>(`${this.base}/mosques/${mosqueId}/prayer-times/ramadan`, { params });
  }

  createRamadan(mosqueId: number, data: { year: number; title?: string; hijriYear?: string }): Observable<RamadanTimetable> {
    return this.http.post<RamadanTimetable>(`${this.base}/mosques/${mosqueId}/prayer-times/ramadan`, data);
  }

  upsertRamadanDay(mosqueId: number, timetableId: number, day: RamadanDayEntry): Observable<RamadanDayEntry> {
    return this.http.put<RamadanDayEntry>(`${this.base}/mosques/${mosqueId}/prayer-times/ramadan/${timetableId}/days`, day);
  }

  publishRamadan(mosqueId: number, timetableId: number): Observable<RamadanTimetable> {
    return this.http.post<RamadanTimetable>(`${this.base}/mosques/${mosqueId}/prayer-times/ramadan/${timetableId}/publish`, {});
  }

  getSpecialTimings(mosqueId: number, year?: number, ramadanOnly = false): Observable<PrayerSpecialTiming[]> {
    const params: Record<string, string> = {};
    if (year) params['year'] = year.toString();
    if (ramadanOnly) params['ramadanOnly'] = 'true';
    return this.http.get<PrayerSpecialTiming[]>(`${this.base}/mosques/${mosqueId}/prayer-times/special-timings`, { params });
  }

  addSpecialTiming(mosqueId: number, timing: Partial<PrayerSpecialTiming>): Observable<PrayerSpecialTiming> {
    return this.http.post<PrayerSpecialTiming>(`${this.base}/mosques/${mosqueId}/prayer-times/special-timings`, timing);
  }

  deleteSpecialTiming(mosqueId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/mosques/${mosqueId}/prayer-times/special-timings/${id}`);
  }

  getAuditLog(mosqueId: number): Observable<PrayerAuditLog[]> {
    return this.http.get<PrayerAuditLog[]>(`${this.base}/mosques/${mosqueId}/prayer-times/audit-log`);
  }

  getExceptions(mosqueId: number): Observable<PrayerException[]> {
    return this.http.get<PrayerException[]>(`${this.base}/mosques/${mosqueId}/prayer-times/exceptions`);
  }

  addException(mosqueId: number, data: Partial<PrayerException>): Observable<PrayerException> {
    return this.http.post<PrayerException>(`${this.base}/mosques/${mosqueId}/prayer-times/exceptions`, data);
  }

  deleteException(mosqueId: number, exceptionId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/mosques/${mosqueId}/prayer-times/exceptions/${exceptionId}`);
  }
}
