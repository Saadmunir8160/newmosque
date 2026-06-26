import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PrayerEditorService } from '../../core/services/prayer-editor.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { JumuahTime } from '../../core/models';

const SLOT_LABELS: Record<number, string> = { 1: 'First Jumuah', 2: 'Second Jumuah', 3: 'Third Jumuah' };

@Component({
  selector: 'app-prayer-editor-jumuah',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="editor-page">
      <header class="editor-head">
        <p class="editor-badge">Prayer Times Editor</p>
        <h1 class="editor-title">Jumuah</h1>
        <p class="editor-sub">First, second and third Jumuah — khutbah and jamaat times.</p>
      </header>

      <mat-card class="panel mb-4">
        <h3 class="text-white font-bold mb-3">Add slot</h3>
        <div class="form-grid">
          <label class="text-mos-muted text-sm">Slot
            <select class="input" [(ngModel)]="form.slotNumber">
              <option [ngValue]="1">First Jumuah</option>
              <option [ngValue]="2">Second Jumuah</option>
              <option [ngValue]="3">Third Jumuah</option>
            </select>
          </label>
          <label class="text-mos-muted text-sm">Khutbah
            <input class="input" type="time" [(ngModel)]="form.khutbahTime" />
          </label>
          <label class="text-mos-muted text-sm">Jamaat
            <input class="input" type="time" [(ngModel)]="form.jamaatTime" />
          </label>
          <button mat-flat-button color="primary" class="self-end" (click)="add()">Add</button>
        </div>
      </mat-card>

      <mat-card class="panel" *ngFor="let j of jumuah()" class="mb-3">
        <div class="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h4 class="text-white font-bold">{{ slotLabel(j.slotNumber) }}</h4>
            <p class="text-mos-muted text-sm">Khutbah {{ toInput(j.khutbahTime) }} · Jamaat {{ toInput(j.jamaatTime) }}</p>
          </div>
          <div class="flex gap-2 items-center">
            <input class="input" type="time" [ngModel]="toInput(j.khutbahTime)" (ngModelChange)="j.khutbahTime = toFull($event)" />
            <input class="input" type="time" [ngModel]="toInput(j.jamaatTime)" (ngModelChange)="j.jamaatTime = toFull($event)" />
            <button mat-stroked-button (click)="update(j)">Save</button>
            <button mat-stroked-button color="warn" (click)="remove(j.id)">Remove</button>
          </div>
        </div>
      </mat-card>

      <p *ngIf="!jumuah().length" class="text-mos-muted/70">No Jumuah slots configured yet.</p>
    </div>
  `,
  styles: [`
    .editor-page { display: flex; flex-direction: column; gap: 1rem; }
    .editor-badge { margin: 0; font-size: 0.7rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; }
    .editor-title { margin: 0.25rem 0 0; color: #fff; font-size: 1.5rem; }
    .editor-sub { margin: 0.25rem 0 0; color: #6ee7b7; font-size: 0.85rem; }
    .panel { background: #FFFFFF !important; border: 1px solid #F8FAFC; color: #ecfdf5; padding: 1rem; margin-bottom: 0.75rem; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; align-items: end; }
    .input { display: block; width: 100%; margin-top: 0.25rem; background: #0F172A; border: 1px solid #F8FAFC; color: #fff; border-radius: 6px; padding: 8px; }
  `]
})
export class PrayerEditorJumuahComponent implements OnInit {
  private editor = inject(PrayerEditorService);
  private mosqueCtx = inject(MosqueContextService);
  private snack = inject(MatSnackBar);

  jumuah = signal<JumuahTime[]>([]);
  form = { slotNumber: 1, khutbahTime: '13:00', jamaatTime: '13:30' };
  private mosqueId = 1;

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => { this.mosqueId = id; this.load(); });
  }

  slotLabel(n: number): string { return SLOT_LABELS[n] ?? `Slot ${n}`; }
  toInput(t: string): string { return t?.slice(0, 5) || ''; }
  toFull(v: string): string { return v?.length === 5 ? v + ':00' : v; }

  load(): void {
    this.editor.getJumuah(this.mosqueId).subscribe(d => this.jumuah.set(d));
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
    this.editor.updateJumuah(this.mosqueId, j.id, j).subscribe({
      next: () => this.snack.open('Updated', 'OK', { duration: 3000 }),
      error: () => this.snack.open('Update failed', 'OK', { duration: 4000 }),
    });
  }

  remove(id: number): void {
    this.editor.deleteJumuah(this.mosqueId, id).subscribe(() => this.load());
  }
}
