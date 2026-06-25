import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContentService, RitualGuide, RitualGuideDetail, RitualStep } from '../../core/services/content.service';

const GUIDE_TYPES = ['Wudu', 'Ghusl', 'Salah', 'Other'] as const;
type TypeFilter = '' | (typeof GUIDE_TYPES)[number];
type SortKey = 'recent' | 'title' | 'steps';
type PanelMode = 'create' | 'edit' | 'add-step' | 'view' | null;

@Component({
  selector: 'app-content-ritual-guides',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './content-ritual-guides.component.html',
  styleUrl: './content-ritual-guides.component.css',
})
export class ContentRitualGuidesComponent implements OnInit {
  private content = inject(ContentService);

  readonly guideTypes = GUIDE_TYPES;

  guides = signal<RitualGuide[]>([]);
  expandedDetail = signal<RitualGuideDetail | null>(null);
  loading = signal(true);
  detailLoading = signal(false);
  saving = signal(false);
  toast = signal('');
  toastOk = signal(true);

  typeFilter: TypeFilter = '';
  sortBy: SortKey = 'recent';
  query = '';

  panelMode = signal<PanelMode>(null);
  activeGuide = signal<RitualGuide | null>(null);
  expandedStepId = signal<number | null>(null);

  form = { title: '', type: 'Wudu' as string };
  step = { title: '', description: '', orderIndex: 1 };

  filteredGuides = computed(() => {
    const q = this.query.trim().toLowerCase();
    const f = this.typeFilter;
    let list = [...this.guides()];
    if (f) list = list.filter(g => g.type === f);
    if (q) {
      list = list.filter(g =>
        g.title.toLowerCase().includes(q) || g.type.toLowerCase().includes(q)
      );
    }
    switch (this.sortBy) {
      case 'title':
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'steps':
        list.sort((a, b) => (b.stepCount ?? 0) - (a.stepCount ?? 0));
        break;
      default:
        list.sort((a, b) => {
          const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
          const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
          return tb - ta;
        });
    }
    return list;
  });

  wuduCount = computed(() => this.guides().filter(g => g.type === 'Wudu').length);
  ghuslCount = computed(() => this.guides().filter(g => g.type === 'Ghusl').length);
  salahCount = computed(() => this.guides().filter(g => g.type === 'Salah').length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.content.getRitualGuides().subscribe({
      next: g => {
        this.guides.set(g);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showToast('Could not load guides', false);
      },
    });
  }

  typeClass(type: string): string {
    const t = type.toLowerCase();
    if (t === 'ghusl') return 'type--ghusl';
    if (t === 'salah') return 'type--salah';
    if (t === 'other') return 'type--other';
    return 'type--wudu';
  }

  stepCount(g: RitualGuide): number {
    return g.stepCount ?? 0;
  }

  formatUpdated(g: RitualGuide): string {
    const iso = g.updatedAt ?? g.createdAt;
    if (!iso) return 'Recently';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'Updated today';
    if (days === 1) return 'Updated yesterday';
    if (days < 7) return `Updated ${days} days ago`;
    if (days < 30) return `Updated ${Math.floor(days / 7)} weeks ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  openCreate(): void {
    this.form = { title: '', type: 'Wudu' };
    this.panelMode.set('create');
  }

  openEdit(g: RitualGuide, event?: Event): void {
    event?.stopPropagation();
    this.activeGuide.set(g);
    this.form = { title: g.title, type: g.type };
    this.panelMode.set('edit');
  }

  openView(g: RitualGuide, event?: Event): void {
    event?.stopPropagation();
    this.activeGuide.set(g);
    this.panelMode.set('view');
    if (this.expandedDetail()?.id !== g.id) {
      this.loadDetail(g.id);
    }
  }

  openAddStep(g: RitualGuide, event?: Event): void {
    event?.stopPropagation();
    this.activeGuide.set(g);
    const count = this.expandedDetail()?.id === g.id
      ? this.expandedDetail()!.steps.length
      : (g.stepCount ?? 0);
    this.step = { title: '', description: '', orderIndex: count + 1 };
    this.panelMode.set('add-step');
    if (this.expandedDetail()?.id !== g.id) this.loadDetail(g.id);
  }

  editFromView(): void {
    const g = this.activeGuide();
    if (!g) return;
    this.form = { title: g.title, type: g.type };
    this.panelMode.set('edit');
  }

  closePanel(): void {
    this.dismissPanel();
  }

  dismissPanel(): void {
    this.panelMode.set(null);
    this.activeGuide.set(null);
  }

  toggleExpand(g: RitualGuide): void {
    if (this.expandedDetail()?.id === g.id) {
      this.expandedDetail.set(null);
      this.expandedStepId.set(null);
      this.activeGuide.set(null);
      return;
    }
    this.activeGuide.set(g);
    this.loadDetail(g.id);
  }

  toggleStepExpand(stepId: number): void {
    this.expandedStepId.update(id => id === stepId ? null : stepId);
  }

  private loadDetail(id: number): void {
    this.detailLoading.set(true);
    this.content.getRitualGuide(id).subscribe({
      next: d => {
        this.expandedDetail.set(d);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
        this.showToast('Could not load guide details', false);
      },
    });
  }

  saveGuide(): void {
    if (!this.form.title.trim()) return;
    this.saving.set(true);
    const payload = { title: this.form.title.trim(), type: this.form.type };
    const mode = this.panelMode();
    const edit = this.activeGuide();

    const req = mode === 'edit' && edit
      ? this.content.updateRitualGuide(edit.id, payload)
      : this.content.createRitualGuide(payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showToast(mode === 'edit' ? 'Guide updated' : 'Guide created', true);
        this.dismissPanel();
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.showToast('Save failed', false);
      },
    });
  }

  deleteGuide(g: RitualGuide, event?: Event): void {
    event?.stopPropagation();
    if (!confirm(`Delete "${g.title}"? All steps will be removed.`)) return;
    this.content.deleteRitualGuide(g.id).subscribe({
      next: () => {
        if (this.expandedDetail()?.id === g.id) this.expandedDetail.set(null);
        this.showToast('Guide deleted', true);
        this.load();
      },
      error: () => this.showToast('Delete failed', false),
    });
  }

  saveStep(): void {
    const g = this.activeGuide();
    if (!g || !this.step.title.trim()) return;
    this.saving.set(true);
    this.content.addRitualStep(g.id, this.step).subscribe({
      next: () => {
        this.saving.set(false);
        this.showToast('Step added', true);
        this.dismissPanel();
        this.load();
        this.loadDetail(g.id);
      },
      error: () => {
        this.saving.set(false);
        this.showToast('Could not add step', false);
      },
    });
  }

  deleteStep(step: RitualStep, event?: Event): void {
    event?.stopPropagation();
    const guideId = this.expandedDetail()?.id;
    if (!guideId || !confirm(`Delete step "${step.title}"?`)) return;
    this.content.deleteRitualStep(guideId, step.id).subscribe({
      next: () => {
        this.showToast('Step deleted', true);
        this.load();
        this.loadDetail(guideId);
      },
      error: () => this.showToast('Delete failed', false),
    });
  }

  private showToast(msg: string, ok: boolean): void {
    this.toast.set(msg);
    this.toastOk.set(ok);
    setTimeout(() => this.toast.set(''), 3200);
  }
}
