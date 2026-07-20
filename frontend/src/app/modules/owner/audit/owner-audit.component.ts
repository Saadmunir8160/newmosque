import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import { environment } from '../../../../environments/environment';

interface AuditRow {
  id: number;
  action: string;
  module?: string;
  actorName?: string;
  description: string;
  createdAt: string;
}

@Component({
  selector: 'app-owner-audit',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="oa-page">
      <nav class="oa-crumb">
        <a routerLink="/dashboard/owner">Dashboard</a>
        <span>›</span>
        <span>Activity</span>
      </nav>
      <header class="oa-head">
        <h1>Mosque activity</h1>
        <p>Status and profile changes for your mosque.</p>
      </header>
      <p *ngIf="error()" class="oa-error">{{ error() }}</p>
      <p *ngIf="loading()" class="oa-muted">Loading…</p>
      <div *ngIf="!loading() && !error()" class="oa-list">
        <article *ngFor="let row of rows()" class="oa-row">
          <div>
            <strong>{{ row.action }}</strong>
            <p>{{ row.description }}</p>
            <span class="oa-meta">{{ row.actorName || 'System' }} · {{ row.createdAt | date:'medium' }}</span>
          </div>
        </article>
        <p *ngIf="!rows().length" class="oa-muted">No audit entries yet.</p>
      </div>
    </div>
  `,
  styles: [`
    .oa-page { max-width: 760px; margin: 0 auto; padding: 1.25rem 1rem 2rem; }
    .oa-crumb { display: flex; gap: 0.35rem; font-size: 0.75rem; color: #64748b; margin-bottom: 1rem; }
    .oa-crumb a { color: #1d6b57; font-weight: 700; text-decoration: none; }
    .oa-head h1 { margin: 0 0 0.35rem; font-size: 1.45rem; font-weight: 850; color: #0f172a; }
    .oa-head p { margin: 0 0 1rem; color: #64748b; font-size: 0.875rem; }
    .oa-list { display: grid; gap: 0.65rem; }
    .oa-row { border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; padding: 0.85rem 1rem; }
    .oa-row strong { color: #0f172a; font-size: 0.875rem; }
    .oa-row p { margin: 0.25rem 0 0.35rem; color: #475569; font-size: 0.8125rem; line-height: 1.45; }
    .oa-meta { color: #94a3b8; font-size: 0.72rem; }
    .oa-error { color: #b91c1c; font-weight: 700; }
    .oa-muted { color: #64748b; }
  `],
})
export class OwnerAuditComponent implements OnInit {
  private admin = inject(AdminService);
  private http = inject(HttpClient);

  rows = signal<AuditRow[]>([]);
  loading = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.loading.set(true);
    this.admin.getOwnerMosque().subscribe({
      next: (res) => {
        const id = res.mosque?.id;
        if (!id) {
          this.error.set('No mosque assigned yet.');
          this.loading.set(false);
          return;
        }
        this.http.get<{ items: AuditRow[] }>(`${environment.apiUrl}/mosques/${id}/audit-logs`).subscribe({
          next: (r) => {
            this.rows.set(r.items ?? []);
            this.loading.set(false);
          },
          error: (err) => {
            this.error.set(err?.error?.message ?? 'Could not load activity.');
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Could not load your mosque.');
        this.loading.set(false);
      },
    });
  }
}
