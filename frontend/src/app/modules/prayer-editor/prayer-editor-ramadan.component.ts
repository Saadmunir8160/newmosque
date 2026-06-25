import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  PrayerEditorService, RamadanTimetable, RamadanDayEntry, PrayerSpecialTiming
} from '../../core/services/prayer-editor.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';

@Component({
  selector: 'app-prayer-editor-ramadan',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatChipsModule, MatSnackBarModule],
  template: `
    <div class="editor-page">
      <header class="editor-head">
        <p class="editor-badge">Prayer Times Editor</p>
        <h1 class="editor-title">Ramadan</h1>
        <p class="editor-sub">Ramadan timetable and special timings.</p>
      </header>

      <mat-card class="panel mb-4">
        <div class="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h3 class="text-white font-bold">Timetable {{ year }}</h3>
            <mat-chip *ngIf="timetable()?.status">{{ timetable()?.status }}</mat-chip>
          </div>
          <button *ngIf="!timetable()" mat-flat-button color="primary" (click)="createTimetable()">Create timetable</button>
          <button *ngIf="timetable()" mat-stroked-button (click)="publish()">Publish timetable</button>
        </div>
      </mat-card>

      <mat-card class="panel mb-4" *ngIf="timetable() as tt">
        <h3 class="text-white font-bold mb-3">Edit day</h3>
        <div class="form-grid">
          <label class="text-mos-muted text-sm">Day #<input class="input" type="number" min="1" max="30" [(ngModel)]="dayForm.dayNumber" /></label>
          <label class="text-mos-muted text-sm">Date<input class="input" type="date" [(ngModel)]="dayForm.date" /></label>
          <label class="text-mos-muted text-sm">Suhoor end<input class="input" type="time" [(ngModel)]="dayForm.suhoorEnd" /></label>
          <label class="text-mos-muted text-sm">Iftar jamaat<input class="input" type="time" [(ngModel)]="dayForm.iftarJamaat" /></label>
          <label class="text-mos-muted text-sm">Taraweeh<input class="input" type="time" [(ngModel)]="dayForm.taraweehJamaat" /></label>
          <button mat-flat-button color="primary" class="self-end" (click)="saveDay(tt.id)">Save day</button>
        </div>
        <div class="mt-4 overflow-x-auto" *ngIf="tt.days?.length">
          <table class="w-full text-sm">
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
      </mat-card>

      <mat-card class="panel">
        <h3 class="text-white font-bold mb-3">Special timings</h3>
        <div class="form-grid mb-3">
          <label class="text-mos-muted text-sm">Date<input class="input" type="date" [(ngModel)]="specialForm.date" /></label>
          <label class="text-mos-muted text-sm">Label<input class="input" [(ngModel)]="specialForm.label" placeholder="Eid prep, Laylat al-Qadr…" /></label>
          <label class="text-mos-muted text-sm">Time<input class="input" type="time" [(ngModel)]="specialForm.time" /></label>
          <label class="text-mos-muted text-sm flex items-center gap-2">
            <input type="checkbox" [(ngModel)]="specialForm.isRamadan" /> Ramadan
          </label>
          <button mat-flat-button color="primary" class="self-end" (click)="addSpecial()">Add</button>
        </div>
        <div *ngFor="let s of specials()" class="row">
          <span>{{ s.date }} — {{ s.label }} at {{ s.time.slice(0,5) }}</span>
          <button mat-stroked-button (click)="removeSpecial(s.id)">Remove</button>
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
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem; align-items: end; }
    .input { display: block; width: 100%; margin-top: 0.25rem; background: #0F172A; border: 1px solid #F8FAFC; color: #fff; border-radius: 6px; padding: 8px; }
    th, td { padding: 0.4rem; border-bottom: 1px solid rgba(6,95,70,0.5); color: #d1fae5; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid rgba(6,95,70,0.4); color: #d1fae5; }
  `]
})
export class PrayerEditorRamadanComponent implements OnInit {
  private editor = inject(PrayerEditorService);
  private mosqueCtx = inject(MosqueContextService);
  private snack = inject(MatSnackBar);

  timetable = signal<RamadanTimetable | null>(null);
  specials = signal<PrayerSpecialTiming[]>([]);
  year = new Date().getFullYear();
  private mosqueId = 1;

  dayForm: RamadanDayEntry = {
    dayNumber: 1,
    date: new Date().toISOString().slice(0, 10),
    suhoorEnd: '04:30:00',
    iftarJamaat: '19:45:00',
    taraweehJamaat: '21:00:00',
  };

  specialForm = {
    date: new Date().toISOString().slice(0, 10),
    label: '',
    time: '20:00',
    isRamadan: true,
  };

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => { this.mosqueId = id; this.load(); });
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
      error: () => this.snack.open('Timetable may already exist', 'OK', { duration: 4000 }),
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
