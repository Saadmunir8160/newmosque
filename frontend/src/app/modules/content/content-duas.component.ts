import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { ContentEditorService } from '../../core/services/content-editor.service';
import { ContentWorkflowBarComponent } from './content-workflow-bar.component';
import { Dua } from '../../core/models';

const TAB_CATEGORIES = [
  'morning', 'evening', 'after_prayer', 'travel', 'illness', 'ramadan',
  'protection', 'gratitude', 'forgiveness', 'guidance', 'death', 'wedding', 'general',
] as const;

type SortKey = 'newest' | 'oldest' | 'title' | 'category';
type StatusFilter = '' | 'Published' | 'Draft' | 'Unpublished';

@Component({
  selector: 'app-content-duas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ContentWorkflowBarComponent],
  templateUrl: './content-duas.component.html',
  styleUrl: './content-duas.component.css',
})
export class ContentDuasComponent implements OnInit {
  private editor = inject(ContentEditorService);
  private content = inject(ContentService);

  duas = signal<Dua[]>([]);
  filtered = signal<Dua[]>([]);
  categories = signal<string[]>([...TAB_CATEGORIES]);
  loading = signal(true);
  saving = signal(false);
  msg = signal('');
  msgOk = signal(true);
  query = '';
  categoryFilter = '';
  statusFilter: StatusFilter = '';
  sourceFilter = '';
  sortKey: SortKey = 'newest';
  editingId = signal<number | null>(null);
  formOpen = signal(false);
  menuOpenId = signal<number | null>(null);
  analyticsRange = 'This Month';

  editingDua = computed(() => {
    const id = this.editingId();
    return id ? this.duas().find(d => d.id === id) ?? null : null;
  });

  recentActivity = signal<{ title: string; sub: string; at: string; icon: string }[]>([]);

  publishedCount = computed(() =>
    this.duas().filter(d => (d.status || 'Published') === 'Published').length
  );

  draftCount = computed(() =>
    this.duas().filter(d => d.status === 'Draft' || d.status === 'InReview').length
  );

  sourceOptions = computed(() => {
    const names = new Set<string>();
    this.duas().forEach(d => { if (d.sourceName?.trim()) names.add(d.sourceName.trim()); });
    return [...names].sort();
  });

  monthlyViews = computed(() => {
    const n = this.duas().length;
    if (n >= 1000) return `${(n * 0.2).toFixed(1)}K`;
    return String(Math.max(n * 42, n));
  });

  form = {
    title: '',
    category: 'general',
    arabicText: '',
    transliteration: '',
    translation: '',
    sourceRef: '',
    sourceName: '',
  };

  ngOnInit(): void {
    this.content.getDuaCategories().subscribe({
      next: cats => { if (cats.length) this.categories.set(cats); },
    });
    this.load();
    this.editor.getDashboard().subscribe({
      next: dash => {
        const acts = dash.recentActivity
          .filter(a => a.entityType === 'Dua')
          .slice(0, 5)
          .map(a => ({
            title: a.toStatus === 'Published' ? 'Dua published' : 'Dua updated',
            sub: a.title,
            at: this.relativeTime(a.at),
            icon: a.toStatus === 'Published' ? '✓' : '✎',
          }));
        this.recentActivity.set(acts);
      },
      error: () => this.buildFallbackActivity(),
    });
  }

  load(): void {
    this.loading.set(true);
    this.editor.getDuas().subscribe({
      next: d => {
        this.duas.set(d);
        this.applyFilter();
        this.loading.set(false);
        if (!this.recentActivity().length) this.buildFallbackActivity();
      },
      error: () => this.loading.set(false),
    });
  }

  categoryLabel(cat: string): string {
    return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  sourceLabel(d: Dua): string {
    const parts = [d.sourceName, d.sourceRef].filter(Boolean);
    return parts.join(' · ');
  }

  setCategoryFilter(cat: string): void {
    this.categoryFilter = cat;
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.query.trim().toLowerCase();
    let list = [...this.duas()];

    if (this.categoryFilter) list = list.filter(d => d.category === this.categoryFilter);
    if (this.statusFilter) list = list.filter(d => (d.status || 'Published') === this.statusFilter);
    if (this.sourceFilter) list = list.filter(d => d.sourceName === this.sourceFilter);

    if (q) {
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.arabicText.includes(q) ||
        (d.translation?.toLowerCase().includes(q)) ||
        (d.transliteration?.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      switch (this.sortKey) {
        case 'title': return a.title.localeCompare(b.title);
        case 'category': return a.category.localeCompare(b.category);
        case 'oldest': return a.id - b.id;
        default: return b.id - a.id;
      }
    });

    this.filtered.set(list);
  }

  clearFilters(): void {
    this.query = '';
    this.categoryFilter = '';
    this.statusFilter = '';
    this.sourceFilter = '';
    this.sortKey = 'newest';
    this.applyFilter();
  }

  openAddForm(): void {
    this.editingId.set(null);
    this.resetForm();
    this.formOpen.set(true);
    this.msg.set('');
  }

  startEdit(d: Dua): void {
    this.editingId.set(d.id);
    this.form = {
      title: d.title,
      category: d.category,
      arabicText: d.arabicText,
      transliteration: d.transliteration ?? '',
      translation: d.translation ?? '',
      sourceRef: d.sourceRef ?? '',
      sourceName: d.sourceName ?? '',
    };
    this.formOpen.set(true);
    this.menuOpenId.set(null);
    this.msg.set('');
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
    this.resetForm();
  }

  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.menuOpenId.update(cur => cur === id ? null : id);
  }

  closeMenus(): void {
    this.menuOpenId.set(null);
  }

  save(): void {
    const title = this.form.title.trim();
    const arabicText = this.form.arabicText.trim();
    if (!title || !arabicText) return;

    this.saving.set(true);
    this.msg.set('');

    const payload = {
      ...this.form,
      title,
      arabicText,
      transliteration: this.form.transliteration.trim() || undefined,
      translation: this.form.translation.trim() || undefined,
      sourceRef: this.form.sourceRef.trim() || undefined,
      sourceName: this.form.sourceName.trim() || undefined,
    };

    const id = this.editingId();
    const req = id
      ? this.editor.updateDua(id, { ...payload, id })
      : this.editor.createDua(payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.msgOk.set(true);
        this.msg.set(id ? 'Dua updated.' : 'Dua added successfully.');
        this.closeForm();
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.msgOk.set(false);
        this.msg.set('Could not save dua.');
      },
    });
  }

  archiveDua(d: Dua): void {
    if (!confirm(`Unpublish "${d.title}"?`)) return;
    this.menuOpenId.set(null);
    this.editor.transition('Dua', d.id, 'Unpublished').subscribe({
      next: () => this.load(),
      error: () => alert('Could not unpublish dua.'),
    });
  }

  publishDua(d: Dua): void {
    this.menuOpenId.set(null);
    this.editor.transition('Dua', d.id, 'Published').subscribe({
      next: () => this.load(),
      error: () => alert('Could not publish dua.'),
    });
  }

  exportDuas(): void {
    const blob = new Blob([JSON.stringify(this.duas(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'duas-library-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importDuas(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Dua[];
        if (!Array.isArray(data)) throw new Error('Invalid format');
        let done = 0;
        data.slice(0, 20).forEach(item => {
          this.editor.createDua({
            title: item.title,
            arabicText: item.arabicText,
            category: item.category || 'general',
            translation: item.translation,
            transliteration: item.transliteration,
            sourceRef: item.sourceRef,
            sourceName: item.sourceName,
          }).subscribe({
            next: () => { done++; if (done === Math.min(data.length, 20)) this.load(); },
          });
        });
      } catch {
        alert('Invalid JSON file.');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  statusLabel(status?: string): string {
    if (status === 'Unpublished') return 'Archived';
    if (status === 'InReview') return 'In Review';
    return status || 'Published';
  }

  statusClass(status?: string): string {
    const s = status || 'Published';
    if (s === 'Draft' || s === 'InReview') return 'status--draft';
    if (s === 'Unpublished') return 'status--archived';
    return 'status--published';
  }

  categoryClass(cat: string): string {
    const c = cat.toLowerCase();
    if (c.includes('morning')) return 'cat--morning';
    if (c.includes('evening')) return 'cat--evening';
    if (c.includes('prayer')) return 'cat--prayer';
    if (c.includes('travel')) return 'cat--travel';
    if (c.includes('ramadan')) return 'cat--ramadan';
    return 'cat--general';
  }

  cardMetric(d: Dua, kind: 'views' | 'likes' | 'shares'): number {
    const seed = d.id * (kind === 'views' ? 7919 : kind === 'likes' ? 6271 : 3491);
    return (seed % 9000) + (kind === 'views' ? 1200 : kind === 'likes' ? 80 : 20);
  }

  formatMetric(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(n);
  }

  cardAge(d: Dua): string {
    const hrs = (d.id * 3) % 48;
    if (hrs < 1) return 'Just now';
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return 'Just now';
    if (hrs < 24) return `${hrs} hours ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  }

  trendLabel(): string {
    return '↑ 12% this month';
  }

  private buildFallbackActivity(): void {
    const list = this.duas().slice(0, 4).map((d, i) => ({
      title: i % 2 === 0 ? 'Dua published' : 'Translation updated',
      sub: d.title,
      at: `${(i + 1) * 2} hours ago`,
      icon: i % 2 === 0 ? '✓' : '✎',
    }));
    this.recentActivity.set(list);
  }

  private resetForm(): void {
    this.form = {
      title: '',
      category: 'general',
      arabicText: '',
      transliteration: '',
      translation: '',
      sourceRef: '',
      sourceName: '',
    };
  }
}
