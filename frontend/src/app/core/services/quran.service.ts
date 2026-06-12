import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface QuranPlanView {
  todaysPara: number;
  completedParas: number;
  totalParas: number;
  todayCompleted?: boolean;
}

@Injectable({ providedIn: 'root' })
export class QuranService {
  private http = inject(HttpClient);

  getMyPlan(): Observable<QuranPlanView> {
    return this.http.get<QuranPlanView>(`${environment.apiUrl}/quran/my-plan`);
  }

  startPlan(): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/quran/start`, {});
  }

  completePara(paraNumber: number): Observable<{ completedParas: number; totalParas: number }> {
    return this.http.post<{ completedParas: number; totalParas: number }>(
      `${environment.apiUrl}/quran/paras/${paraNumber}/complete`, {}
    );
  }
}
