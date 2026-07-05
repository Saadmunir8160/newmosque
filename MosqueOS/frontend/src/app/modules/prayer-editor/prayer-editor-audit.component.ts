import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { PrayerEditorService, PrayerAuditLog } from '../../core/services/prayer-editor.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';

@Component({
  selector: 'app-prayer-editor-audit',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatChipsModule],
  template: `
    <div class="editor-page">
      <header class="editor-head">
        <p class="editor-badge">Prayer Times Editor</p>
        <h1 class="editor-title">Audit Log</h1>
        <p class="editor-sub">History of prayer timetable changes.</p>
      </header>

      <p *ngIf="!logs().length" class="text-mos-muted/70">No audit entries yet.</p>

      <mat-card class="panel" *ngFor="let log of logs()">
        <div class="flex flex-wrap justify-between gap-2">
          <mat-chip *ngIf="log.actionType">{{ log.actionType }}</mat-chip>
          <span class="text-mos-muted/70 text-xs">{{ log.createdAt | date:'medium' }}</span>
        </div>
        <p class="text-white mt-2 text-sm">{{ log.changeDescription }}</p>
        <p *ngIf="log.date" class="text-mos-muted/80 text-xs mt-1">Date: {{ log.date }}</p>
      </mat-card>
    </div>
  `,
  styles: [`
    .editor-page { display: flex; flex-direction: column; gap: 1rem; }
    .editor-badge { margin: 0; font-size: 0.7rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; }
    .editor-title { margin: 0.25rem 0 0; color: #fff; font-size: 1.5rem; }
    .editor-sub { margin: 0.25rem 0 0; color: #6ee7b7; font-size: 0.85rem; }
    .panel { background: #FFFFFF !important; border: 1px solid #F8FAFC; color: #ecfdf5; padding: 1rem; margin-bottom: 0.5rem; }
  `]
})
export class PrayerEditorAuditComponent implements OnInit {
  private editor = inject(PrayerEditorService);
  private mosqueCtx = inject(MosqueContextService);
  logs = signal<PrayerAuditLog[]>([]);

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => {
      this.editor.getAuditLog(id).subscribe(l => this.logs.set(l));
    });
  }
}
