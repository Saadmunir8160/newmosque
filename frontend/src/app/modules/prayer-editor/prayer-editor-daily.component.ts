import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PrayerEditorService } from '../../core/services/prayer-editor.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { PrayerTimesDaily } from '../../core/models';

@Component({
  selector: 'app-prayer-editor-daily',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatChipsModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule,
  ],
  template: `
    <div class="editor-page">
      <header class="editor-head">
        <p class="editor-badge">Prayer Times Editor</p>
        <h1 class="editor-title">Daily Prayers</h1>
        <p class="editor-sub">Fajr, Dhuhr, Asr, Maghrib, Isha — start and jamaat times.</p>
      </header>

      <div class="flex flex-wrap gap-3 items-center mb-4">
        <mat-form-field appearance="outline" class="pe-field">
          <mat-label>Date</mat-label>
          <input matInput type="date" [(ngModel)]="selectedDate" (ngModelChange)="load()" />
        </mat-form-field>
        <mat-chip *ngIf="times()?.status" [highlighted]="times()?.status === 'Published'">
          {{ times()?.status }}
        </mat-chip>
      </div>

      <mat-card class="panel" *ngIf="times() as t">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr>
                <th>Prayer</th>
                <th>Start</th>
                <th>Jamaat</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of prayers">
                <td>{{ p.label }}</td>
                <td><input class="time-input" type="time" [ngModel]="toInput(t[p.start])" (ngModelChange)="setTime(t, p.start, $event)" /></td>
                <td><input class="time-input" type="time" [ngModel]="toInput(t[p.jamaat])" (ngModelChange)="setTime(t, p.jamaat, $event)" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="actions mt-4">
          <button mat-stroked-button [disabled]="busy()" (click)="save(false)">Save draft</button>
          <button mat-flat-button color="primary" [disabled]="busy()" (click)="save(true)">Save & publish</button>
          <button mat-stroked-button [disabled]="busy()" (click)="publish()">Publish</button>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .editor-page { display: flex; flex-direction: column; gap: 1rem; }
    .editor-badge { margin: 0; font-size: 0.7rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; }
    .editor-title { margin: 0.25rem 0 0; color: #fff; font-size: 1.5rem; }
    .editor-sub { margin: 0.25rem 0 0; color: #6ee7b7; font-size: 0.85rem; }
    .panel { background: #FFFFFF !important; border: 1px solid #F8FAFC; color: #ecfdf5; padding: 1rem; }
    th, td { padding: 0.5rem; text-align: left; color: #d1fae5; border-bottom: 1px solid rgba(6,95,70,0.5); }
    th { color: #6ee7b7; font-size: 0.75rem; text-transform: uppercase; }
    .time-input { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 6px; color: #fff; padding: 6px 8px; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    ::ng-deep .pe-field .mat-mdc-text-field-wrapper { background: rgba(2,44,34,0.6); }
  `]
})
export class PrayerEditorDailyComponent implements OnInit {
  private editor = inject(PrayerEditorService);
  private mosqueCtx = inject(MosqueContextService);
  private snack = inject(MatSnackBar);

  times = signal<PrayerTimesDaily | null>(null);
  selectedDate = new Date().toISOString().slice(0, 10);
  busy = signal(false);
  private mosqueId = 1;

  prayers = [
    { label: 'Fajr', start: 'fajrStart' as const, jamaat: 'fajrJamaat' as const },
    { label: 'Dhuhr', start: 'dhuhrStart' as const, jamaat: 'dhuhrJamaat' as const },
    { label: 'Asr', start: 'asrStart' as const, jamaat: 'asrJamaat' as const },
    { label: 'Maghrib', start: 'maghribStart' as const, jamaat: 'maghribJamaat' as const },
    { label: 'Isha', start: 'ishaStart' as const, jamaat: 'ishaJamaat' as const },
  ];

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => { this.mosqueId = id; this.load(); });
  }

  load(): void {
    this.editor.getDaily(this.mosqueId, this.selectedDate).subscribe({
      next: r => this.times.set(r.times),
      error: () => this.times.set(this.emptyTimes()),
    });
  }

  toInput(t: string): string { return t?.slice(0, 5) || ''; }

  setTime(t: PrayerTimesDaily, field: keyof PrayerTimesDaily, val: string): void {
    if (!val) return;
    const full = val.length === 5 ? val + ':00' : val;
    if (field === 'fajrStart') t.fajrStart = full;
    else if (field === 'fajrJamaat') t.fajrJamaat = full;
    else if (field === 'dhuhrStart') t.dhuhrStart = full;
    else if (field === 'dhuhrJamaat') t.dhuhrJamaat = full;
    else if (field === 'asrStart') t.asrStart = full;
    else if (field === 'asrJamaat') t.asrJamaat = full;
    else if (field === 'maghribStart') t.maghribStart = full;
    else if (field === 'maghribJamaat') t.maghribJamaat = full;
    else if (field === 'ishaStart') t.ishaStart = full;
    else if (field === 'ishaJamaat') t.ishaJamaat = full;
  }

  save(publish: boolean): void {
    const t = this.times();
    if (!t) return;
    this.busy.set(true);
    this.editor.saveDaily(this.mosqueId, { ...t, date: this.selectedDate }, publish).subscribe({
      next: row => {
        this.busy.set(false);
        this.times.set(row);
        this.snack.open(publish ? 'Published' : 'Draft saved', 'OK', { duration: 3000 });
      },
      error: () => { this.busy.set(false); this.snack.open('Save failed', 'OK', { duration: 4000 }); },
    });
  }

  publish(): void {
    this.busy.set(true);
    this.editor.publishDaily(this.mosqueId, this.selectedDate).subscribe({
      next: row => {
        this.busy.set(false);
        this.times.set(row);
        this.snack.open('Published', 'OK', { duration: 3000 });
      },
      error: () => { this.busy.set(false); this.snack.open('Publish failed — save draft first', 'OK', { duration: 4000 }); },
    });
  }

  private emptyTimes(): PrayerTimesDaily {
    const base = '00:00:00';
    return {
      id: 0, mosqueId: this.mosqueId, date: this.selectedDate, status: 'Draft',
      fajrStart: base, fajrJamaat: base,
      dhuhrStart: base, dhuhrJamaat: base,
      asrStart: base, asrJamaat: base,
      maghribStart: base, maghribJamaat: base,
      ishaStart: base, ishaJamaat: base,
    };
  }
}
