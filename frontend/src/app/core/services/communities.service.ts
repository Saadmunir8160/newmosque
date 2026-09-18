import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CommunityPost {
  id: number;
  communityId: number;
  authorId: string;
  content: string;
  hadithRef?: string;
  createdAt: string;
}

export interface CommunityResource {
  id: number;
  communityId: number;
  title: string;
  url: string;
  type: string;
}

export interface CommunityEvent {
  communityId: number;
  eventId: number;
  event?: any;
}

@Injectable({ providedIn: 'root' })
export class CommunitiesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/communities`;

  getPosts(communityId: number): Observable<CommunityPost[]> {
    return this.http.get<CommunityPost[]>(`${this.base}/${communityId}/posts`);
  }

  createPost(communityId: number, post: Partial<CommunityPost>): Observable<CommunityPost> {
    return this.http.post<CommunityPost>(`${this.base}/${communityId}/posts`, post);
  }

  getEvents(communityId: number): Observable<CommunityEvent[]> {
    return this.http.get<CommunityEvent[]>(`${this.base}/${communityId}/events`);
  }

  linkEvent(communityId: number, eventId: number): Observable<CommunityEvent> {
    return this.http.post<CommunityEvent>(`${this.base}/${communityId}/events`, { eventId });
  }

  addResource(communityId: number, resource: Partial<CommunityResource>): Observable<CommunityResource> {
    return this.http.post<CommunityResource>(`${this.base}/${communityId}/resources`, resource);
  }
}
