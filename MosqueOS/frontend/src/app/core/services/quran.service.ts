import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface QuranPlanView {
  todaysPara: number;
  completedParas: number;
  totalParas: number;
  todayCompleted?: boolean;
}

export interface QuranParaContent {
  number: number;
  nameEn: string;
  nameAr: string;
  surahRange: string;
  arabic: string;
  translation: string;
  source?: string;
}

export interface YaseenContent {
  name: string;
  arabic: string;
  translation: string;
  source?: string;
}

export interface AdhkarReadingContent {
  key: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  instruction: string;
}

export interface ParaListItem {
  number: number;
  nameEn: string;
  nameAr: string;
  surahRange: string;
  label: string;
}

const PARA_NAMES_EN = [
  'Alif Lam Meem', 'Sayaqool', 'Tilkal Rusul', 'Lan Tanaloo', 'Wal Muhsanaat',
  'La Yuhibbullah', 'Wa Idha Sami\'oo', 'Wa Law Annana', 'Qalal Malao', 'Wa A\'lamu',
  'Yatazeroon', 'Wa Maa Min Daaabbah', 'Wa Maa Ubarri\'u', 'Rubama', 'Subhanalladhi',
  'Qala Alam', 'Iqtaraba', 'Qad Aflaha', 'Wa Qalalladheena', 'A\'man Khalaq',
  'Utlu Maa Oohiya', 'Wa Man Yaqnut', 'Faman Azlam', 'Fa Man Khair', 'Elahukum',
  'Ha Meem', 'Qala Fama Khatbukum', 'Qad Sami\'a', 'Tabarakalladhi', 'Amma Yatasaa\'aloon',
];

function fallbackParas(): ParaListItem[] {
  return PARA_NAMES_EN.map((nameEn, i) => {
    const number = i + 1;
    return { number, nameEn, nameAr: '', surahRange: '', label: `Para ${number} — ${nameEn}` };
  });
}

@Injectable({ providedIn: 'root' })
export class QuranService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/quran`;

  getParas(): Observable<ParaListItem[]> {
    return this.http.get<Omit<ParaListItem, 'label'>[]>(`${this.base}/paras`).pipe(
      map(list => list.map(p => ({
        ...p,
        label: `Para ${p.number} — ${p.nameEn}`,
      }))),
      catchError(() => of(fallbackParas())),
    );
  }

  getPara(paraNumber: number): Observable<QuranParaContent> {
    return this.http.get<QuranParaContent>(`${this.base}/paras/${paraNumber}`);
  }

  getYaseen(): Observable<YaseenContent> {
    return this.http.get<YaseenContent>(`${this.base}/surahs/yaseen`);
  }

  getAdhkar(key: string): Observable<AdhkarReadingContent> {
    return this.http.get<AdhkarReadingContent>(`${this.base}/adhkar/${encodeURIComponent(key)}`);
  }

  getMyPlan(): Observable<QuranPlanView> {
    return this.http.get<QuranPlanView>(`${this.base}/my-plan`);
  }

  startPlan(): Observable<unknown> {
    return this.http.post(`${this.base}/start`, {});
  }

  completePara(paraNumber: number): Observable<{ completedParas: number; totalParas: number }> {
    return this.http.post<{ completedParas: number; totalParas: number }>(
      `${this.base}/paras/${paraNumber}/complete`, {}
    );
  }
}
