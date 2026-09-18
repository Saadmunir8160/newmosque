import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  PrayerEditorService, RamadanTimetable, RamadanDayEntry, PrayerSpecialTiming
} from '../../core/services/prayer-editor.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { appDateString } from '../../core/utils/date.utils';

@Component({
  selector: 'app-prayer-editor-ramadan',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <div class="ped">
      <header>
        <p class="ped-label">Prayer Times Editor</p>
        <h1 class="ped-title">Ramadan</h1>
        <p class="ped-sub">Ramadan timetable and special timings.</p>
      </header>

      <section class="ped-card">
        <div class="toolbar">
          <div>
            <h2 class="ped-card__title">Timetable {{ year }}</h2>
            <span *ngIf="timetable()?.status as st" class="ped-badge"
              [class.ped-badge--ok]="st === 'Published'"
              [class.ped-badge--draft]="st === 'Draft'">{{ st }}</span>
          </div>
          <button *ngIf="!timetable()" type="button" class="ped-btn" (click)="createTimetable()">Create timetable</button>
          <button *ngIf="timetable()" type="button" class="ped-btn ped-btn--outline" (click)="publish()">Publish timetable</button>
        </div>
      </section>

      <section class="ped-card" *ngIf="timetable() as tt">
        <h2 class="ped-card__title">Edit day</h2>
        <div class="form-grid">
          <label class="field">Day #<input class="ped-input" type="number" min="1" max="30" [(ngModel)]="dayForm.dayNumber" /></label>
          <label class="field">Date<input class="ped-input" type="date" [(ngModel)]="dayForm.date" /></label>
          <label class="field">Suhoor end<input class="ped-input" type="time" [(ngModel)]="dayForm.suhoorEnd" /></label>
          <label class="field">Iftar jamaat<input class="ped-input" type="time" [(ngModel)]="dayForm.iftarJamaat" /></label>
          <label class="field">Taraweeh<input class="ped-input" type="time" [(ngModel)]="dayForm.taraweehJamaat" /></label>
          <button type="button" class="ped-btn self-end" (click)="saveDay(tt.id)">Save day</button>
        </div>
        <div class="table-wrap" *ngIf="tt.days?.length">
          <table>
            <thead><tr><th>Day</th><th>Date</th><th>Suhoor</th><th>Iftar</th><th>Taraweeh</th></tr></thead>
            <tbody>
              <tr *ngFor="let d of tt.days">
                <td>{{ d.dayNumber }}</td>
                <td>{{ d.date }}</td>
                <td>{{ d.suhoorEnd?.slice(0,5) }}</td>
                <td>{{ d.iftarJamaat?.slice(0,5) }}</td>
                <td>{{ d.taraweehJamaat?.slice(0,5) || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="ped-card">
        <h2 class="ped-card__title">Special timings</h2>
        <div class="form-grid mb">
          <label class="field">Date<input class="ped-input" type="date" [(ngModel)]="specialForm.date" /></label>
          <label class="field">Label<input class="ped-input" [(ngModel)]="specialForm.label" placeholder="Eid prep, Laylat al-Qadr…" /></label>
          <label class="field">Time<input class="ped-input" type="time" [(ngModel)]="specialForm.time" /></label>
          <label class="check self-end"><input type="checkbox" [(ngModel)]="specialForm.isRamadan" /> Ramadan</label>
          <button type="button" class="ped-btn self-end" (click)="addSpecial()">Add</button>
        </div>
        <div *ngFor="let s of specials()" class="row">
          <span>{{ s.date }} — {{ s.label }} at {{ s.time.slice(0,5) }}</span>
          <button type="button" class="ped-btn ped-btn--danger" (click)="removeSpecial(s.id)">Remove</button>
        </div>
      </section>
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
    .ped-card__title { margin: 0 0 0.85rem; font-size: 1.1rem; font-weight: 800; color: var(--ped-ink); letter-spacing: -0.02em; display: inline-block; margin-right: 0.5rem; }
    .toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.85rem; }
    .toolbar .ped-card__title { margin-bottom: 0.35rem; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem; align-items: end; }
    .mb { margin-bottom: 0.85rem; }
    .field { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ped-muted); }
    .ped-input {
      width: 100%; padding: 0.65rem 0.85rem; border-radius: 12px; border: 1px solid var(--ped-border);
      background: #fff; color: var(--ped-ink); font-size: 0.9rem; font-family: inherit; outline: none; box-sizing: border-box;
    }
    .ped-input:focus { border-color: var(--ped-primary); box-shadow: 0 0 0 3px rgba(15, 76, 58, 0.12); }
    .ped-btn {
      display: inline-flex; align-items: center; justify-content: center; padding: 0.65rem 1.15rem;
      border-radius: 999px; background: var(--ped-primary); color: #fff; font-size: 0.8125rem; font-weight: 700;
      border: none; cursor: pointer; font-family: inherit;
    }
    .ped-btn:hover { background: var(--ped-primary-hover); }
    .ped-btn--outline { background: #fff; color: var(--ped-primary); border: 1px solid rgba(15, 76, 58, 0.28); }
    .ped-btn--outline:hover { background: rgba(15, 76, 58, 0.06); }
    .ped-btn--danger { background: #fff; color: #b91c1c; border: 1px solid #fecaca; }
    .ped-btn--danger:hover { background: #fef2f2; }
    .self-end { align-self: end; }
    .check { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #334155; font-weight: 600; text-transform: none; letter-spacing: 0; }
    .ped-badge {
      display: inline-flex; padding: 0.3rem 0.65rem; border-radius: 999px;
      font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
      background: #f1f5f9; color: #475569;
    }
    .ped-badge--ok { background: rgba(22, 101, 52, 0.12); color: #166534; }
    .ped-badge--draft { background: rgba(180, 83, 9, 0.12); color: #92400e; }
    .table-wrap { overflow: auto; margin-top: 1rem; border: 1px solid var(--ped-border); border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--ped-border); text-align: left; color: var(--ped-ink); }
    th { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ped-muted); background: #f8fafc; }
    .row {
      display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap;
      padding: 0.7rem 0; border-bottom: 1px solid var(--ped-border); font-size: 0.9rem; color: var(--ped-ink);
    }
    .row:last-child { border-bottom: none; }
  `],
})
export class PrayerEditorRamadanComponent implements OnInit {
  private editor = inject(PrayerEditorService);
  private mosqueCtx = inject(MosqueContextService);
  private snack = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  timetable = signal<RamadanTimetable | null>(null);
  specials = signal<PrayerSpecialTiming[]>([]);
  year = new Date().getFullYear();
  private mosqueId = 1;

  dayForm: RamadanDayEntry = {
    dayNumber: 1,
    date: appDateString(),
    suhoorEnd: '04:30:00',
    iftarJamaat: '19:45:00',
    taraweehJamaat: '21:00:00',
  };

  specialForm = {
    date: appDateString(),
    label: '',
    time: '20:00',
    isRamadan: true,
  };

  ngOnInit(): void {
    const qId = parseInt(this.route.snapshot.queryParamMap.get('mosqueId') || '', 10);
    if (!isNaN(qId) && qId > 0) {
      this.mosqueId = qId;
      this.load();
    } else {
      this.mosqueCtx.resolve().then(id => { this.mosqueId = id; this.load(); });
    }
  }

  load(): void {
    this.editor.getRamadan(this.mosqueId, this.year).subscribe({
      next: t => this.timetable.set(t),
      error: () => this.timetable.set(null),
    });
    this.editor.getSpecialTimings(this.mosqueId, this.year).subscribe(s => this.specials.set(s));
  }

  createTimetable(): void {
    this.editor.createRamadan(this.mosqueId, { year: this.year, title: `Ramadan ${this.year}` }).subscribe({
      next: t => { this.timetable.set(t); this.snack.open('Timetable created', 'OK', { duration: 3000 }); },
      error: (err) => {
        const msg = err?.error?.message
          || (err?.status === 409 ? 'Timetable may already exist' : null)
          || 'Could not create timetable.';
        this.snack.open(msg, 'OK', { duration: 4500 });
      },
    });
  }

  saveDay(timetableId: number): void {
    const payload = {
      ...this.dayForm,
      suhoorEnd: this.toFull(this.dayForm.suhoorEnd),
      iftarJamaat: this.toFull(this.dayForm.iftarJamaat),
      taraweehJamaat: this.dayForm.taraweehJamaat ? this.toFull(this.dayForm.taraweehJamaat) : undefined,
    };
    this.editor.upsertRamadanDay(this.mosqueId, timetableId, payload).subscribe({
      next: () => { this.load(); this.snack.open('Day saved', 'OK', { duration: 3000 }); },
      error: () => this.snack.open('Save failed', 'OK', { duration: 4000 }),
    });
  }

  publish(): void {
    const tt = this.timetable();
    if (!tt) return;
    this.editor.publishRamadan(this.mosqueId, tt.id).subscribe({
      next: t => { this.timetable.set(t); this.snack.open('Ramadan timetable published', 'OK', { duration: 3000 }); },
      error: () => this.snack.open('Publish failed', 'OK', { duration: 4000 }),
    });
  }

  addSpecial(): void {
    this.editor.addSpecialTiming(this.mosqueId, {
      date: this.specialForm.date,
      label: this.specialForm.label,
      time: this.toFull(this.specialForm.time),
      isRamadan: this.specialForm.isRamadan,
    }).subscribe({
      next: () => { this.load(); this.specialForm.label = ''; },
      error: () => this.snack.open('Could not add timing', 'OK', { duration: 4000 }),
    });
  }

  removeSpecial(id: number): void {
    this.editor.deleteSpecialTiming(this.mosqueId, id).subscribe(() => this.load());
  }

  private toFull(v: string): string { return v?.length === 5 ? v + ':00' : v; }
}
