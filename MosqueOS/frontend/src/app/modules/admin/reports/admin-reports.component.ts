import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MosqueAdminService, MosqueAdminReport } from '../../../core/services/mosque-admin.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Reports" subtitle="Attendance, events, students, fees, and communities" />

    <app-card class="block mb-4">
      <div class="filters">
        <select class="input" [(ngModel)]="reportType" (change)="load()">
          <option value="attendance">Attendance</option>
          <option value="events">Events</option>
          <option value="students">Students</option>
          <option value="fees">Fees</option>
          <option value="communities">Communities</option>
        </select>
        <input class="input" type="date" [(ngModel)]="from" (change)="load()">
        <input class="input" type="date" [(ngModel)]="to" (change)="load()">
        <button class="btn" (click)="exportCsv()" [disabled]="!report()">Export CSV</button>
      </div>
    </app-card>

    <app-card *ngIf="report() as r">
      <p class="meta">Generated {{ r.generatedAt | date:'medium' }} · {{ r.summary.totalRows }} rows</p>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Label</th><th>Category</th><th>Value</th><th>Detail</th><th>Date</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of r.rows">
              <td>{{ row.label }}</td>
              <td>{{ row.category || '—' }}</td>
              <td>{{ row.value }}</td>
              <td>{{ row.detail || '—' }}</td>
              <td>{{ row.date ? (row.date | date:'mediumDate') : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </app-card>
  `,
  styles: [`
    .filters { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .input { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 8px 10px; color: #fff; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; padding: 8px 14px; border-radius: 8px; border: none; cursor: pointer; }
    .btn:disabled { opacity: 0.5; }
    .meta { margin: 0 0 0.75rem; font-size: 0.75rem; color: #6ee7b7; }
    .table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .table th, .table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); color: #d1fae5; }
    .table th { color: #6ee7b7; font-size: 0.6875rem; text-transform: uppercase; }
  `]
})
export class AdminReportsComponent implements OnInit {
  private admin = inject(MosqueAdminService);
  private mosqueCtx = inject(MosqueContextService);

  report = signal<MosqueAdminReport | null>(null);
  reportType = 'attendance';
  from = '';
  to = '';
  mosqueId = 1;

  ngOnInit(): void {
    const today = new Date();
    const prior = new Date(today);
    prior.setDate(prior.getDate() - 30);
    this.to = today.toISOString().slice(0, 10);
    this.from = prior.toISOString().slice(0, 10);
    this.load();
  }

  load(): void {
    this.mosqueCtx.resolve().then(id => {
      this.mosqueId = id;
      this.admin.getReport(id, this.reportType, this.from || undefined, this.to || undefined)
        .subscribe(r => this.report.set(r));
    });
  }

  exportCsv(): void {
    const r = this.report();
    if (!r) return;
    const header = ['Label', 'Category', 'Value', 'Detail', 'Date'];
    const lines = r.rows.map(row =>
      [row.label, row.category ?? '', row.value, row.detail ?? '', row.date ?? '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mosque-${r.reportType}-report.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
