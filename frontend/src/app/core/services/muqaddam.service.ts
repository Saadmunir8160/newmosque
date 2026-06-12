import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MuridSummary {
  userId: string;
  fullName: string;
  communities: { name: string; role: string }[];
  wirdCompleted: number;
  wirdTotal: number;
  quranParasCompleted: number;
  deathReadingsCompleted: number;
  deathReadingsTotal: number;
}

export interface TariqaCommunity {
  id: number;
  name: string;
  description?: string;
  mosqueId?: number;
  memberCount: number;
}

@Injectable({ providedIn: 'root' })
export class MuqaddamService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/muqaddam`;

  getMurids(mosqueId?: number): Observable<MuridSummary[]> {
    const params = mosqueId ? { mosqueId: mosqueId.toString() } : undefined;
    return this.http.get<MuridSummary[]>(`${this.base}/murids`, { params });
  }

  getCommunities(mosqueId?: number): Observable<TariqaCommunity[]> {
    const params = mosqueId ? { mosqueId: mosqueId.toString() } : undefined;
    return this.http.get<TariqaCommunity[]>(`${this.base}/communities`, { params });
  }
}
