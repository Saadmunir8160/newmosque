import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MuqaddamService, MuqaddamReport } from '../../core/services/muqaddam.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-muqaddam-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Muqaddam" title="Reports" subtitle="Participation and attendance reports" />

    <app-card class="block mb-4">
      <div class="toolbar">
        <select class="input" [(ngModel)]="reportType" (ngModelChange)="load()">
          <option value="participation">Participation Report</option>
          <option value="attendance">Attendance Report</option>
        </select>
        <button class="btn" (click)="exportCsv()" [disabled]="!report()">Export CSV</button>
      </div>
    </app-card>

    <app-card *ngIf="report() as r">
      <p class="meta">Generated {{ r.generatedAt | date:'medium' }} · {{ r.summary.totalRows }} rows</p>
      <table class="table">
        <thead>
          <tr><th>Label</th><th>Category</th><th>Value</th><th>Detail</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of r.rows">
            <td>{{ row.label }}</td>
            <td>{{ row.category || '—' }}</td>
            <td>{{ row.value }}</td>
            <td>{{ row.detail || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </app-card>
  `,
  styles: [`
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .input { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 8px 10px; color: #fff; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
    .btn:disabled { opacity: 0.5; }
    .meta { margin: 0 0 0.75rem; font-size: 0.75rem; color: #6ee7b7; }
    .table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .table th, .table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); color: #d1fae5; }
    .table th { color: #6ee7b7; font-size: 0.6875rem; text-transform: uppercase; }
  `]
})
export class MuqaddamReportsComponent implements OnInit {
  private muqaddam = inject(MuqaddamService);
  private mosqueCtx = inject(MosqueContextService);
  report = signal<MuqaddamReport | null>(null);
  reportType: 'participation' | 'attendance' = 'participation';
  mosqueId = 1;

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => { this.mosqueId = id; this.load(); });
  }

  load(): void {
    this.muqaddam.getReports(this.reportType, this.mosqueId).subscribe(r => this.report.set(r));
  }

  exportCsv(): void {
    const r = this.report();
    if (!r) return;
    const header = ['Label', 'Category', 'Value', 'Detail'];
    const lines = r.rows.map(row =>
      [row.label, row.category ?? '', row.value, row.detail ?? '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `muqaddam-${r.reportType}-report.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
