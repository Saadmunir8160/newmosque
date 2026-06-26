import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService, ClassReportRow } from '../../core/services/teacher.service';
import { MadrassahClass } from '../../core/services/madrassah.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-teacher-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Teacher" title="Reports" subtitle="Attendance summaries for your classes" />

    <div class="toolbar">
      <select class="input w-auto" [(ngModel)]="classFilter" (ngModelChange)="load()">
        <option [ngValue]="0">All classes</option>
        <option *ngFor="let c of classes()" [ngValue]="c.id">{{ c.name }}</option>
      </select>
      <button class="btn" (click)="exportCsv()" [disabled]="!reports().length">Export CSV</button>
    </div>

    <app-card *ngFor="let r of reports()" class="block mb-4">
      <h3 class="text-white font-bold">{{ r.className }}</h3>
      <p class="meta">Students enrolled: {{ r.totalStudents }}</p>
      <div class="stats">
        <span class="present">Present: {{ r.present }}</span>
        <span class="absent">Absent: {{ r.absent }}</span>
        <span class="late">Late: {{ r.late }}</span>
      </div>
      <p class="rate">Attendance rate: {{ r.attendanceRate }}%</p>
      <div class="bar-wrap">
        <div class="bar" [style.width.%]="r.attendanceRate"></div>
      </div>
    </app-card>
    <p *ngIf="!reports().length" class="empty">No report data yet — record attendance first.</p>
  `,
  styles: [`
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-bottom: 1rem; }
    .input { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 8px 10px; color: #fff; }
    .w-auto { min-width: 180px; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
    .btn:disabled { opacity: 0.5; }
    .meta { margin: 0.35rem 0; color: #d1fae5; font-size: 0.84rem; }
    .stats { display: flex; flex-wrap: wrap; gap: 1rem; margin: 0.5rem 0; font-size: 0.8125rem; }
    .present { color: #6ee7b7; }
    .absent { color: #fca5a5; }
    .late { color: #fbbf24; }
    .rate { margin: 0.5rem 0; color: #fbbf24; font-weight: 700; }
    .bar-wrap { height: 6px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden; }
    .bar { height: 100%; background: #10b981; border-radius: 3px; }
    .empty { color: #6ee7b7; font-size: 0.875rem; }
  `]
})
export class TeacherReportsComponent implements OnInit {
  private teacher = inject(TeacherService);
  classes = signal<MadrassahClass[]>([]);
  reports = signal<ClassReportRow[]>([]);
  classFilter = 0;

  ngOnInit(): void {
    this.teacher.getClasses().subscribe(c => this.classes.set(c));
    this.load();
  }

  load(): void {
    this.teacher.getReports(this.classFilter || undefined).subscribe(r => this.reports.set(r));
  }

  exportCsv(): void {
    const rows = this.reports();
    if (!rows.length) return;
    const header = ['Class', 'Students', 'Present', 'Absent', 'Late', 'Rate%'];
    const lines = rows.map(r =>
      [r.className, r.totalStudents, r.present, r.absent, r.late, r.attendanceRate]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'teacher-class-reports.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
