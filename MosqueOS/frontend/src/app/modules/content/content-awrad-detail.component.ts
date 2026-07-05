import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ContentEditorService,
  UpsertCollectionItemPayload,
  WirdCollectionDetail,
  WirdCollectionItemRow,
} from '../../core/services/content-editor.service';
import { ContentWorkflowBarComponent } from './content-workflow-bar.component';
import { WirdCollection } from '../../core/models';
import { buildAwradDetailFallback } from './content-awrad-detail.fallback';
import {
  getDemoDeletedIds,
  listDemoCollectionSummaries,
  loadDemoCollection,
  markDemoDeleted,
  nextDemoCollectionId,
  saveDemoCollection,
} from './content-awrad-demo-store';

const TARIQA_OPTIONS = [
  { value: 'General', label: 'General' },
  { value: 'BaAlawi', label: "Ba'Alawi" },
  { value: 'Shadhili', label: 'Shadhili' },
] as const;

type DetailTab = 'overview' | 'items' | 'members' | 'analytics' | 'settings';
type ItemSortKey = 'orderIndex' | 'itemName' | 'type' | 'count' | 'category' | 'lastUpdated';
type AnalyticsRange = 7 | 30 | 90 | 365;
type ItemDrawerMode = 'add' | 'edit' | 'view';

const ITEM_TYPES = ['Dhikr', 'Salawat', 'Quran', 'Dua', 'Poem', 'Other'] as const;

@Component({
  selector: 'app-content-awrad-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ContentWorkflowBarComponent],
  templateUrl: './content-awrad-detail.component.html',
  styleUrl: './content-awrad-detail.component.css',
})
export class ContentAwradDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private editor = inject(ContentEditorService);

  readonly tariqaOptions = TARIQA_OPTIONS;
  readonly typeOptions = ['Daily', 'Weekly', 'Event'] as const;
  readonly itemTypes = ITEM_TYPES;

  detail = signal<WirdCollectionDetail | null>(null);
  allCollections = signal<WirdCollection[]>([]);
  loading = signal(true);
  loadError = signal('');
  usingFallback = signal(false);
  tab = signal<DetailTab>('overview');
  moreOpen = signal(false);
  previewOpen = signal(false);
  activityExpanded = signal(false);
  saving = signal(false);
  actionBusy = signal('');
  toast = signal('');
  toastOk = signal(true);

  itemQuery = '';
  itemSort: ItemSortKey = 'orderIndex';
  itemSortAsc = true;
  itemPage = 1;
  itemPageSize = 10;
  selectedSteps = signal<Set<number>>(new Set());

  analyticsRange = signal<AnalyticsRange>(30);
  descDraft = '';
  editingDesc = signal(false);

  itemDrawerOpen = signal(false);
  itemDrawerMode = signal<ItemDrawerMode>('view');
  itemSaving = signal(false);
  editingStepId = signal<number | null>(null);
  itemForm: UpsertCollectionItemPayload = {
    itemName: '',
    type: 'Dhikr',
    count: 1,
    category: 'General',
    status: 'Published',
  };

  settingsForm = {
    name: '',
    tariqa: 'General',
    type: 'Daily',
    recommendedTime: '',
    description: '',
  };

  collectionId = computed(() => this.detail()?.collection.id ?? 0);
  collection = computed(() => this.detail()?.collection ?? null);
  stats = computed(() => this.detail()?.stats ?? null);
  items = computed(() => this.detail()?.items ?? []);

  filteredItems = computed(() => {
    const q = this.itemQuery.trim().toLowerCase();
    let list = [...this.items()];
    if (q) {
      list = list.filter(i =>
        i.itemName.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const dir = this.itemSortAsc ? 1 : -1;
      switch (this.itemSort) {
        case 'itemName': return a.itemName.localeCompare(b.itemName) * dir;
        case 'type': return a.type.localeCompare(b.type) * dir;
        case 'count': return (a.count - b.count) * dir;
        case 'category': return a.category.localeCompare(b.category) * dir;
        case 'lastUpdated': {
          const ta = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
          const tb = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
          return (ta - tb) * dir;
        }
        default: return (a.orderIndex - b.orderIndex) * dir;
      }
    });
    return list;
  });

  pagedItems = computed(() => {
    const start = (this.itemPage - 1) * this.itemPageSize;
    return this.filteredItems().slice(start, start + this.itemPageSize);
  });

  itemPageCount = computed(() => Math.max(1, Math.ceil(this.filteredItems().length / this.itemPageSize)));
  selectedCount = computed(() => this.selectedSteps().size);
  allPageSelected = computed(() => {
    const page = this.pagedItems();
    return page.length > 0 && page.every(i => this.selectedSteps().has(i.stepId));
  });

  analyticsPoints = computed(() => {
    const trend = this.detail()?.analytics.dailyTrend ?? [];
    const days = this.analyticsRange();
    return trend.slice(-days);
  });

  chartMax = computed(() => {
    const pts = this.analyticsPoints();
    return Math.max(1, ...pts.flatMap(p => [p.usage, p.completions, p.members]));
  });

  visibleActivity = computed(() => {
    const list = this.detail()?.recentActivity ?? [];
    return this.activityExpanded() ? list : list.slice(0, 6);
  });

  overviewItemPage = 1;
  readonly overviewItemPageSize = 5;

  overviewPreviewItems = computed(() => {
    const start = (this.overviewItemPage - 1) * this.overviewItemPageSize;
    return this.items().slice(start, start + this.overviewItemPageSize);
  });

  overviewItemPageCount = computed(() =>
    Math.max(1, Math.ceil(this.items().length / this.overviewItemPageSize))
  );

  overviewChartPoints = computed(() =>
    (this.detail()?.analytics?.dailyTrend ?? []).slice(-30)
  );

  extraMembersBadge = computed(() => {
    const total = this.stats()?.totalMembers ?? 0;
    const shown = this.detail()?.recentMembers?.length ?? 0;
    const extra = total - shown;
    return extra > 0 ? `+${this.formatCount(extra)}` : null;
  });

  publishedItemsCount = computed(() =>
    this.items().filter(i => i.status === 'Published').length
  );

  ngOnInit(): void {
    this.loadCollections();
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) {
        this.loadError.set('Invalid collection.');
        this.loading.set(false);
        return;
      }
      this.load(id);
    });
  }

  loadCollections(): void {
    this.editor.getAwradCollections().subscribe({
      next: cols => this.allCollections.set(cols.filter(c => !getDemoDeletedIds().has(c.id))),
      error: () => {
        this.allCollections.set(listDemoCollectionSummaries([
          { id: 1, name: 'Khulasa Wird (Morning)', tariqa: 'BaAlawi', type: 'Daily' },
        ]));
      },
    });
  }

  switchCollection(id: number): void {
    if (id === this.collectionId()) return;
    void this.router.navigate(['/dashboard/content/awrad', id]);
  }

  load(id?: number): void {
    const collectionId = id ?? this.collectionId();
    if (!collectionId) return;
    this.loading.set(true);
    this.loadError.set('');
    this.usingFallback.set(false);
    this.editor.getAwradCollectionDetail(collectionId).subscribe({
      next: d => {
        this.detail.set(d);
        this.syncSettingsForm(d.collection);
        this.descDraft = d.collection.description ?? '';
        this.loading.set(false);
      },
      error: () => {
        if (getDemoDeletedIds().has(collectionId)) {
          this.navigateAfterDelete(collectionId);
          return;
        }
        const persisted = loadDemoCollection(collectionId);
        const fallback = persisted ?? buildAwradDetailFallback(collectionId);
        this.detail.set(fallback);
        this.syncSettingsForm(fallback.collection);
        this.descDraft = fallback.collection.description ?? '';
        this.usingFallback.set(true);
        this.loadError.set('');
        this.loading.set(false);
        this.refreshDemoCollectionsList();
      },
    });
  }

  setTab(t: DetailTab): void {
    this.tab.set(t);
    this.moreOpen.set(false);
  }

  formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(n);
  }

  statusBadge(status?: string): { label: string; cls: string } {
    const s = status || 'Published';
    if (s === 'Unpublished') return { label: 'Archived', cls: 'badge--archived' };
    if (s === 'Draft') return { label: 'Draft', cls: 'badge--draft' };
    if (s === 'InReview') return { label: 'In Review', cls: 'badge--review' };
    if (s === 'Approved') return { label: 'Approved', cls: 'badge--approved' };
    return { label: 'Published', cls: 'badge--published' };
  }

  scheduleBadge(type?: string): string {
    return type || 'Daily';
  }

  tariqaLabel(tariqa: string): string {
    return TARIQA_OPTIONS.find(t => t.value === tariqa)?.label ?? tariqa;
  }

  typeIcon(type: string): string {
    const t = type.toLowerCase();
    if (t === 'weekly') return '📅';
    if (t === 'event') return '✨';
    return '☀️';
  }

  trendMeta(value: number): { arrow: string; cls: string; label: string } {
    if (value > 0) return { arrow: '↑', cls: 'trend--up', label: `+${value}%` };
    if (value < 0) return { arrow: '↓', cls: 'trend--down', label: `${value}%` };
    return { arrow: '→', cls: 'trend--flat', label: '0%' };
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatDateTime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return this.formatDate(iso);
  }

  toggleMore(): void {
    this.moreOpen.update(v => !v);
  }

  closeMenus(): void {
    this.moreOpen.set(false);
  }

  goBack(): void {
    void this.router.navigate(['/dashboard/content/awrad'], { queryParams: { list: 1 } });
  }

  goEdit(): void {
    this.setTab('settings');
  }

  openPreview(): void {
    this.previewOpen.set(true);
  }

  closePreview(): void {
    this.previewOpen.set(false);
  }

  toggleItemSort(key: ItemSortKey): void {
    if (this.itemSort === key) this.itemSortAsc = !this.itemSortAsc;
    else {
      this.itemSort = key;
      this.itemSortAsc = true;
    }
    this.itemPage = 1;
  }

  toggleSelectAllPage(): void {
    const pageIds = this.pagedItems().map(i => i.stepId);
    const next = new Set(this.selectedSteps());
    if (this.allPageSelected()) pageIds.forEach(id => next.delete(id));
    else pageIds.forEach(id => next.add(id));
    this.selectedSteps.set(next);
  }

  toggleSelectStep(stepId: number): void {
    const next = new Set(this.selectedSteps());
    if (next.has(stepId)) next.delete(stepId);
    else next.add(stepId);
    this.selectedSteps.set(next);
  }

  clearSelection(): void {
    this.selectedSteps.set(new Set());
  }

  setAnalyticsRange(days: AnalyticsRange): void {
    this.analyticsRange.set(days);
  }

  barHeight(value: number): string {
    const max = this.chartMax();
    return `${Math.max(4, Math.round((value / max) * 100))}%`;
  }

  runBulk(action: 'publish' | 'archive' | 'delete'): void {
    const ids = [...this.selectedSteps()];
    if (!ids.length) return;
    if (action === 'delete' && !confirm(`Delete ${ids.length} item(s) from this collection?`)) return;

    if (this.usingFallback()) {
      this.applyLocalBulk(ids, action);
      this.showToast(`${ids.length} item(s) updated`, true);
      this.clearSelection();
      return;
    }

    this.actionBusy.set(action);
    this.editor.bulkCollectionItemAction(this.collectionId(), action, ids).subscribe({
      next: () => {
        this.showToast(`${ids.length} item(s) updated`, true);
        this.clearSelection();
        this.load();
        this.actionBusy.set('');
      },
      error: () => {
        this.showToast('Bulk action failed', false);
        this.actionBusy.set('');
      },
    });
  }

  duplicate(): void {
    const d = this.detail();
    if (!d) return;
    this.closeMenus();

    if (this.usingFallback()) {
      const newId = nextDemoCollectionId();
      const copy: WirdCollectionDetail = JSON.parse(JSON.stringify(d));
      copy.collection = {
        ...copy.collection,
        id: newId,
        name: `${d.collection.name} (Copy)`,
        status: 'Draft',
        updatedAt: new Date().toISOString(),
      };
      saveDemoCollection(copy);
      this.refreshDemoCollectionsList();
      this.showToast('Collection duplicated', true);
      void this.router.navigate(['/dashboard/content/awrad', newId]);
      return;
    }

    this.actionBusy.set('duplicate');
    this.editor.duplicateAwradCollection(this.collectionId()).subscribe({
      next: copy => {
        this.showToast('Collection duplicated', true);
        this.actionBusy.set('');
        void this.router.navigate(['/dashboard/content/awrad', copy.id]);
      },
      error: () => {
        this.showToast('Duplicate failed', false);
        this.actionBusy.set('');
      },
    });
  }

  exportCollection(): void {
    const d = this.detail();
    if (!d) return;
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d.collection.name.replace(/\s+/g, '-').toLowerCase()}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.closeMenus();
    this.showToast('Collection exported', true);
  }

  archiveCollection(): void {
    this.closeMenus();
    if (this.usingFallback()) {
      this.patchDetail(d => ({
        ...d,
        collection: { ...d.collection, status: 'Unpublished', updatedAt: new Date().toISOString() },
      }));
      this.pushActivity('archived collection');
      this.showToast('Collection archived', true);
      return;
    }

    this.actionBusy.set('archive');
    this.editor.transition('WirdCollection', this.collectionId(), 'Unpublished').subscribe({
      next: () => {
        this.showToast('Collection archived', true);
        this.load();
        this.actionBusy.set('');
      },
      error: () => {
        this.showToast('Archive failed', false);
        this.actionBusy.set('');
      },
    });
  }

  publishCollection(): void {
    this.closeMenus();
    if (this.usingFallback()) {
      this.patchDetail(d => ({
        ...d,
        collection: { ...d.collection, status: 'Published', updatedAt: new Date().toISOString() },
      }));
      this.pushActivity('published collection');
      this.showToast('Collection published', true);
      return;
    }

    this.actionBusy.set('publish');
    this.editor.transition('WirdCollection', this.collectionId(), 'Published').subscribe({
      next: () => {
        this.showToast('Collection published', true);
        this.load();
        this.actionBusy.set('');
      },
      error: () => {
        this.showToast('Publish failed', false);
        this.actionBusy.set('');
      },
    });
  }

  deleteCollection(): void {
    const name = this.collection()?.name ?? 'this collection';
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    this.closeMenus();
    const id = this.collectionId();

    if (this.usingFallback()) {
      markDemoDeleted(id);
      this.refreshDemoCollectionsList();
      this.showToast('Collection deleted', true);
      this.navigateAfterDelete(id);
      return;
    }

    this.actionBusy.set('delete');
    this.editor.deleteAwradCollection(id).subscribe({
      next: () => {
        this.showToast('Collection deleted', true);
        void this.router.navigate(['/dashboard/content/awrad'], { queryParams: { list: 1 } });
      },
      error: () => {
        this.showToast('Delete failed', false);
        this.actionBusy.set('');
      },
    });
  }

  saveDescription(): void {
    const id = this.collectionId();
    if (this.usingFallback()) {
      this.patchDetail(d => ({
        ...d,
        collection: { ...d.collection, description: this.descDraft, updatedAt: new Date().toISOString() },
      }));
      this.editingDesc.set(false);
      this.pushActivity('updated collection description');
      this.showToast('Description saved', true);
      return;
    }

    this.saving.set(true);
    this.editor.updateAwradCollection(id, { description: this.descDraft }).subscribe({
      next: c => {
        this.detail.update(d => d ? { ...d, collection: { ...d.collection, ...c } } : d);
        this.editingDesc.set(false);
        this.saving.set(false);
        this.showToast('Description saved', true);
      },
      error: () => {
        this.saving.set(false);
        this.showToast('Could not save description', false);
      },
    });
  }

  saveSettings(): void {
    const id = this.collectionId();
    if (!this.settingsForm.name.trim()) return;

    if (this.usingFallback()) {
      this.patchDetail(d => ({
        ...d,
        collection: {
          ...d.collection,
          ...this.settingsForm,
          updatedAt: new Date().toISOString(),
        },
      }));
      this.descDraft = this.settingsForm.description ?? '';
      this.pushActivity('updated collection settings');
      this.showToast('Collection updated', true);
      return;
    }

    this.saving.set(true);
    this.editor.updateAwradCollection(id, { ...this.settingsForm }).subscribe({
      next: c => {
        this.detail.update(d => d ? { ...d, collection: { ...d.collection, ...c } } : d);
        this.descDraft = c.description ?? '';
        this.saving.set(false);
        this.showToast('Collection updated', true);
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.showToast('Save failed', false);
      },
    });
  }

  onWorkflowChanged(): void {
    this.load();
  }

  applyLocalWorkflowStatus(status: string): void {
    this.patchDetail(d => ({
      ...d,
      collection: { ...d.collection, status, updatedAt: new Date().toISOString() },
    }));
    this.pushActivity(`changed status to ${status}`);
  }

  quickAction(action: string): void {
    switch (action) {
      case 'edit': this.goEdit(); break;
      case 'add-item': this.setTab('items'); this.openAddItem(); break;
      case 'items': this.setTab('items'); break;
      case 'members': this.setTab('members'); break;
      case 'duplicate': this.duplicate(); break;
      case 'archive': this.archiveCollection(); break;
      case 'delete': this.deleteCollection(); break;
    }
  }

  openAddItem(): void {
    this.itemForm = { itemName: '', type: 'Dhikr', count: 1, category: 'General', status: 'Published' };
    this.editingStepId.set(null);
    this.itemDrawerMode.set('add');
    this.itemDrawerOpen.set(true);
  }

  openEditItem(item: WirdCollectionItemRow): void {
    this.itemForm = {
      itemName: item.itemName,
      type: item.type,
      count: item.count,
      category: item.category,
      status: item.status,
    };
    this.editingStepId.set(item.stepId);
    this.itemDrawerMode.set('edit');
    this.itemDrawerOpen.set(true);
  }

  openViewItem(item: WirdCollectionItemRow): void {
    this.openEditItem(item);
    this.itemDrawerMode.set('view');
  }

  closeItemDrawer(): void {
    this.itemDrawerOpen.set(false);
    this.editingStepId.set(null);
  }

  saveItem(): void {
    if (!this.itemForm.itemName.trim()) return;
    const payload = { ...this.itemForm, itemName: this.itemForm.itemName.trim() };
    const stepId = this.editingStepId();

    if (this.usingFallback()) {
      if (stepId) {
        this.patchDetail(d => ({
          ...d,
          items: d.items.map(i => i.stepId === stepId ? { ...i, ...payload, lastUpdated: new Date().toISOString() } : i),
          stats: { ...d.stats, totalItems: d.items.length },
        }));
        this.pushActivity(`updated item '${payload.itemName}'`);
      } else {
        const nextId = Math.max(0, ...this.items().map(i => i.stepId)) + 1;
        const row: WirdCollectionItemRow = {
          stepId: nextId,
          orderIndex: this.items().length,
          contentItemId: nextId,
          itemName: payload.itemName,
          type: payload.type,
          count: payload.count,
          category: payload.category,
          status: payload.status ?? 'Published',
          lastUpdated: new Date().toISOString(),
        };
        this.patchDetail(d => ({
          ...d,
          items: [...d.items, row],
          stats: { ...d.stats, totalItems: d.items.length + 1 },
        }));
        this.pushActivity(`added item '${payload.itemName}'`);
      }
      this.showToast(stepId ? 'Item updated' : 'Item added', true);
      this.closeItemDrawer();
      return;
    }

    this.itemSaving.set(true);
    const req = stepId
      ? this.editor.updateCollectionItem(this.collectionId(), stepId, payload)
      : this.editor.addCollectionItem(this.collectionId(), payload);

    req.subscribe({
      next: () => {
        this.itemSaving.set(false);
        this.showToast(stepId ? 'Item updated' : 'Item added', true);
        this.closeItemDrawer();
        this.load();
      },
      error: () => {
        this.itemSaving.set(false);
        this.showToast('Could not save item', false);
      },
    });
  }

  deleteItem(item: WirdCollectionItemRow, event?: Event): void {
    event?.stopPropagation();
    if (!confirm(`Delete "${item.itemName}" from this collection?`)) return;

    if (this.usingFallback()) {
      this.patchDetail(d => ({
        ...d,
        items: d.items.filter(i => i.stepId !== item.stepId),
        stats: { ...d.stats, totalItems: Math.max(0, d.items.length - 1) },
      }));
      this.pushActivity(`removed item '${item.itemName}'`);
      this.showToast('Item deleted', true);
      return;
    }

    this.actionBusy.set('delete-item');
    this.editor.bulkCollectionItemAction(this.collectionId(), 'delete', [item.stepId]).subscribe({
      next: () => {
        this.showToast('Item deleted', true);
        this.actionBusy.set('');
        this.load();
      },
      error: () => {
        this.showToast('Delete failed', false);
        this.actionBusy.set('');
      },
    });
  }

  itemRowNumber(item: WirdCollectionItemRow, index: number): number {
    return (this.itemPage - 1) * this.itemPageSize + index + 1;
  }

  overviewItemNumber(index: number): number {
    return (this.overviewItemPage - 1) * this.overviewItemPageSize + index + 1;
  }

  itemTypeDot(type: string): string {
    const t = type.toLowerCase();
    if (t.includes('quran')) return 'dot--quran';
    if (t.includes('salawat')) return 'dot--salawat';
    if (t.includes('dua')) return 'dot--dua';
    if (t.includes('poem')) return 'dot--poem';
    return 'dot--dhikr';
  }

  activityIcon(action: string): string {
    const a = action.toLowerCase();
    if (a.includes('joined')) return '👤';
    if (a.includes('published') || a.includes('approved')) return '✓';
    if (a.includes('archived') || a.includes('draft')) return '📦';
    if (a.includes('updated') || a.includes('count')) return '✎';
    return '•';
  }

  formatActivityTitle(action: string): string {
    return action.charAt(0).toUpperCase() + action.slice(1);
  }

  chartLinePath(): string {
    const pts = this.overviewChartPoints();
    if (!pts.length) return '';
    const max = Math.max(1, ...pts.map(p => p.completions || p.usage));
    const w = 280;
    const h = 72;
    return pts.map((p, i) => {
      const x = (i / Math.max(pts.length - 1, 1)) * w;
      const y = h - ((p.completions || p.usage) / max) * (h - 8) - 4;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  chartAreaPath(): string {
    const line = this.chartLinePath();
    if (!line) return '';
    const pts = this.overviewChartPoints();
    const w = 280;
    const h = 72;
    return `${line} L${w},${h} L0,${h} Z`;
  }

  overviewPageNumbers(): number[] {
    const total = this.overviewItemPageCount();
    const current = this.overviewItemPage;
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  goOverviewItemPage(page: number): void {
    this.overviewItemPage = Math.min(Math.max(1, page), this.overviewItemPageCount());
  }

  private syncSettingsForm(c: WirdCollection): void {
    this.settingsForm = {
      name: c.name,
      tariqa: c.tariqa,
      type: c.type,
      recommendedTime: c.recommendedTime ?? '',
      description: c.description ?? '',
    };
  }

  private patchDetail(mutator: (d: WirdCollectionDetail) => WirdCollectionDetail): void {
    this.detail.update(d => {
      if (!d) return d;
      const next = mutator(d);
      this.persistFallback(next);
      return next;
    });
  }

  private applyLocalBulk(stepIds: number[], action: 'publish' | 'archive' | 'delete'): void {
    this.patchDetail(d => {
      let items = [...d.items];
      if (action === 'delete') {
        items = items.filter(i => !stepIds.includes(i.stepId));
      } else {
        const status = action === 'publish' ? 'Published' : 'Unpublished';
        items = items.map(i => stepIds.includes(i.stepId) ? { ...i, status } : i);
      }
      return { ...d, items, stats: { ...d.stats, totalItems: items.length } };
    });
  }

  private pushActivity(action: string): void {
    this.patchDetail(d => ({
      ...d,
      recentActivity: [
        { userId: '1', userName: 'Admin', userInitials: 'AD', action, at: new Date().toISOString() },
        ...d.recentActivity,
      ].slice(0, 12),
    }));
  }

  private persistFallback(d: WirdCollectionDetail): void {
    if (!this.usingFallback()) return;
    saveDemoCollection(d);
    this.refreshDemoCollectionsList();
  }

  private refreshDemoCollectionsList(): void {
    if (!this.usingFallback()) return;
    this.allCollections.set(listDemoCollectionSummaries([
      { id: 1, name: 'Khulasa Wird (Morning)', tariqa: 'BaAlawi', type: 'Daily' },
    ]));
  }

  private navigateAfterDelete(deletedId: number): void {
    const remaining = this.allCollections().filter(c => c.id !== deletedId);
    if (remaining.length) {
      void this.router.navigate(['/dashboard/content/awrad', remaining[0].id]);
      return;
    }
    void this.router.navigate(['/dashboard/content/awrad'], { queryParams: { list: 1 } });
  }

  private showToast(msg: string, ok: boolean): void {
    this.toast.set(msg);
    this.toastOk.set(ok);
    setTimeout(() => this.toast.set(''), 3200);
  }
}
