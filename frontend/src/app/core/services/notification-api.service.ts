import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_UNAUTHORIZED_REDIRECT } from '../http/http-context.tokens';

export interface UserNotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  route?: string;
  relatedMosqueId?: number;
  relatedClaimId?: number;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;
  private mutationContext = new HttpContext().set(SKIP_UNAUTHORIZED_REDIRECT, true);

  list(limit = 20, unreadOnly = false): Observable<{ unreadCount: number; items: UserNotificationItem[] }> {
    return this.http.get<{ unreadCount: number; items: UserNotificationItem[] }>(
      `${this.base}/notifications`,
      { params: { limit: String(limit), unreadOnly: String(unreadOnly) } },
    );
  }

  unreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/notifications/unread-count`);
  }

  markRead(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/notifications/${id}/read`, {}, { context: this.mutationContext });
  }

  markAllRead(): Observable<unknown> {
    return this.http.post(`${this.base}/notifications/read-all`, {}, { context: this.mutationContext });
  }
}
