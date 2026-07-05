import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpEventType } from '@angular/common/http';
import { Observable, filter, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_UNAUTHORIZED_REDIRECT } from '../http/http-context.tokens';

export interface SubmitMosqueClaimResponse {
  success: boolean;
  claimReference: string;
  status: string;
  message?: string;
}

export interface MyClaimItem {
  claimId: number;
  claimReference: string;
  mosqueId: number;
  mosqueName: string;
  mosqueSlug?: string;
  status: string;
  reviewStatus: string;
  submittedDate: string;
  lastUpdated?: string | null;
  rejectionReason?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MosqueClaimsService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;
  private mutationContext = new HttpContext().set(SKIP_UNAUTHORIZED_REDIRECT, true);

  getMyClaims(): Observable<MyClaimItem[]> {
    return this.http.get<MyClaimItem[]>(`${this.base}/mosques/my-claims`, { context: this.mutationContext });
  }

  submitClaim(form: FormData): Observable<{ event: 'progress' | 'done'; percent?: number; result?: SubmitMosqueClaimResponse }> {
    return this.http.post<SubmitMosqueClaimResponse>(`${this.base}/mosque-claims`, form, {
      context: this.mutationContext,
      reportProgress: true,
      observe: 'events',
    }).pipe(
      map(event => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? event.loaded;
          const percent = total ? Math.round((100 * event.loaded) / total) : 0;
          return { event: 'progress' as const, percent };
        }
        if (event.type === HttpEventType.Response) {
          return { event: 'done' as const, result: event.body ?? undefined };
        }
        return { event: 'progress' as const, percent: 0 };
      }),
      filter(e => e.event === 'progress' || e.event === 'done'),
    );
  }
}
