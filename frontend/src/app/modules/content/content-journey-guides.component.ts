import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { ContentService, JourneyGuide, JourneyGuideDetail } from '../../core/services/content.service';

const GUIDE_TYPES = ['Umrah', 'Hajj'] as const;

@Component({
  selector: 'app-content-journey-guides',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Content Editor" title="Umrah & Hajj Guides"
      subtitle="Create and manage journey guides with stages." />

    <p *ngIf="toast()" class="text-sm mb-3" [class.text-green-400]="toastOk()" [class.text-red-400]="!toastOk()">{{ toast() }}</p>

    <section class="mb-6 p-4 rounded-xl border border-mos-border bg-mos-surface">
      <h3 class="text-white font-bold mb-3">New guide</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input class="input" placeholder="Title" [(ngModel)]="form.title">
        <select class="input" [(ngModel)]="form.type">
          <option *ngFor="let t of guideTypes" [value]="t">{{ t }}</option>
        </select>
        <button type="button" class="btn" [disabled]="saving() || !form.title.trim()" (click)="createGuide()">Create guide</button>
      </div>
    </section>

    <div *ngIf="loading()" class="text-mos-muted text-sm">Loading guides…</div>

    <div class="space-y-4">
      <article *ngFor="let g of guides()" class="p-4 rounded-xl border border-mos-border bg-mos-surface">
        <div class="flex flex-wrap justify-between gap-2 mb-2">
          <div>
            <span class="text-xs uppercase text-mos-gold font-semibold">{{ g.type }}</span>
            <h3 class="text-white font-bold">{{ g.title }}</h3>
          </div>
          <button type="button" class="btn-secondary" (click)="loadDetail(g.id)">Manage stages</button>
        </div>

        <div *ngIf="expandedId() === g.id && detail() as d" class="mt-3 pt-3 border-t border-mos-border">
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
            <input class="input" placeholder="Stage title" [(ngModel)]="stageForm.title">
            <input class="input sm:col-span-2" placeholder="Description" [(ngModel)]="stageForm.description">
            <div class="flex gap-2">
              <button type="button" class="btn flex-1" [disabled]="!stageForm.title.trim() || savingStage()" (click)="saveStage(g.id)">{{ editingStageId() ? 'Save' : 'Add' }}</button>
              <button type="button" *ngIf="editingStageId()" class="btn-secondary flex-1" (click)="cancelEdit()">Cancel</button>
            </div>
          </div>
          <ol class="space-y-2">
            <li *ngFor="let s of d.stages" class="text-sm text-mos-muted flex justify-between items-start">
              <div>
                <strong class="text-white">{{ s.orderIndex }}. {{ s.title }}</strong>
                <span *ngIf="s.description"> — {{ s.description }}</span>
              </div>
              <button type="button" class="btn-secondary text-xs py-1 px-2 ml-2" (click)="startEdit(s)">Edit</button>
            </li>
          </ol>
          <p *ngIf="!d.stages?.length" class="text-mos-muted text-sm">No stages yet.</p>
        </div>
      </article>
    </div>

    <p *ngIf="!loading() && !guides().length" class="text-mos-muted text-sm">No journey guides yet.</p>
  `,
  styles: [`
    .input { background: #0F172A; border: 1px solid #334155; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; padding: 10px 16px; border-radius: 8px; border: none; cursor: pointer; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: transparent; border: 1px solid #64748b; color: #e2e8f0; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8125rem; }
  `]
})
export class ContentJourneyGuidesComponent implements OnInit {
  private content = inject(ContentService);

  readonly guideTypes = GUIDE_TYPES;
  guides = signal<JourneyGuide[]>([]);
  detail = signal<JourneyGuideDetail | null>(null);
  expandedId = signal<number | null>(null);
  loading = signal(true);
  saving = signal(false);
  toast = signal('');
  toastOk = signal(true);
  form = { title: '', type: 'Umrah' as string };
  stageForm = { title: '', description: '', orderIndex: 1 };
  editingStageId = signal<number | null>(null);
  savingStage = signal(false);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.content.getJourneyGuides().subscribe({
      next: list => { this.guides.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createGuide(): void {
    this.saving.set(true);
    this.content.createJourneyGuide({ title: this.form.title.trim(), type: this.form.type }).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.title = '';
        this.showToast('Guide created.', true);
        this.load();
      },
      error: () => { this.saving.set(false); this.showToast('Could not create guide.', false); },
    });
  }

  loadDetail(id: number): void {
    if (this.expandedId() === id) {
      this.expandedId.set(null);
      this.detail.set(null);
      return;
    }
    this.expandedId.set(id);
    this.content.getJourneyGuide(id).subscribe({
      next: d => {
        this.detail.set(d);
        this.cancelEdit(); // Reset form but keep expandedId
        this.stageForm.orderIndex = (d.stages?.length ?? 0) + 1;
      },
      error: () => this.showToast('Could not load guide.', false),
    });
  }

  startEdit(stage: any): void {
    this.editingStageId.set(stage.id);
    this.stageForm = {
      title: stage.title,
      description: stage.description || '',
      orderIndex: stage.orderIndex
    };
  }

  cancelEdit(): void {
    this.editingStageId.set(null);
    this.stageForm = { title: '', description: '', orderIndex: (this.detail()?.stages?.length ?? 0) + 1 };
  }

  saveStage(guideId: number): void {
    const payload = {
      title: this.stageForm.title.trim(),
      description: this.stageForm.description.trim(),
      orderIndex: this.stageForm.orderIndex,
    };
    this.savingStage.set(true);
    const id = this.editingStageId();
    
    const req = id
      ? this.content.updateJourneyStage(guideId, id, payload)
      : this.content.addJourneyStage(guideId, payload);

    req.subscribe({
      next: () => {
        this.savingStage.set(false);
        this.loadDetail(guideId);
        this.showToast(id ? 'Stage updated.' : 'Stage added.', true);
      },
      error: () => {
        this.savingStage.set(false);
        this.showToast(id ? 'Could not update stage.' : 'Could not add stage.', false);
      },
    });
  }

  private showToast(msg: string, ok: boolean): void {
    this.toast.set(msg);
    this.toastOk.set(ok);
  }
}
