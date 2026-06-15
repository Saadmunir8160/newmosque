import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { Mosque } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { DashboardBadgesComponent } from '../../../shared/ui/dashboard-badges.component';

interface OwnerTask {
  step: number;
  route: string;
  title: string;
  desc: string;
  steps: string[];
}

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DashboardBadgesComponent],
  template: `
    <div class="owner-dash">
      <header class="owner-header">
        <app-dashboard-badges [useAuthRole]="true" />
        <h1 class="owner-title">Your Mosque</h1>
        <p class="owner-sub">Step through each task below — every card opens a working screen for your mosque.</p>
      </header>

      <article *ngIf="mosque() as m" class="owner-mosque-card">
        <h2 class="owner-mosque-name">{{ m.name }}</h2>
        <p class="owner-mosque-addr">{{ m.address }}, {{ m.city }} {{ m.postcode }}</p>
        <p class="owner-mosque-status">Status: <span>{{ m.status }}</span></p>
      </article>

      <div class="owner-tasks">
        <a *ngFor="let link of links" [routerLink]="link.route" class="owner-task-card">
          <div class="owner-task-inner">
            <span class="owner-step-num">{{ link.step }}</span>
            <div class="owner-task-body">
              <h3 class="owner-task-title">{{ link.title }}</h3>
              <p class="owner-task-desc">{{ link.desc }}</p>
              <ul class="owner-task-steps">
                <li *ngFor="let s of link.steps">{{ s }}</li>
              </ul>
            </div>
            <span class="owner-task-open">Open →</span>
          </div>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .owner-dash { display: flex; flex-direction: column; gap: 1rem; }

    .owner-header { margin-bottom: 0.25rem; }
    .owner-title {
      margin: 0;
      font-size: clamp(1.5rem, 3vw, 1.875rem);
      font-weight: 700;
      color: #fff;
      line-height: 1.2;
    }
    .owner-sub {
      margin: 0.5rem 0 0;
      font-size: 0.875rem;
      color: #a7f3d0;
      opacity: 0.85;
      max-width: 42rem;
      line-height: 1.5;
    }

    .owner-mosque-card {
      background: #064e3b;
      border: 1px solid #065f46;
      border-radius: 0.75rem;
      padding: 1rem 1.125rem;
    }
    .owner-mosque-name {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: #fff;
    }
    .owner-mosque-addr {
      margin: 0.375rem 0 0;
      font-size: 0.8125rem;
      color: #6ee7b7;
      opacity: 0.85;
    }
    .owner-mosque-status {
      margin: 0.5rem 0 0;
      font-size: 0.8125rem;
      color: #6ee7b7;
    }
    .owner-mosque-status span {
      color: #fbbf24;
      font-weight: 600;
    }

    .owner-tasks { display: flex; flex-direction: column; gap: 0.75rem; }

    .owner-task-card {
      display: block;
      text-decoration: none;
      color: inherit;
      background: #064e3b;
      border: 1px solid #065f46;
      border-radius: 0.75rem;
      padding: 1.125rem 1.25rem;
      transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }
    .owner-task-card:hover {
      border-color: rgba(245, 158, 11, 0.55);
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }
    .owner-task-card:focus-visible {
      outline: 2px solid #f59e0b;
      outline-offset: 2px;
    }

    .owner-task-inner {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
    }
    .owner-step-num {
      width: 2rem;
      height: 2rem;
      border-radius: 9999px;
      flex-shrink: 0;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.45);
      color: #fbbf24;
      font-weight: 700;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .owner-task-body { flex: 1; min-width: 0; }
    .owner-task-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
    }
    .owner-task-desc {
      margin: 0.375rem 0 0.75rem;
      font-size: 0.8125rem;
      color: #a7f3d0;
      line-height: 1.45;
    }
    .owner-task-steps {
      list-style: disc;
      margin: 0;
      padding: 0 0 0 1.125rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .owner-task-steps li {
      font-size: 0.8125rem;
      color: #d1fae5;
      line-height: 1.4;
    }
    .owner-task-open {
      flex-shrink: 0;
      align-self: center;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #fbbf24;
      padding-left: 0.5rem;
    }
    @media (max-width: 639px) {
      .owner-task-open { display: none; }
      .owner-task-inner { flex-wrap: wrap; }
    }
  `]
})
export class OwnerDashboardComponent implements OnInit {
  private admin = inject(AdminService);
  private auth = inject(AuthService);
  mosque = signal<Mosque | null>(null);

  readonly links: OwnerTask[] = [
    {
      step: 1,
      route: '/dashboard/owner/claim',
      title: 'Claim Mosque',
      desc: 'Take ownership of your mosque listing on MOS.',
      steps: [
        'Find your mosque in the unclaimed list',
        'Submit a claim request',
        'Wait for Super Admin approval',
      ],
    },
    {
      step: 2,
      route: '/dashboard/owner/staff',
      title: 'Appoint Staff',
      desc: 'Give trusted people admin or editor access.',
      steps: [
        'Open staff appointments',
        'Add user by email or username',
        'Assign Mosque Admin or Editor role',
      ],
    },
    {
      step: 3,
      route: '/dashboard/admin/mosque',
      title: 'Mosque Profile',
      desc: 'Set your mosque public details.',
      steps: [
        'Update name, address, and postcode',
        'Upload logo and contact info',
        'Save profile changes',
      ],
    },
    {
      step: 4,
      route: '/dashboard/admin/settings',
      title: 'Module Settings',
      desc: 'Enable features your mosque uses.',
      steps: [
        'Toggle madrassah, janaza, or communities',
        'Save module preferences',
        'Staff see only enabled modules',
      ],
    },
    {
      step: 5,
      route: '/dashboard/admin/announcements',
      title: 'Announcements',
      desc: 'Publish news to your community.',
      steps: [
        'Create a new announcement',
        'Write title and summary',
        'Publish — appears on Today screen',
      ],
    },
    {
      step: 6,
      route: '/dashboard/admin/madrassah',
      title: 'Madrassah',
      desc: 'Overview of classes and students.',
      steps: [
        'View class list and student counts',
        'Open a class for details',
        'Monitor attendance trends',
      ],
    },
  ];

  ngOnInit(): void {
    const homeId = this.auth.user()?.homeMosqueId ?? environment.defaultMosqueId;
    this.admin.getAllMosques().subscribe(mosques => {
      const mine = mosques.find(m => m.id === homeId) || mosques[0];
      this.mosque.set(mine ?? null);
    });
  }
}
