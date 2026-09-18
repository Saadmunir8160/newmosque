import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PrayerEditorService, PrayerException } from '../../core/services/prayer-editor.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { appDateString } from '../../core/utils/date.utils';

const CATEGORIES = ['Ramadan', 'Eid', 'Friday', 'Special Event', 'Other'] as const;
const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

@Component({
  selector: 'app-prayer-editor-exceptions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <div class="ped">
      <header>
        <p class="ped-label">Prayer Times Editor</p>
        <h1 class="ped-title">Exceptions</h1>
        <p class="ped-sub">Override start or jamaah on special dates. Public and monthly timetables apply these automatically.</p>
      </header>

      <section class="ped-card">
        <h2 class="ped-card__title">Add exception</h2>
        <div class="form-grid">
          <label class="field">Date
            <input class="ped-input" type="date" [(ngModel)]="form.date" />
          </label>
          <label class="field">Category
            <select class="ped-input" [(ngModel)]="form.category">
              <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
            </select>
          </label>
          <label class="field">Prayer
            <select class="ped-input" [(ngModel)]="form.prayer">
              <option *ngFor="let p of prayers" [value]="p">{{ p }}</option>
            </select>
          </label>
          <label class="field">Override field
            <select class="ped-input" [(ngModel)]="form.field">
              <option value="jamaat">Jamaah time</option>
              <option value="start">Start time</option>
            </select>
          </label>
          <label class="field">Override time
            <input class="ped-input" type="time" [(ngModel)]="form.overrideValue" />
          </label>
          <label class="field field--wide">Notes (optional)
            <input class="ped-input" type="text" [(ngModel)]="form.notes" placeholder="e.g. Taraweeh start" />
          </label>
          <button type="button" class="ped-btn self-end" [disabled]="busy()" (click)="add()">Add exception</button>
        </div>
      </section>

      <section class="ped-card">
        <h2 class="ped-card__title">Configured exceptions</h2>
        <div *ngFor="let ex of exceptions()" class="row">
          <div>
            <strong>{{ ex.date | date:'mediumDate' }}</strong>
            — {{ displayPrayer(ex.prayer) }}
            → {{ (ex.overrideValue || '').slice(0,5) }}
            <span *ngIf="ex.reason" class="muted"> ({{ ex.reason }})</span>
          </div>
          <button type="button" class="ped-btn ped-btn--danger" (click)="remove(ex.id)">Remove</button>
        </div>
        <p *ngIf="!exceptions().length" class="muted">No exceptions configured.</p>
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
    .ped-sub { margin: 0.4rem 0 0; font-size: 0.9rem; color: var(--ped-muted); max-width: 40rem; }
    .ped-card {
      background: #fff; border: 1px solid var(--ped-border); border-radius: 16px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); padding: 1.25rem;
    }
    .ped-card__title { margin: 0 0 0.85rem; font-size: 1.1rem; font-weight: 800; color: var(--ped-ink); letter-spacing: -0.02em; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; align-items: end; }
    .field { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ped-muted); }
    .field--wide { grid-column: 1 / -1; }
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
    .ped-btn:hover:not(:disabled) { background: var(--ped-primary-hover); }
    .ped-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .ped-btn--danger { background: #fff; color: #b91c1c; border: 1px solid #fecaca; }
    .ped-btn--danger:hover { background: #fef2f2; }
    .self-end { align-self: end; }
    .row {
      display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap;
      padding: 0.7rem 0; border-bottom: 1px solid var(--ped-border); font-size: 0.9rem; color: var(--ped-ink);
    }
    .row:last-of-type { border-bottom: none; }
    .muted { color: var(--ped-muted); font-size: 0.85rem; }
  `],
})
export class PrayerEditorExceptionsComponent implements OnInit {
  private editor = inject(PrayerEditorService);
  private mosqueCtx = inject(MosqueContextService);
  private snack = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  exceptions = signal<PrayerException[]>([]);
  busy = signal(false);
  categories = CATEGORIES;
  prayers = PRAYERS;
  form = {
    date: appDateString(),
    category: 'Ramadan' as string,
    prayer: 'Isha',
    field: 'jamaat' as 'jamaat' | 'start',
    overrideValue: '22:00',
    notes: '',
  };
  private mosqueId = 1;

  ngOnInit(): void {
    const qId = parseInt(this.route.snapshot.queryParamMap.get('mosqueId') || '', 10);
    if (!isNaN(qId) && qId > 0) {
      this.mosqueId = qId;
      this.load();
    } else {
      this.mosqueCtx.resolve().then(id => {
        this.mosqueId = id;
        this.load();
      });
    }
  }

  displayPrayer(prayer: string): string {
    const p = (prayer || '').trim();
    if (/start$/i.test(p)) return p.replace(/start$/i, ' Start');
    if (/jamaat$/i.test(p)) return p.replace(/jamaat$/i, ' Jamaah');
    return `${p} Jamaah`;
  }

  load(): void {
    this.editor.getExceptions(this.mosqueId).subscribe({
      next: list => this.exceptions.set(list ?? []),
      error: () => this.exceptions.set([]),
    });
  }

  add(): void {
    if (!this.form.date || !this.form.prayer || !this.form.overrideValue) {
      this.snack.open('Date, prayer and override time are required.', 'OK', { duration: 3000 });
      return;
    }
    this.busy.set(true);
    const time = this.form.overrideValue.length === 5 ? this.form.overrideValue + ':00' : this.form.overrideValue;
    const prayerKey = this.form.field === 'start' ? `${this.form.prayer}Start` : this.form.prayer;
    const reasonParts = [this.form.category, this.form.notes.trim()].filter(Boolean);
    this.editor.addException(this.mosqueId, {
      date: this.form.date,
      prayer: prayerKey,
      overrideValue: time,
      reason: reasonParts.join(' — ') || undefined,
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.form.notes = '';
        this.load();
        this.snack.open('Exception added — public timetable will use this override.', 'OK', { duration: 3500 });
      },
      error: (err) => {
        this.busy.set(false);
        this.snack.open(err?.error?.message ?? 'Could not add exception.', 'OK', { duration: 4000 });
      },
    });
  }

  remove(id: number): void {
    if (!id) return;
    if (!confirm('Remove this exception?')) return;
    this.busy.set(true);
    this.editor.deleteException(this.mosqueId, id).subscribe({
      next: () => {
        this.busy.set(false);
        this.exceptions.update(list => list.filter(e => e.id !== id));
        this.snack.open('Exception removed.', 'OK', { duration: 2500 });
      },
      error: () => {
        this.busy.set(false);
        this.snack.open('Could not remove exception.', 'OK', { duration: 3000 });
      },
    });
  }
}
