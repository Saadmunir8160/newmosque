import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';

import { MosqueAdminService, MosqueAdminDashboard } from '../../../core/services/mosque-admin.service';
import { AdminService } from '../../../core/services/admin.service';

import { MosqueContextService } from '../../../core/services/mosque-context.service';

import { AuthService } from '../../../core/auth/auth.service';
import { Mosque } from '../../../core/models';



@Component({

  selector: 'app-admin-dashboard',

  standalone: true,

  imports: [CommonModule, RouterModule],

  template: `

    <div class="mos-dash" *ngIf="data() as d">

      <header class="mos-dash-header">

        <div>

          <p class="mos-dash-eyebrow">Mosque Admin</p>

          <h1 class="mos-dash-title">{{ greeting() }}</h1>

          <p class="mos-dash-sub">{{ d.mosqueName }} · Last sync {{ d.syncedAt | date:'short' }}</p>

        </div>

        <button type="button" class="mos-dash-btn" (click)="refresh()" [disabled]="loading()">

          {{ loading() ? 'Loading…' : 'Refresh' }}

        </button>

      </header>



      <article *ngIf="profile()" class="mos-profile-strip">
        <div class="mos-profile-strip__copy">
          <p class="mos-profile-strip__label">Mosque profile</p>
          <p class="mos-profile-strip__value">{{ profile()!.completeness }}% complete</p>
          <p *ngIf="profile()!.missing.length" class="mos-profile-strip__missing">
            Missing: {{ profile()!.missing.join(', ') }}
          </p>
        </div>
        <div class="mos-profile-strip__bar">
          <div class="mos-profile-strip__fill" [style.width.%]="profile()!.completeness"></div>
        </div>
        <a routerLink="/dashboard/admin/mosque" class="mos-profile-strip__link">Edit profile →</a>
      </article>

      <div *ngIf="isActive()" class="mos-verified" role="status">
        <span class="mos-verified__badge">ACTIVE</span>
        <span class="mos-verified__text">Verified Mosque</span>
      </div>

      <section class="mos-quick-module" aria-label="Mosque management">
        <h2 class="mos-quick-module__title">Mosque management</h2>
        <div class="mos-quick-module__grid">
          <a routerLink="/dashboard/admin/mosque" class="mos-quick-module__card">
            <span class="mos-quick-module__icon">⌂</span>
            <span class="mos-quick-module__label">Mosque profile</span>
            <span class="mos-quick-module__desc">Edit name, contact, logo &amp; banner</span>
          </a>
          <a routerLink="/dashboard/admin/modules" class="mos-quick-module__card">
            <span class="mos-quick-module__icon">⚙</span>
            <span class="mos-quick-module__label">Module settings</span>
            <span class="mos-quick-module__desc">{{ enabledModules() }} / {{ totalModules() }} modules on</span>
          </a>
          <a *ngIf="mosqueSlug()" [routerLink]="['/mosque', mosqueSlug()]" target="_blank" class="mos-quick-module__card">
            <span class="mos-quick-module__icon">🌐</span>
            <span class="mos-quick-module__label">Public profile</span>
            <span class="mos-quick-module__desc">View live mosque page</span>
          </a>
        </div>
      </section>



      <div class="mos-kpi-grid">

        <a routerLink="/dashboard/admin/users/members" class="mos-kpi">

          <span class="mos-kpi__icon">👥</span>

          <p class="mos-kpi__label">Total Members</p>

          <p class="mos-kpi__value">{{ d.stats.totalMembers }}</p>

        </a>

        <a routerLink="/dashboard/admin/madrassah" class="mos-kpi">

          <span class="mos-kpi__icon">📚</span>

          <p class="mos-kpi__label">Total Students</p>

          <p class="mos-kpi__value">{{ d.stats.totalStudents }}</p>

        </a>

        <a routerLink="/dashboard/admin/users/teachers" class="mos-kpi">

          <span class="mos-kpi__icon">👨‍🏫</span>

          <p class="mos-kpi__label">Total Teachers</p>

          <p class="mos-kpi__value">{{ d.stats.totalTeachers }}</p>

        </a>

        <a routerLink="/dashboard/admin/events" class="mos-kpi">

          <span class="mos-kpi__icon">📆</span>

          <p class="mos-kpi__label">Upcoming Events</p>

          <p class="mos-kpi__value">{{ d.stats.upcomingEvents }}</p>

        </a>

        <a routerLink="/dashboard/admin/communities" class="mos-kpi">

          <span class="mos-kpi__icon">🤝</span>

          <p class="mos-kpi__label">Active Communities</p>

          <p class="mos-kpi__value">{{ d.stats.activeCommunities }}</p>

        </a>

        <a routerLink="/dashboard/admin/participation" class="mos-kpi" [class.mos-kpi--warn]="d.stats.pendingParticipationRequests > 0">

          <span class="mos-kpi__icon">✋</span>

          <p class="mos-kpi__label">Pending Requests</p>

          <p class="mos-kpi__value">{{ d.stats.pendingParticipationRequests }}</p>

        </a>

        <a routerLink="/dashboard/admin/announcements" class="mos-kpi">

          <span class="mos-kpi__icon">📢</span>

          <p class="mos-kpi__label">Active Announcements</p>

          <p class="mos-kpi__value">{{ d.stats.activeAnnouncements }}</p>

        </a>

        <a routerLink="/dashboard/admin/prayer-times" class="mos-kpi">

          <span class="mos-kpi__icon">🕌</span>

          <p class="mos-kpi__label">Today's Prayer</p>

          <p class="mos-kpi__value mos-kpi__value--sm" *ngIf="d.todayPrayer as p">{{ p.fajr }} · {{ p.maghrib }}</p>

          <p class="mos-kpi__value mos-kpi__value--sm" *ngIf="!d.todayPrayer">Not set</p>

        </a>

      </div>



      <section class="mos-dash-panel">

        <h2 class="mos-dash-panel__title">Analytics</h2>

        <div class="grid gap-4 md:grid-cols-2">

          <div class="mos-chart-block" *ngFor="let block of chartBlocks(d)">

            <p class="mos-chart-title">{{ block.title }}</p>

            <div class="mos-chart-bars">

              <div *ngFor="let pt of block.points" class="mos-chart-bar" [style.height.%]="barHeight(pt.value, block.points)" [title]="pt.label + ': ' + pt.value"></div>

            </div>

          </div>

        </div>

      </section>



      <section class="mos-dash-panel">

        <h2 class="mos-dash-panel__title">Recent Activity</h2>

        <div>

          <div *ngFor="let item of d.recentActivity" class="mos-timeline-item">

            <span class="mos-timeline-dot"></span>

            <div>

              <p class="mos-timeline-title">{{ item.title }}</p>

              <p class="mos-timeline-detail" *ngIf="item.detail">{{ item.detail }}</p>

              <p class="mos-timeline-time">{{ item.at | date:'medium' }}</p>

            </div>

          </div>

          <p *ngIf="!d.recentActivity.length" class="mos-dash-empty">No recent activity.</p>

        </div>

      </section>

    </div>

    <p *ngIf="loading() && !data()" class="mos-dash-loading">Loading mosque dashboard…</p>

  `,

})

export class AdminDashboardComponent implements OnInit {

  private admin = inject(MosqueAdminService);
  private adminApi = inject(AdminService);
  private mosqueCtx = inject(MosqueContextService);
  private auth = inject(AuthService);

  data = signal<MosqueAdminDashboard | null>(null);
  profile = signal<{ completeness: number; missing: string[] } | null>(null);
  mosque = signal<Mosque | null>(null);
  isActive = signal(false);
  mosqueSlug = signal('');
  enabledModules = signal(0);
  totalModules = signal(0);
  loading = signal(false);



  greeting = computed(() => {

    const name = this.auth.user()?.fullName || 'Mosque Admin';

    const hour = new Date().getHours();

    const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return `${period}, ${name}`;

  });



  ngOnInit(): void { this.refresh(); }



  refresh(): void {
    this.loading.set(true);

    this.mosqueCtx.resolve().then(mosqueId => {
      if (!mosqueId || mosqueId <= 0) {
        // MosqueAdmin with no homeMosqueId assigned yet — show empty state
        this.loading.set(false);
        return;
      }

      this.adminApi.getOwnerMosque(mosqueId).subscribe({
        next: (res) => {
          this.mosque.set(res.mosque);
          this.isActive.set(res.mosque?.status === 'Active');
          this.mosqueSlug.set(res.mosque?.slug ?? '');
          this.profile.set({
            completeness: res.profileCompleteness ?? 0,
            missing: res.missingFields ?? [],
          });
          if (res.mosque?.id) {
            this.adminApi.getMosqueModules(res.mosque.id).subscribe({
              next: (mods) => {
                this.totalModules.set(mods.length);
                this.enabledModules.set(mods.filter(m => m.isEnabled).length);
              },
              error: () => {
                this.totalModules.set(0);
                this.enabledModules.set(0);
              },
            });
          }
        },
        error: () => {
          this.profile.set(null);
          this.mosque.set(null);
        },
      });

      this.admin.getDashboard(mosqueId).subscribe({
        next: d => { this.data.set(d); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    });
  }



  chartBlocks(d: MosqueAdminDashboard) {

    return [

      { title: 'Monthly Attendance %', points: d.charts.monthlyAttendance || [] },

      { title: 'Event Participation', points: d.charts.eventParticipation || [] },

      { title: 'Student Growth', points: d.charts.studentGrowth || [] },

      { title: 'Fee Collection', points: d.charts.feeCollection || [] },

    ];

  }



  barHeight(value: number, series: { value: number }[]): number {

    const max = Math.max(...series.map(p => p.value), 1);

    return Math.max(8, Math.round((value / max) * 100));

  }

}


