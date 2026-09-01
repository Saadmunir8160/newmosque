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

export interface PrayerAuditLog {
  id: number;
  mosqueId: number;
  date?: string;
  changedById: string;
  changeDescription: string;
  actionType?: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export interface GenerateFromTemplateResult {
  created: number;
  updated: number;
  skipped: number;
  preview?: boolean;
  message: string;
  rows?: { date: string; action: string; reason?: string }[];
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

  getTemplates(mosqueId: number): Observable<JamaahTemplate[]> {
    return this.http.get<JamaahTemplate[]>(`${this.base}/mosques/${mosqueId}/prayer-times/jamaah-templates`);
  }

  createTemplate(mosqueId: number, data: JamaahTemplateUpsert): Observable<JamaahTemplateSaveResponse> {
    return this.http.post<JamaahTemplateSaveResponse>(`${this.base}/mosques/${mosqueId}/prayer-times/jamaah-templates`, data);
  }

  updateTemplate(mosqueId: number, templateId: number, data: JamaahTemplateUpsert): Observable<JamaahTemplateSaveResponse> {
    return this.http.put<JamaahTemplateSaveResponse>(
      `${this.base}/mosques/${mosqueId}/prayer-times/jamaah-templates/${templateId}`,
      data,
    );
  }

  duplicateTemplate(mosqueId: number, templateId: number): Observable<JamaahTemplate> {
    return this.http.post<JamaahTemplate>(
      `${this.base}/mosques/${mosqueId}/prayer-times/jamaah-templates/${templateId}/duplicate`,
      {},
    );
  }

  deleteTemplate(mosqueId: number, templateId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/mosques/${mosqueId}/prayer-times/jamaah-templates/${templateId}`);
  }

  setTemplateActive(mosqueId: number, templateId: number, isActive: boolean): Observable<JamaahTemplate> {
    return this.http.patch<JamaahTemplate>(
      `${this.base}/mosques/${mosqueId}/prayer-times/jamaah-templates/${templateId}/active`,
      { isActive },
    );
  }

  resolveTemplate(mosqueId: number, date?: string): Observable<{ date: string; template: JamaahTemplate | null }> {
    const params: Record<string, string> = {};
    if (date) params['date'] = date;
    return this.http.get<{ date: string; template: JamaahTemplate | null }>(
      `${this.base}/mosques/${mosqueId}/prayer-times/jamaah-templates/resolve`,
      { params },
    );
  }

  generateFromTemplate(
    mosqueId: number,
    templateId: number,
    body: {
      from: string;
      to: string;
      overwritePublished?: boolean;
      skipExisting?: boolean;
      publish?: boolean;
      preview?: boolean;
    },
  ): Observable<GenerateFromTemplateResult> {
    return this.http.post<GenerateFromTemplateResult>(
      `${this.base}/mosques/${mosqueId}/prayer-times/jamaah-templates/${templateId}/generate`,
      body,
    );
  }
}

export type JamaahTemplateType = 'Custom' | 'Winter' | 'Spring' | 'Summer' | 'Autumn' | 'Ramadan' | number;

export interface JamaahTemplatePrayer {
  prayerName: string;
  startTime: string;
  jamaatTime: string;
  sortOrder: number;
}

export interface JamaahTemplate {
  id: number;
  mosqueId: number;
  name: string;
  templateType: JamaahTemplateType;
  templateTypeName?: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  priority: number;
  isActive: boolean;
  isDefault: boolean;
  daysOfWeek: number[];
  specificDates: string[];
  excludedDates: string[];
  prayers: JamaahTemplatePrayer[];
  recurringRulesJson?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JamaahTemplateUpsert {
  name: string;
  templateType: JamaahTemplateType;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  priority: number;
  isActive: boolean;
  isDefault: boolean;
  daysOfWeek: number[];
  specificDates: string[];
  excludedDates: string[];
  prayers: JamaahTemplatePrayer[];
}

export interface JamaahTemplateSaveResponse {
  template: JamaahTemplate;
  warnings: string[];
}

export interface TemplateTimesPayload {
  fajrStart: string;
  fajrJamaat: string;
  dhuhrStart: string;
  dhuhrJamaat: string;
  asrStart: string;
  asrJamaat: string;
  maghribStart: string;
  maghribJamaat: string;
  ishaStart: string;
  ishaJamaat: string;
  daysOfWeek: number[];
}

export function buildTemplateRulesJson(times: TemplateTimesPayload): string {
  return JSON.stringify(times);
}

export function parseTemplateRulesJson(json?: string | null): TemplateTimesPayload | null {
  if (!json?.trim()) return null;
  try {
    const o = JSON.parse(json) as Partial<TemplateTimesPayload>;
    return {
      fajrStart: (o.fajrStart ?? '05:30:00').toString().slice(0, 8),
      fajrJamaat: (o.fajrJamaat ?? '05:45:00').toString().slice(0, 8),
      dhuhrStart: (o.dhuhrStart ?? '12:30:00').toString().slice(0, 8),
      dhuhrJamaat: (o.dhuhrJamaat ?? '13:00:00').toString().slice(0, 8),
      asrStart: (o.asrStart ?? '15:30:00').toString().slice(0, 8),
      asrJamaat: (o.asrJamaat ?? '16:00:00').toString().slice(0, 8),
      maghribStart: (o.maghribStart ?? '18:00:00').toString().slice(0, 8),
      maghribJamaat: (o.maghribJamaat ?? '18:10:00').toString().slice(0, 8),
      ishaStart: (o.ishaStart ?? '19:30:00').toString().slice(0, 8),
      ishaJamaat: (o.ishaJamaat ?? '20:00:00').toString().slice(0, 8),
      daysOfWeek: Array.isArray(o.daysOfWeek) && o.daysOfWeek.length
        ? o.daysOfWeek.map(Number)
        : [0, 1, 2, 3, 4, 5, 6],
    };
  } catch {
    return null;
  }
}
