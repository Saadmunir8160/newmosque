import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { PlatformService, PlatformStats } from '../../../core/services/platform.service';
import { Mosque } from '../../../core/models';

@Component({
  selector: 'app-super-reports',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="rep-page">
      <header class="rep-header">
        <p class="rep-badge">Overview</p>
        <h1 class="rep-title">Platform analytics</h1>
        <p class="rep-sub">Live metrics across all mosques on MOS</p>
      </header>

      <div class="rep-stats" *ngIf="stats() as s">
        <a routerLink="/dashboard/super/mosques" class="rep-stat">
          <p class="rep-stat-label">Total mosques</p>
          <p class="rep-stat-value">{{ s.totalMosques }}</p>
          <p class="rep-stat-hint">{{ s.activeMosques }} active</p>
        </a>
        <a routerLink="/dashboard/super/claims" class="rep-stat rep-stat--warn">
          <p class="rep-stat-label">Pending claims</p>
          <p class="rep-stat-value">{{ s.pendingClaims }}</p>
        </a>
        <a routerLink="/dashboard/super/users" class="rep-stat">
          <p class="rep-stat-label">Total users</p>
          <p class="rep-stat-value">{{ s.totalUsers }}</p>
        </a>
        <a routerLink="/dashboard/super/mosque-data" class="rep-stat">
          <p class="rep-stat-label">Mosque snapshots</p>
          <p class="rep-stat-value rep-stat-value--sm">View data →</p>
        </a>
      </div>

      <article class="rep-card">
        <h2 class="rep-card-title">Mosque status breakdown</h2>
        <div class="rep-status-grid">
          <div *ngFor="let row of statusRows()" class="rep-status-cell">
            <p class="rep-status-label">{{ row.label }}</p>
            <p class="rep-status-value">{{ row.count }}</p>
          </div>
        </div>
      </article>

      <article class="rep-card">
        <h2 class="rep-card-title">All mosques</h2>
        <div class="rep-table-wrap">
          <table class="rep-table">
            <thead>
              <tr>
                <th>Mosque</th>
                <th>City</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of mosques()">
                <td>{{ m.name }}</td>
                <td>{{ m.city }}</td>
                <td><span class="rep-badge" [class.rep-badge--active]="m.status === 'Active'">{{ m.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  `,
  styles: [`
    .rep-page { display: flex; flex-direction: column; gap: 1rem; }
    .rep-badge { margin: 0 0 0.25rem; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #fbbf24; }
    .rep-title { margin: 0; font-size: 1.125rem; font-weight: 600; color: #fff; }
    .rep-sub { margin: 0.25rem 0 0; font-size: 0.8125rem; color: #6ee7b7; opacity: 0.75; }
    .rep-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    @media (min-width: 900px) { .rep-stats { grid-template-columns: repeat(4, 1fr); } }
    .rep-stat {
      background: #064e3b; border: 1px solid #065f46; border-radius: 0.75rem;
      padding: 0.875rem 1rem; text-decoration: none; color: inherit;
      transition: border-color 0.15s;
    }
    .rep-stat:hover { border-color: rgba(245, 158, 11, 0.45); }
    .rep-stat--warn .rep-stat-value { color: #fbbf24; }
    .rep-stat-label { margin: 0; font-size: 0.75rem; color: #6ee7b7; }
    .rep-stat-value { margin: 0.25rem 0 0; font-size: 1.5rem; font-weight: 700; color: #fff; }
    .rep-stat-value--sm { font-size: 0.875rem; color: #fbbf24; }
    .rep-stat-hint { margin: 0.125rem 0 0; font-size: 0.6875rem; color: #6ee7b7; opacity: 0.7; }
    .rep-card { background: #064e3b; border: 1px solid #065f46; border-radius: 0.75rem; padding: 1rem 1.125rem; }
    .rep-card-title { margin: 0 0 0.75rem; font-size: 0.9375rem; font-weight: 600; color: #fff; }
    .rep-status-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
    .rep-status-cell { background: rgba(2, 44, 34, 0.45); border: 1px solid #065f46; border-radius: 0.5rem; padding: 0.75rem; text-align: center; }
    .rep-status-label { margin: 0; font-size: 0.6875rem; text-transform: uppercase; color: #6ee7b7; }
    .rep-status-value { margin: 0.25rem 0 0; font-size: 1.25rem; font-weight: 700; color: #fff; }
    .rep-table-wrap { border: 1px solid #065f46; border-radius: 0.5rem; overflow: hidden; }
    .rep-table { width: 100%; font-size: 0.8125rem; border-collapse: collapse; }
    .rep-table th { padding: 0.5rem 0.75rem; text-align: left; background: rgba(6, 78, 59, 0.8); color: #6ee7b7; font-weight: 500; }
    .rep-table td { padding: 0.5rem 0.75rem; color: #d1fae5; border-top: 1px solid #065f46; }
    .rep-badge { font-size: 0.6875rem; padding: 0.125rem 0.5rem; border-radius: 9999px; background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
    .rep-badge--active { background: rgba(16, 185, 129, 0.2); color: #34d399; }
  `]
})
export class SuperReportsComponent implements OnInit {
  private platform = inject(PlatformService);
  private admin = inject(AdminService);

  stats = signal<PlatformStats | null>(null);
  mosques = signal<Mosque[]>([]);

  statusRows = computed(() => {
    const list = this.mosques();
    const tally = (s: string) => list.filter(m => m.status === s).length;
    return [
      { label: 'Active', count: tally('Active') },
      { label: 'Claimed', count: tally('Claimed') },
      { label: 'Unclaimed', count: tally('Unclaimed') },
    ];
  });

  ngOnInit(): void {
    forkJoin({
      stats: this.platform.getStats(),
      mosques: this.admin.getAllMosques(),
    }).subscribe(({ stats, mosques }) => {
      this.stats.set(stats);
      this.mosques.set(mosques);
    });
  }
}
