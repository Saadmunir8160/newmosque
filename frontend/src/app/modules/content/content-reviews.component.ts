import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  ContentEditorService,
  ContentReviewItem,
  ReviewFilter,
} from '../../core/services/content-editor.service';

@Component({
  selector: 'app-content-reviews',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './content-reviews.component.html',
  styleUrl: './content-reviews.component.css',
})
export class ContentReviewsComponent implements OnInit {
  private editor = inject(ContentEditorService);

  items = signal<ContentReviewItem[]>([]);
  loading = signal(true);
  busyId = signal<string | null>(null);
  toast = signal('');
  toastOk = signal(true);

  filter: ReviewFilter = 'InReview';
  filters: ReviewFilter[] = ['InReview', 'Approved', 'Draft', 'SentBack'];

  inReviewCount = signal(0);
  approvedCount = signal(0);
  draftCount = signal(0);
  sentBackCount = signal(0);

  ngOnInit(): void {
    this.loadCounts();
    this.load();
  }

  filterLabel(f: ReviewFilter): string {
    if (f === 'InReview') return 'In Review';
    if (f === 'SentBack') return 'Sent Back';
    return f;
  }

  filterMetaLabel(): string {
    const n = this.items().length;
    switch (this.filter) {
      case 'InReview': return `${n} in review item${n === 1 ? '' : 's'}`;
      case 'Approved': return `approved item${n === 1 ? '' : 's'}`;
      case 'Draft': return `draft item${n === 1 ? '' : 's'}`;
      case 'SentBack': return `sent back item${n === 1 ? '' : 's'}`;
      default: return `item${n === 1 ? '' : 's'}`;
    }
  }

  categoryLabel(item: ContentReviewItem): string {
    if (item.category) return item.category.replace(/_/g, ' ');
    return this.entityLabel(item.entityType);
  }

  categoryKey(item: ContentReviewItem): string {
    const cat = (item.category ?? '').toLowerCase();
    if (cat.includes('wudu')) return 'wudu';
    if (cat.includes('ghusl')) return 'ghusl';
    if (cat.includes('salah')) return 'salah';
    return 'default';
  }

  entityLabel(type: string): string {
    const map: Record<string, string> = {
      Dua: 'Dua',
      Adhkar: 'Adhkar',
      WirdCollection: 'Awrad',
      ContentArticle: 'Article',
      RitualGuide: 'Guide',
    };
    return map[type] ?? type.replace(/([A-Z])/g, ' $1').trim();
  }

  submittedLabel(item: ContentReviewItem): string {
    const raw = item.submittedAt ?? item.updatedAt;
    if (!raw) return '';
    const diff = Date.now() - new Date(raw).getTime();
    const days = Math.floor(diff / 86400000);
    if (days <= 0) return 'Submitted today';
    if (days === 1) return 'Submitted 1 day ago';
    return `Submitted ${days} days ago`;
  }

  itemKey(item: ContentReviewItem): string {
    return `${item.entityType}:${item.entityId}`;
  }

  canApprove(item: ContentReviewItem): boolean {
    return item.status === 'InReview';
  }

  canSendBack(item: ContentReviewItem): boolean {
    return item.status === 'InReview';
  }

  setFilter(f: ReviewFilter): void {
    this.filter = f;
    this.load();
  }

  loadCounts(): void {
    this.editor.getDashboard().subscribe({
      next: d => {
        this.inReviewCount.set(d.inReviewCount);
        this.approvedCount.set(d.approvedCount);
        this.draftCount.set(d.draftCount);
        this.sentBackCount.set(d.sentBackCount ?? 0);
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.editor.getReviews(this.filter).subscribe({
      next: v => { this.items.set(v); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  approve(item: ContentReviewItem): void {
    this.runTransition(item, 'Approved', 'Guide approved.');
  }

  sendBack(item: ContentReviewItem): void {
    this.runTransition(item, 'Draft', 'Guide sent back for revision.');
  }

  private runTransition(item: ContentReviewItem, to: 'Approved' | 'Draft', successMsg: string): void {
    const key = this.itemKey(item);
    this.busyId.set(key);
    this.editor.transition(item.entityType, item.entityId, to).subscribe({
      next: () => {
        this.busyId.set(null);
        this.showToast(successMsg, true);
        this.loadCounts();
        this.load();
      },
      error: () => {
        this.busyId.set(null);
        this.showToast('Action failed. Please try again.', false);
      },
    });
  }

  private showToast(msg: string, ok: boolean): void {
    this.toastOk.set(ok);
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3200);
  }

  routeFor(item: ContentReviewItem): string {
    switch (item.entityType) {
      case 'Dua': return '/dashboard/content/duas';
      case 'Adhkar': return '/dashboard/content/adhkar';
      case 'WirdCollection': return `/dashboard/content/awrad/${item.entityId}`;
      case 'ContentArticle': return '/dashboard/content/library';
      case 'RitualGuide': return '/dashboard/content/ritual-guides';
      default: return '/dashboard/content';
    }
  }
}
