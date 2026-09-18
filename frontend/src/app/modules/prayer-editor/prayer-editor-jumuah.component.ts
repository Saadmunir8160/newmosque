import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PrayerEditorService } from '../../core/services/prayer-editor.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { JumuahTime } from '../../core/models';

const SLOT_LABELS: Record<number, string> = { 1: 'First Jumuah', 2: 'Second Jumuah', 3: 'Third Jumuah' };

@Component({
  selector: 'app-prayer-editor-jumuah',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <div class="ped">
      <header>
        <p class="ped-label">Prayer Times Editor</p>
        <h1 class="ped-title">Jumuah</h1>
        <p class="ped-sub">First, second and third Jumuah — khutbah and jamaat times.</p>
      </header>

      <section class="ped-card">
        <h2 class="ped-card__title">Add slot</h2>
        <div class="form-grid">
          <label class="field">Slot
            <select class="ped-input" [(ngModel)]="form.slotNumber">
              <option [ngValue]="1">First Jumuah</option>
              <option [ngValue]="2">Second Jumuah</option>
              <option [ngValue]="3">Third Jumuah</option>
            </select>
          </label>
          <label class="field">Khutbah
            <input class="ped-input" type="time" [(ngModel)]="form.khutbahTime" />
          </label>
          <label class="field">Jamaat
            <input class="ped-input" type="time" [(ngModel)]="form.jamaatTime" />
          </label>
          <button type="button" class="ped-btn self-end" (click)="add()">Add</button>
        </div>
      </section>

      <section class="ped-card" *ngFor="let j of jumuah(); trackBy: trackById">
        <div class="slot-row">
          <div>
            <h3 class="slot-title">{{ slotLabel(j.slotNumber) }}</h3>
            <p class="slot-meta">Khutbah {{ toInput(j.khutbahTime) }} · Jamaat {{ toInput(j.jamaatTime) }}</p>
          </div>
          <div class="slot-actions">
            <input
              class="ped-input ped-input--sm"
              type="time"
              [ngModel]="toInput(j.khutbahTime)"
              (ngModelChange)="patchSlot(j.id, { khutbahTime: toFull($event) })"
              [attr.aria-label]="slotLabel(j.slotNumber) + ' khutbah'" />
            <input
              class="ped-input ped-input--sm"
              type="time"
              [ngModel]="toInput(j.jamaatTime)"
              (ngModelChange)="patchSlot(j.id, { jamaatTime: toFull($event) })"
              [attr.aria-label]="slotLabel(j.slotNumber) + ' jamaat'" />
            <button type="button" class="ped-btn ped-btn--ghost" [disabled]="busyId() === j.id" (click)="update(j)">Save</button>
            <button type="button" class="ped-btn ped-btn--danger" [disabled]="busyId() === j.id" (click)="remove(j)">Remove</button>
          </div>
        </div>
      </section>

      <p *ngIf="!jumuah().length" class="ped-empty">No Jumuah slots configured yet.</p>
    </div>
  `,
  styles: [`
    :host { display: block; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .ped {
      --ped-ink: #0f172a; --ped-muted: #64748b; --ped-border: #e2e8f0;
      --ped-primary: #0f4c3a; --ped-primary-hover: #0a3d2e;
      display: flex; flex-direction: column; gap: 1.35rem; padding-bottom: 2rem; color: var(--ped-ink);
    }
    .ped-label { margin: 0; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ped-primary); }
    .ped-title { margin: 0.35rem 0 0; font-size: clamp(1.65rem, 3vw, 2rem); font-weight: 800; letter-spacing: -0.03em; color: var(--ped-ink); line-height: 1.15; }
    .ped-sub { margin: 0.4rem 0 0; font-size: 0.9rem; color: var(--ped-muted); max-width: 36rem; }
    .ped-card {
      background: #fff; border: 1px solid var(--ped-border); border-radius: 16px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); padding: 1.25rem;
    }
    .ped-card__title { margin: 0 0 0.85rem; font-size: 1.1rem; font-weight: 800; color: var(--ped-ink); letter-spacing: -0.02em; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; align-items: end; }
    .field { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ped-muted); }
    .ped-input {
      width: 100%; padding: 0.65rem 0.85rem; border-radius: 12px; border: 1px solid var(--ped-border);
      background: #fff; color: var(--ped-ink); font-size: 0.9rem; font-family: inherit; outline: none; box-sizing: border-box;
    }
    .ped-input:focus { border-color: var(--ped-primary); box-shadow: 0 0 0 3px rgba(15, 76, 58, 0.12); }
    .ped-input--sm { min-width: 7.5rem; width: auto; }
    .ped-btn {
      display: inline-flex; align-items: center; justify-content: center; padding: 0.65rem 1.15rem;
      border-radius: 999px; background: var(--ped-primary); color: #fff; font-size: 0.8125rem; font-weight: 700;
      border: none; cursor: pointer; font-family: inherit;
    }
    .ped-btn:hover { background: var(--ped-primary-hover); }
    .ped-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .ped-btn--ghost { background: #fff; color: var(--ped-ink); border: 1px solid var(--ped-border); }
    .ped-btn--ghost:hover:not(:disabled) { background: #f8fafc; }
    .ped-btn--danger { background: #fff; color: #b91c1c; border: 1px solid #fecaca; }
    .ped-btn--danger:hover:not(:disabled) { background: #fef2f2; }
    .self-end { align-self: end; }
    .slot-row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.85rem; }
    .slot-title { margin: 0; font-size: 1rem; font-weight: 800; color: var(--ped-ink); }
    .slot-meta { margin: 0.25rem 0 0; font-size: 0.85rem; color: var(--ped-muted); }
    .slot-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .ped-empty { margin: 0; color: var(--ped-muted); font-size: 0.9rem; }
  `],
})
export class PrayerEditorJumuahComponent implements OnInit {
  private editor = inject(PrayerEditorService);
  private mosqueCtx = inject(MosqueContextService);
  private snack = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  jumuah = signal<JumuahTime[]>([]);
  busyId = signal<number | null>(null);
  form = { slotNumber: 1, khutbahTime: '13:00', jamaatTime: '13:30' };
  private mosqueId = 1;

  ngOnInit(): void {
    const qId = parseInt(this.route.snapshot.queryParamMap.get('mosqueId') || '', 10);
    if (!isNaN(qId) && qId > 0) {
      this.mosqueId = qId;
      this.load();
    } else {
      this.mosqueCtx.resolve().then(id => { this.mosqueId = id; this.load(); });
    }
  }

  trackById = (_: number, j: JumuahTime) => j.id;
  slotLabel(n: number): string { return SLOT_LABELS[n] ?? `Slot ${n}`; }
  toInput(t: string): string { return t?.slice(0, 5) || ''; }
  toFull(v: string): string { return v?.length === 5 ? v + ':00' : v; }

  patchSlot(id: number, patch: Partial<Pick<JumuahTime, 'khutbahTime' | 'jamaatTime'>>): void {
    this.jumuah.update(list => list.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  load(): void {
    this.editor.getJumuah(this.mosqueId).subscribe({
      next: d => this.jumuah.set(d ?? []),
      error: () => this.jumuah.set([]),
    });
  }

  add(): void {
    this.editor.addJumuah(this.mosqueId, {
      slotNumber: this.form.slotNumber,
      khutbahTime: this.toFull(this.form.khutbahTime),
      jamaatTime: this.toFull(this.form.jamaatTime),
    }).subscribe({
      next: () => { this.load(); this.snack.open('Jumuah slot added', 'OK', { duration: 3000 }); },
      error: () => this.snack.open('Could not add slot (max 3, no duplicates)', 'OK', { duration: 4000 }),
    });
  }

  update(j: JumuahTime): void {
    if (!j?.id) {
      this.snack.open('Invalid slot — refresh and try again', 'OK', { duration: 4000 });
      return;
    }
    this.busyId.set(j.id);
    this.editor.updateJumuah(this.mosqueId, j.id, {
      slotNumber: j.slotNumber,
      khutbahTime: this.toFull(this.toInput(j.khutbahTime)),
      jamaatTime: this.toFull(this.toInput(j.jamaatTime)),
    }).subscribe({
      next: row => {
        this.busyId.set(null);
        this.jumuah.update(list => list.map(s => s.id === j.id ? { ...s, ...row } : s));
        this.snack.open('Saved', 'OK', { duration: 3000 });
      },
      error: () => {
        this.busyId.set(null);
        this.snack.open('Save failed', 'OK', { duration: 4000 });
      },
    });
  }

  remove(j: JumuahTime): void {
    if (!j?.id) return;
    if (!confirm(`Remove ${this.slotLabel(j.slotNumber)}?`)) return;
    this.busyId.set(j.id);
    this.editor.deleteJumuah(this.mosqueId, j.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.jumuah.update(list => list.filter(s => s.id !== j.id));
        this.snack.open('Removed', 'OK', { duration: 3000 });
      },
      error: () => {
        this.busyId.set(null);
        this.snack.open('Remove failed', 'OK', { duration: 4000 });
      },
    });
  }
}
