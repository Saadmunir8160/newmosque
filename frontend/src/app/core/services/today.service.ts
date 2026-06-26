import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TodayResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class TodayService {
  private http = inject(HttpClient);

  getToday(mosqueId: number): Observable<TodayResponse> {
    return this.http.get<TodayResponse>(`${environment.apiUrl}/today`, {
      params: { mosqueId: mosqueId.toString() }
    });
  }
}
