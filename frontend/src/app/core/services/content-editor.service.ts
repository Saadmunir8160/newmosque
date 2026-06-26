import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Dua, WirdCollection } from '../models';
import { AdhkarItem } from './content.service';

export type ContentPublishStatus = 'Draft' | 'InReview' | 'Approved' | 'Published' | 'Unpublished';
export type LibraryItemType = 'Article' | 'Pdf' | 'Book';
export type MediaAssetType = 'Audio' | 'Image' | 'Video';

export interface Publishable {
  id: number;
  status?: ContentPublishStatus;
  publishedAt?: string;
}

export interface ContentEditorDashboard {
  awradCollections: number;
  duas: number;
  adhkarItems: number;
  libraryItems: number;
  mediaAssets: number;
  draftCount: number;
  inReviewCount: number;
  approvedCount: number;
  publishedCount: number;
  sentBackCount: number;
  recentActivity: {
    entityType: string;
    entityId: number;
    title: string;
    fromStatus: ContentPublishStatus;
    toStatus: ContentPublishStatus;
    at: string;
  }[];
}

export interface ContentReviewItem {
  entityType: string;
  entityId: number;
  title: string;
  status: ContentPublishStatus;
  updatedAt?: string;
  category?: string;
  stepCount?: number;
  submittedAt?: string;
}

export type ReviewFilter = ContentPublishStatus | 'SentBack';

export interface ContentArticle extends Publishable {
  title: string;
  slug?: string;
  summary?: string;
  body: string;
  itemType: LibraryItemType;
  resourceUrl?: string;
  authorId?: string;
  updatedAt?: string;
}

export interface MediaAsset {
  id: number;
  fileName: string;
  originalFileName: string;
  contentType: string;
  mediaType: MediaAssetType;
  url: string;
  sizeBytes: number;
  uploadedById?: string;
  createdAt: string;
}

export interface WirdCollectionItemRow {
  stepId: number;
  orderIndex: number;
  contentItemId: number;
  itemName: string;
  type: string;
  count: number;
  category: string;
  status: string;
  lastUpdated?: string;
}

export interface UpsertCollectionItemPayload {
  itemName: string;
  type: string;
  count: number;
  category: string;
  status?: string;
}

export interface WirdCollectionStats {
  totalItems: number;
  totalMembers: number;
  activeToday: number;
  completionRate: number;
  engagementRate: number;
  memberGrowthPercent: number;
  views: number;
  completions: number;
  lastUpdated?: string;
  totalItemsTrend: number;
  totalMembersTrend: number;
  activeTodayTrend: number;
  completionRateTrend: number;
  engagementRateTrend: number;
}

export interface CollectionActivityItem {
  userId: string;
  userName: string;
  userInitials: string;
  action: string;
  at: string;
}

export interface CollectionAnalyticsPoint {
  date: string;
  usage: number;
  completions: number;
  members: number;
}

export interface CollectionAnalyticsBundle {
  views: number;
  completions: number;
  engagement: number;
  growth: number;
  dailyTrend: CollectionAnalyticsPoint[];
}

export interface CollectionMemberPreview {
  userId: string;
  name: string;
  initials: string;
}

export interface CollectionMemberRow {
  userId: string;
  name: string;
  email: string;
  initials: string;
  joinedAt: string;
  lastActiveAt?: string;
  completed: boolean;
}

export interface WirdCollectionDetail {
  collection: WirdCollection & { createdAt?: string; updatedAt?: string };
  items: WirdCollectionItemRow[];
  stats: WirdCollectionStats;
  recentActivity: CollectionActivityItem[];
  analytics: CollectionAnalyticsBundle;
  recentMembers: CollectionMemberPreview[];
  members: CollectionMemberRow[];
}

@Injectable({ providedIn: 'root' })
export class ContentEditorService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/content-editor`;
  readonly assetHost = environment.apiUrl.replace('/api/v1', '');

  getDashboard(): Observable<ContentEditorDashboard> {
    return this.http.get<ContentEditorDashboard>(`${this.base}/dashboard`);
  }

  getReviews(filter?: ReviewFilter): Observable<ContentReviewItem[]> {
    if (filter === 'SentBack') {
      return this.http.get<ContentReviewItem[]>(`${this.base}/reviews`, { params: { sentBackOnly: 'true' } });
    }
    const params = filter ? { status: filter } : undefined;
    return this.http.get<ContentReviewItem[]>(`${this.base}/reviews`, { params });
  }

  transition(entityType: string, entityId: number, toStatus: ContentPublishStatus, comment?: string): Observable<unknown> {
    return this.http.post(`${this.base}/workflow`, { entityType, entityId, toStatus, comment });
  }

  // Duas
  getDuas(category?: string, status?: ContentPublishStatus): Observable<Dua[]> {
    const params: Record<string, string> = {};
    if (category) params['category'] = category;
    if (status) params['status'] = status;
    return this.http.get<Dua[]>(`${this.base}/duas`, { params });
  }

  createDua(data: Partial<Dua>): Observable<Dua> {
    return this.http.post<Dua>(`${this.base}/duas`, data);
  }

  updateDua(id: number, data: Partial<Dua>): Observable<Dua> {
    return this.http.put<Dua>(`${this.base}/duas/${id}`, data);
  }

  // Adhkar
  getAdhkar(category?: string, status?: ContentPublishStatus): Observable<AdhkarItem[]> {
    const params: Record<string, string> = {};
    if (category) params['category'] = category;
    if (status) params['status'] = status;
    return this.http.get<AdhkarItem[]>(`${this.base}/adhkar`, { params });
  }

  createAdhkar(data: Partial<AdhkarItem>): Observable<AdhkarItem> {
    return this.http.post<AdhkarItem>(`${this.base}/adhkar`, data);
  }

  updateAdhkar(id: number, data: Partial<AdhkarItem>): Observable<AdhkarItem> {
    return this.http.put<AdhkarItem>(`${this.base}/adhkar/${id}`, data);
  }

  // Awrad
  getAwradCollections(status?: ContentPublishStatus): Observable<WirdCollection[]> {
    const params = status ? { status } : undefined;
    return this.http.get<WirdCollection[]>(`${this.base}/awrad/collections`, { params });
  }

  createAwradCollection(data: Partial<WirdCollection>): Observable<WirdCollection> {
    return this.http.post<WirdCollection>(`${this.base}/awrad/collections`, data);
  }

  updateAwradCollection(id: number, data: Partial<WirdCollection>): Observable<WirdCollection> {
    return this.http.put<WirdCollection>(`${this.base}/awrad/collections/${id}`, data);
  }

  getAwradCollectionDetail(id: number): Observable<WirdCollectionDetail> {
    return this.http.get<WirdCollectionDetail>(`${this.base}/awrad/collections/${id}`);
  }

  duplicateAwradCollection(id: number): Observable<WirdCollection> {
    return this.http.post<WirdCollection>(`${this.base}/awrad/collections/${id}/duplicate`, {});
  }

  deleteAwradCollection(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/awrad/collections/${id}`);
  }

  bulkCollectionItemAction(collectionId: number, action: 'publish' | 'archive' | 'delete', stepIds: number[]): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.base}/awrad/collections/${collectionId}/items/bulk`, { action, stepIds });
  }

  addCollectionItem(collectionId: number, data: UpsertCollectionItemPayload): Observable<WirdCollectionItemRow> {
    return this.http.post<WirdCollectionItemRow>(`${this.base}/awrad/collections/${collectionId}/items`, data);
  }

  updateCollectionItem(collectionId: number, stepId: number, data: UpsertCollectionItemPayload): Observable<WirdCollectionItemRow> {
    return this.http.put<WirdCollectionItemRow>(`${this.base}/awrad/collections/${collectionId}/items/${stepId}`, data);
  }

  // Library
  getArticles(itemType?: LibraryItemType, status?: ContentPublishStatus): Observable<ContentArticle[]> {
    const params: Record<string, string> = {};
    if (itemType) params['itemType'] = itemType;
    if (status) params['status'] = status;
    return this.http.get<ContentArticle[]>(`${this.base}/articles`, { params });
  }

  createArticle(data: Partial<ContentArticle>): Observable<ContentArticle> {
    return this.http.post<ContentArticle>(`${this.base}/articles`, data);
  }

  updateArticle(id: number, data: Partial<ContentArticle>): Observable<ContentArticle> {
    return this.http.put<ContentArticle>(`${this.base}/articles/${id}`, data);
  }

  deleteArticle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/articles/${id}`);
  }

  // Media
  getMedia(mediaType?: MediaAssetType): Observable<MediaAsset[]> {
    const params = mediaType ? { mediaType } : undefined;
    return this.http.get<MediaAsset[]>(`${this.base}/media`, { params });
  }

  uploadMedia(file: File, mediaType?: MediaAssetType): Observable<MediaAsset> {
    const form = new FormData();
    form.append('file', file);
    const params = mediaType ? { mediaType } : undefined;
    return this.http.post<MediaAsset>(`${this.base}/media/upload`, form, { params });
  }

  deleteMedia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/media/${id}`);
  }

  mediaUrl(asset: MediaAsset): string {
    return asset.url.startsWith('http') ? asset.url : `${this.assetHost}${asset.url}`;
  }
}
