import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PlatformService, PlatformStats } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';

interface WorkflowStep {
  step: number;
  route: string;
  title: string;
  summary: string;
  steps: string[];
  statLabel?: string;
  statKey?: keyof PlatformStats;
  statClass?: string;
}

@Component({
  selector: 'app-super-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, CardComponent],
  styles: [`
    .workflow-card {
      transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }
    .workflow-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }
    .step-num {
      width: 2rem;
      height: 2rem;
      border-radius: 9999px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.45);
      color: #fbbf24;
      font-weight: 700;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
  `],
  template: `
    <app-page-header badge="Super Admin" title="Platform Control"
      subtitle="Follow the steps below — each card opens a working tool for that part of the platform." />

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8" *ngIf="stats() as s">
      <a [routerLink]="'/dashboard/super/mosques'" class="block">
        <app-card class="hover:border-emerald-600 transition-colors h-full">
          <p class="text-stat-label">Total Mosques</p>
          <p class="text-2xl sm:text-3xl font-bold text-white">{{ s.totalMosques }}</p>
        </app-card>
      </a>
      <a [routerLink]="'/dashboard/super/mosques'" class="block">
        <app-card class="hover:border-emerald-600 transition-colors h-full">
          <p class="text-stat-label">Active</p>
          <p class="text-2xl sm:text-3xl font-bold text-green-400">{{ s.activeMosques }}</p>
        </app-card>
      </a>
      <a [routerLink]="'/dashboard/super/claims'" class="block">
        <app-card class="hover:border-amber-400/60 transition-colors h-full">
          <p class="text-stat-label">Pending Claims</p>
          <p class="text-2xl sm:text-3xl font-bold text-amber-400">{{ s.pendingClaims }}</p>
        </app-card>
      </a>
      <a [routerLink]="'/dashboard/super/users'" class="block">
        <app-card class="hover:border-emerald-600 transition-colors h-full">
          <p class="text-stat-label">Total Users</p>
          <p class="text-2xl sm:text-3xl font-bold text-white">{{ s.totalUsers }}</p>
        </app-card>
      </a>
    </div>

    <div class="mb-6">
      <h3 class="text-white font-bold text-lg mb-1">Platform workflow</h3>
      <p class="text-emerald-300 text-sm">Complete each step in order — every link below opens a live admin screen.</p>
    </div>

    <div class="space-y-4">
      <a *ngFor="let w of workflow" [routerLink]="w.route"
        class="workflow-card block bg-[#064e3b] border border-emerald-800 rounded-2xl p-5 sm:p-6 hover:border-amber-400">

        <div class="flex flex-col sm:flex-row sm:items-start gap-4">
          <div class="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
            <span class="step-num">{{ w.step }}</span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h3 class="text-white font-bold text-lg">{{ w.title }}</h3>
                <ng-container *ngIf="stats() as s">
                  <span *ngIf="w.statKey"
                    class="text-xs font-bold px-2 py-0.5 rounded-full border"
                    [class]="w.statClass || 'text-emerald-300 border-emerald-700 bg-emerald-900/40'">
                    {{ w.statLabel }}: {{ s[w.statKey!] }}
                  </span>
                </ng-container>
              </div>
              <p class="text-emerald-200 text-sm mb-4">{{ w.summary }}</p>

              <ol class="space-y-2">
                <li *ngFor="let line of w.steps; let i = index"
                  class="flex items-start gap-2 text-sm text-emerald-100">
                  <span class="text-amber-400/80 font-mono text-xs mt-0.5 shrink-0">{{ w.step }}.{{ i + 1 }}</span>
                  <span>{{ line }}</span>
                </li>
              </ol>
            </div>
          </div>

          <span class="shrink-0 inline-flex items-center gap-1 self-start sm:self-center px-4 py-2 rounded-lg bg-amber-400 text-emerald-950 text-sm font-bold">
            Open
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </span>
        </div>
      </a>
    </div>
  `
})
export class SuperDashboardComponent implements OnInit {
  private platform = inject(PlatformService);
  stats = signal<PlatformStats | null>(null);

  readonly workflow: WorkflowStep[] = [
    {
      step: 1,
      route: '/dashboard/super/mosques',
      title: 'Mosques',
      summary: 'Add mosque listings to the platform and seed their default data.',
      steps: [
        'Open Mosque Listings and click to add a new mosque',
        'Enter name, address, slug, and contact details',
        'Save — prayer times and sample content are seeded automatically',
      ],
      statLabel: 'Total',
      statKey: 'totalMosques',
    },
    {
      step: 2,
      route: '/dashboard/super/claims',
      title: 'Verify Claims',
      summary: 'Review mosque ownership requests from community owners.',
      steps: [
        'Open pending claims in the queue',
        'Check mosque name and claimant details',
        'Approve to grant owner access, or reject with reason',
      ],
      statLabel: 'Pending',
      statKey: 'pendingClaims',
      statClass: 'text-amber-300 border-amber-700/60 bg-amber-900/20',
    },
    {
      step: 3,
      route: '/dashboard/super/users',
      title: 'User Management',
      summary: 'Create accounts and assign the correct role to each person.',
      steps: [
        'Search or browse all platform users',
        'Select a user and view their current roles',
        'Assign or remove roles (Admin, Teacher, Parent, etc.)',
      ],
      statLabel: 'Users',
      statKey: 'totalUsers',
    },
    {
      step: 4,
      route: '/dashboard/super/mosque-data',
      title: 'Mosque Data',
      summary: 'Inspect live data for any mosque on the platform.',
      steps: [
        'Pick a mosque from the dropdown list',
        'View prayer times, announcements, and events snapshot',
        'Use this to troubleshoot or verify seeded content',
      ],
    },
    {
      step: 5,
      route: '/dashboard/super/features',
      title: 'Feature Flags',
      summary: 'Turn modules on or off per mosque (madrassah, janaza, communities).',
      steps: [
        'Select the mosque to configure',
        'Toggle each module (Announcements, Events, Madrassah, etc.)',
        'Save — changes apply immediately for that mosque',
      ],
    },
    {
      step: 6,
      route: '/dashboard/super/audit',
      title: 'Audit Logs',
      summary: 'Track platform changes — prayer edits, role changes, and admin actions.',
      steps: [
        'Open the audit log table',
        'Filter by action type or mosque if needed',
        'Review who changed what and when',
      ],
    },
  ];

  ngOnInit(): void {
    this.platform.getStats().subscribe(s => this.stats.set(s));
  }
}
