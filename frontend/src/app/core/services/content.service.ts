import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Dua, WirdCollection } from '../models';

export interface ContentItem {
  id: number; title: string; arabicText: string; transliteration?: string;
  translation?: string; repeatCount: number; type: string;
}
export interface AdhkarItem {
  id: number; title: string; arabicText: string; defaultCount: number; category?: string;
  transliteration?: string; translation?: string; status?: string;
}
export interface UserAdhkar {
  id: number; targetCount: number; adhkarItem?: AdhkarItem; customTitle?: string;
}
export interface Community {
  id: number; name: string; type: string; description?: string; isPublic: boolean;
}
export interface RitualGuide {
  id: number;
  title: string;
  type: string;
  description?: string;
  stepCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
export interface RitualStep {
  id: number; title: string; description: string; orderIndex: number;
  dua?: { title: string; arabicText: string; translation?: string };
}
export interface RitualGuideDetail extends RitualGuide {
  steps: RitualStep[];
}
export interface JourneyGuide {
  id: number; title: string; type: string; description?: string;
}
export interface JourneyStage {
  id: number; title: string; description: string; orderIndex: number; dayNumber?: number;
}
export interface JourneyGuideDetail extends JourneyGuide {
  stages: JourneyStage[];
}

@Injectable({ providedIn: 'root' })
export class ContentService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // Awrad admin
  getCollections(): Observable<WirdCollection[]> {
    return this.http.get<WirdCollection[]>(`${this.base}/awrad/collections`);
  }

  getCollection(id: number): Observable<WirdCollection & { steps: unknown[] }> {
    return this.http.get<WirdCollection & { steps: unknown[] }>(`${this.base}/awrad/collections/${id}`);
  }

  createCollection(data: Partial<WirdCollection>): Observable<WirdCollection> {
    return this.http.post<WirdCollection>(`${this.base}/awrad/collections`, data);
  }

  createContentItem(data: Partial<ContentItem>): Observable<ContentItem> {
    return this.http.post<ContentItem>(`${this.base}/awrad/content-items`, data);
  }

  getRecommendedWird(): Observable<{ slot: string; collection: WirdCollection; mode?: string }> {
    return this.http.get<{ slot: string; collection: WirdCollection; mode?: string }>(`${this.base}/awrad/recommended-now`);
  }

  getMySchedule(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.base}/awrad/my-schedule`);
  }

  markWirdComplete(collectionId: number): Observable<unknown> {
    return this.http.post(`${this.base}/awrad/collections/${collectionId}/complete`, {});
  }

  getWirdCompletedToday(): Observable<number[]> {
    return this.http.get<number[]>(`${this.base}/awrad/completed-today`);
  }

  // Duas
  getDuas(category?: string): Observable<Dua[]> {
    const params = category ? { category } : undefined;
    return this.http.get<Dua[]>(`${this.base}/duas`, { params });
  }

  getDuaCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/duas/categories`);
  }

  createDua(data: Partial<Dua>): Observable<Dua> {
    return this.http.post<Dua>(`${this.base}/duas`, data);
  }

  // Adhkar
  getAdhkarItems(): Observable<AdhkarItem[]> {
    return this.http.get<AdhkarItem[]>(`${this.base}/adhkar/items`);
  }

  getMyAdhkar(relevantOnly = false): Observable<{ userAdhkar: UserAdhkar; todayCount: number }[]> {
    const params = relevantOnly ? { relevantOnly: 'true' } : undefined;
    return this.http.get<{ userAdhkar: UserAdhkar; todayCount: number }[]>(`${this.base}/adhkar/mine`, { params });
  }

  getAdhkarSummary(): Observable<{
    itemCount: number;
    completedItemCount: number;
    todayCompleted: number;
    todayTarget: number;
    progressLabel: string;
  }> {
    return this.http.get<{
      itemCount: number;
      completedItemCount: number;
      todayCompleted: number;
      todayTarget: number;
      progressLabel: string;
    }>(`${this.base}/adhkar/mine/summary`);
  }

  incrementAdhkar(id: number, by = 1): Observable<{ completed: number; target: number; isComplete: boolean; progressLabel?: string }> {
    return this.http.post<{ completed: number; target: number; isComplete: boolean; progressLabel?: string }>(
      `${this.base}/adhkar/mine/${id}/increment?by=${by}`, {}
    );
  }

  updateMyAdhkar(id: number, data: { targetCount?: number; prayerSlot?: number | string | null; occasion?: number | string; customTitle?: string }): Observable<UserAdhkar> {
    return this.http.put<UserAdhkar>(`${this.base}/adhkar/mine/${id}`, data);
  }

  addToMyAdhkar(adhkarItemId: number, targetCount: number): Observable<UserAdhkar> {
    return this.http.post<UserAdhkar>(`${this.base}/adhkar/mine`, { adhkarItemId, targetCount });
  }

  removeFromMyAdhkar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/adhkar/mine/${id}`);
  }

  createAdhkarItem(data: Partial<AdhkarItem>): Observable<AdhkarItem> {
    return this.http.post<AdhkarItem>(`${this.base}/adhkar/items`, data);
  }

  // Ritual guides
  getRitualGuides(type?: string): Observable<RitualGuide[]> {
    const params = type ? { type } : undefined;
    return this.http.get<RitualGuide[]>(`${this.base}/ritual-guides`, { params });
  }

  getRitualGuide(id: number): Observable<RitualGuideDetail> {
    return this.http.get<RitualGuideDetail>(`${this.base}/ritual-guides/${id}`);
  }

  // Journey guides
  getJourneyGuides(type?: string): Observable<JourneyGuide[]> {
    const params = type ? { type } : undefined;
    return this.http.get<JourneyGuide[]>(`${this.base}/journey-guides`, { params });
  }

  getJourneyGuide(id: number): Observable<JourneyGuideDetail> {
    return this.http.get<JourneyGuideDetail>(`${this.base}/journey-guides/${id}`);
  }

  createJourneyGuide(data: { title: string; type: string }): Observable<JourneyGuide> {
    return this.http.post<JourneyGuide>(`${this.base}/journey-guides`, data);
  }

  addJourneyStage(guideId: number, stage: { title: string; description: string; orderIndex: number }): Observable<unknown> {
    return this.http.post(`${this.base}/journey-guides/${guideId}/stages`, stage);
  }

  createRitualGuide(data: { title: string; type: string }): Observable<RitualGuide> {
    return this.http.post<RitualGuide>(`${this.base}/ritual-guides`, data);
  }

  updateRitualGuide(id: number, data: { title: string; type: string }): Observable<RitualGuide> {
    return this.http.put<RitualGuide>(`${this.base}/ritual-guides/${id}`, data);
  }

  deleteRitualGuide(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/ritual-guides/${id}`);
  }

  addRitualStep(guideId: number, step: { title: string; description: string; orderIndex: number }): Observable<RitualStep> {
    return this.http.post<RitualStep>(`${this.base}/ritual-guides/${guideId}/steps`, step);
  }

  updateRitualStep(guideId: number, stepId: number, step: { title: string; description: string; orderIndex: number }): Observable<RitualStep> {
    return this.http.put<RitualStep>(`${this.base}/ritual-guides/${guideId}/steps/${stepId}`, step);
  }

  deleteRitualStep(guideId: number, stepId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/ritual-guides/${guideId}/steps/${stepId}`);
  }

  // Communities
  getCommunities(mosqueId?: number, search?: string, type?: string): Observable<Community[]> {
    const params: Record<string, string> = {};
    if (mosqueId) params['mosqueId'] = mosqueId.toString();
    if (search?.trim()) params['search'] = search.trim();
    if (type) params['type'] = type;
    return this.http.get<Community[]>(`${this.base}/communities`, { params });
  }

  joinCommunity(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/communities/${id}/join`, {});
  }

  getMyCommunityIds(): Observable<number[]> {
    return this.http.get<number[]>(`${this.base}/communities/mine`);
  }

  // Preferences
  updatePreferences(data: Record<string, unknown>): Observable<unknown> {
    return this.http.put(`${this.base}/auth/preferences`, data);
  }
}
