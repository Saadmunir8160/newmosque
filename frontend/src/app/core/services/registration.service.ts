import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_UNAUTHORIZED_REDIRECT } from '../http/http-context.tokens';

export interface SubmitRegistrationPayload {
  name: string;
  address: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
}

export interface AdminRegistrationItem {
  id: number;
  name: string;
  city: string;
  country: string;
  status: string | number;
  submittedById: string;
  submittedByName: string;
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;
  private mutationContext = new HttpContext().set(SKIP_UNAUTHORIZED_REDIRECT, true);

  submit(payload: SubmitRegistrationPayload): Observable<{ message: string; data: { id: number } }> {
    return this.http.post<{ message: string; data: { id: number } }>(
      `${this.base}/registrations`,
      payload,
      { context: this.mutationContext },
    );
  }

  list(status?: string): Observable<AdminRegistrationItem[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.http.get<{ data: AdminRegistrationItem[] }>(`${this.base}/superadmin/registrations`, { params }).pipe(
      map(res => res?.data ?? []),
    );
  }

  get(id: number): Observable<AdminRegistrationItem> {
    return this.http.get<{ data: AdminRegistrationItem }>(`${this.base}/superadmin/registrations/${id}`).pipe(
      map(res => res.data),
    );
  }

  approve(id: number): Observable<{ message: string; mosqueId?: number }> {
    return this.http.put<{ message: string; mosqueId?: number }>(
      `${this.base}/superadmin/registrations/${id}/approve`,
      {},
      { context: this.mutationContext },
    );
  }

  reject(id: number, reason: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/superadmin/registrations/${id}/reject`,
      { reason },
      { context: this.mutationContext },
    );
  }
}
