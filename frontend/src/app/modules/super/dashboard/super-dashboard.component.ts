import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import {
  AuditLogEntry,
  PlatformService,
  PlatformStats,
  PlatformUser,
} from '../../../core/services/platform.service';
import { TodayService } from '../../../core/services/today.service';
import { SUPER_ADMIN_NAV_ICONS } from '../../../core/config/super-admin-nav.config';
import { ROLES } from '../../../core/constants/roles';
import { Mosque, TodayResponse } from '../../../core/models';
import {
  countdownToJamaat,
  formatHijriDate,
  formatTime12,
  getActivePrayerName,
  getPrayerSlots,
  isRamadan,
  resolveNextPrayer,
  suhoorEndTime,
} from '../../../core/utils/prayer.utils';
import { currentDayName } from '../../../core/utils/date.utils';
import { DashboardBadgesComponent } from '../../../shared/ui/dashboard-badges.component';

interface PrayerRow {
  name: string;
  adhan: string;
  iqamah: string;
  adhanFmt: string;
  iqamahFmt: string;
  isCurrent: boolean;
  isNext: boolean;
}

interface MarqueeItem {
  icon: string;
  text: string;
  tag?: string;
}

interface SlideItem {
  kind: string;
  title: string;
  body: string;
  ref?: string;
}

interface StatCard {
  label: string;
  valueKey: 'activeMosques' | 'pendingClaims' | 'totalUsers' | 'openCampaigns';
  route: string;
  icon: string;
  warn?: boolean;
}

interface QuickAction {
  label: string;
  route: string;
  icon: string;
  desc: string;
}

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

interface RoleCount {
  role: string;
  count: number;
}

@Component({
  selector: 'app-super-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DashboardBadgesComponent],
  template: `
    <div class="sdash">
      <!-- 1. Header -->
      <header class="sdash-header">
        <div>
          <app-dashboard-badges [useAuthRole]="true" />
          <h1 class="sdash-title">Dashboard overview</h1>
          <p class="sdash-greeting">{{ greeting() }}</p>
          <p class="sdash-sub">Platform pulse · live prayer & community signals</p>
        </div>
        <button type="button" class="sdash-refresh" (click)="refresh()" [disabled]="loading()">
          {{ loading() ? 'Refreshing…' : 'Refresh' }}
        </button>
      </header>

      <!-- 2. Stat cards -->
      <div class="sdash-stats" *ngIf="stats() as s">
        <a *ngFor="let card of statCards" [routerLink]="card.route"
          class="scard" [class.scard--warn]="card.warn">
          <span class="scard-icon">{{ card.icon }}</span>
          <div>
            <p class="scard-label">{{ card.label }}</p>
            <p class="scard-value">{{ statValue(card.valueKey, s) }}</p>
          </div>
        </a>
      </div>

      <!-- 3. Needs attention -->
      <article class="scard scard--alert" *ngIf="alerts().length">
        <h3 class="scard-heading scard-heading--alert">Needs attention</h3>
        <ul class="alert-list">
          <li *ngFor="let alert of alerts()" class="alert-item">
            <span class="alert-msg">{{ alert.message }}</span>
            <a [routerLink]="alert.route" class="alert-action">{{ alert.action }} →</a>
          </li>
        </ul>
      </article>

      <!-- 4. Hero row -->
      <div class="sdash-hero-row">
        <article class="scard scard--hero scard--interactive">
          <p class="hero-eyebrow">Next prayer · {{ mosqueName() }}</p>
          <h2 class="hero-prayer">{{ nextPrayerName() }}</h2>
          <p class="hero-countdown" aria-live="polite">{{ countdown() }}</p>
          <p class="hero-meta">Iqāmah {{ nextJamaatFmt() }} · Adhān {{ nextAdhanFmt() }}</p>
          <div class="hero-actions">
            <a routerLink="/dashboard/prayer-times" class="hero-chip">Full timetable</a>
            <button type="button" class="hero-chip hero-chip--ghost" (click)="refreshToday()">Refresh times</button>
          </div>
        </article>

        <article class="scard scard--clock scard--interactive">
          <p class="clock-digital" aria-live="polite">{{ liveClock() }}</p>
          <p class="clock-gregorian">{{ gregorianDate() }}</p>
          <p class="clock-hijri">{{ hijriDate() }}</p>
          <div class="clock-badges">
            <span *ngIf="isFriday()" class="clock-badge clock-badge--gold">Jumuah</span>
            <span *ngIf="ramadan()" class="clock-badge clock-badge--ramadan">Ramadan</span>
            <span class="clock-badge">{{ dayName() }}</span>
          </div>
        </article>
      </div>

      <!-- 5. Prayer timetable -->
      <article class="scard scard--table" *ngIf="prayerRows().length">
        <div class="table-head">
          <h3 class="scard-heading">Prayer timetable</h3>
          <span class="table-hint">Adhān & Iqāmah · today</span>
        </div>
        <div class="table-wrap">
          <table class="ptable">
            <thead>
              <tr>
                <th>Prayer</th>
                <th>Adhān</th>
                <th>Iqāmah</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of prayerRows()"
                [class.ptable-row--current]="row.isCurrent"
                [class.ptable-row--next]="row.isNext">
                <td>
                  <span class="ptable-name">{{ row.name }}</span>
                  <span *ngIf="row.isCurrent" class="ptable-pill">Now</span>
                  <span *ngIf="row.isNext" class="ptable-pill ptable-pill--next">Next</span>
                </td>
                <td>{{ row.adhanFmt }}</td>
                <td>{{ row.iqamahFmt }}</td>
                <td class="ptable-action">
                  <a routerLink="/dashboard/admin/prayer-times" title="Edit">✎</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <!-- 6. Mini cards -->
      <div class="sdash-mini-row">
        <article class="scard scard--mini scard--interactive">
          <span class="mini-icon">🌙</span>
          <div>
            <p class="mini-label">Suhoor ends</p>
            <p class="mini-value">{{ suhoorFmt() }}</p>
            <p class="mini-hint">{{ ramadan() ? 'Last intake before Fajr' : 'Ramadan-ready widget' }}</p>
          </div>
        </article>
        <article class="scard scard--mini scard--interactive">
          <span class="mini-icon">🌅</span>
          <div>
            <p class="mini-label">Iftar</p>
            <p class="mini-value">{{ iftarFmt() }}</p>
            <p class="mini-hint">At Maghrib adhān</p>
          </div>
        </article>
        <article class="scard scard--mini scard--interactive">
          <span class="mini-icon">📢</span>
          <div>
            <p class="mini-label">Live notices</p>
            <p class="mini-value">{{ marqueeItems().length }}</p>
            <p class="mini-hint">Announcements & events</p>
          </div>
        </article>
        <article class="scard scard--mini scard--interactive">
          <span class="mini-icon">📖</span>
          <div>
            <p class="mini-label">Wisdom slider</p>
            <p class="mini-value mini-value--sm">{{ activeSlide().kind }}</p>
            <p class="mini-hint">Auto-rotating</p>
          </div>
        </article>
      </div>

      <!-- 7. Marquee -->
      <article class="scard scard--marquee" *ngIf="marqueeItems().length">
        <div class="marquee-track" aria-label="Announcements marquee">
          <div class="marquee-inner">
            <span *ngFor="let item of marqueeDoubled()" class="marquee-item">
              <span class="marquee-icon">{{ item.icon }}</span>
              <span *ngIf="item.tag" class="marquee-tag">{{ item.tag }}</span>
              {{ item.text }}
            </span>
          </div>
        </div>
      </article>

      <!-- 8. Content slider -->
      <article class="scard scard--slider scard--interactive">
        <div class="slider-head">
          <h3 class="scard-heading">Daily reminder</h3>
          <div class="slider-dots">
            <button *ngFor="let slide of slides; let i = index" type="button"
              class="slider-dot" [class.slider-dot--active]="slideIndex() === i"
              (click)="goToSlide(i)" [attr.aria-label]="'Slide ' + (i + 1)"></button>
          </div>
        </div>
        <div class="slider-body">
          <span class="slider-kind">{{ activeSlide().kind }}</span>
          <h4 class="slider-title">{{ activeSlide().title }}</h4>
          <p class="slider-text">{{ activeSlide().body }}</p>
          <p *ngIf="activeSlide().ref" class="slider-ref">{{ activeSlide().ref }}</p>
        </div>
        <div class="slider-nav">
          <button type="button" class="slider-btn" (click)="prevSlide()" aria-label="Previous">‹</button>
          <button type="button" class="slider-btn" (click)="nextSlide()" aria-label="Next">›</button>
        </div>
      </article>

      <!-- 9. Quick actions -->
      <section class="sdash-section">
        <h3 class="sdash-section-title">Quick actions</h3>
        <div class="quick-grid">
          <a *ngFor="let action of quickActions" [routerLink]="action.route"
            class="scard quick-action scard--interactive">
            <span class="quick-icon">{{ action.icon }}</span>
            <p class="quick-label">{{ action.label }}</p>
            <p class="quick-desc">{{ action.desc }}</p>
          </a>
        </div>
      </section>

      <!-- 10. Pending claims + Users by role -->
      <div class="sdash-split-row">
        <article class="scard">
          <div class="table-head">
            <h3 class="scard-heading">Pending claims</h3>
            <a routerLink="/dashboard/super/mosques/claims" class="sdash-link-sm">View all →</a>
          </div>
          <p *ngIf="!pendingClaims().length" class="panel-empty">No pending mosque claims.</p>
          <div *ngFor="let m of pendingClaims()" class="claim-row">
            <h4 class="claim-name">{{ m.name }}</h4>
            <p class="claim-meta">{{ m.city }} · Owner: {{ m.ownerId || '—' }}</p>
            <div class="claim-actions">
              <button type="button" class="btn-approve" (click)="approveClaim(m.id)">Approve</button>
              <button type="button" class="btn-reject" (click)="rejectClaim(m.id)">Reject</button>
            </div>
          </div>
        </article>

        <article class="scard">
          <div class="table-head">
            <h3 class="scard-heading">Users by role</h3>
            <a routerLink="/dashboard/super/users" class="sdash-link-sm">Manage →</a>
          </div>
          <div *ngFor="let row of roleCounts()" class="role-row">
            <div class="role-head">
              <span class="role-name">{{ row.role }}</span>
              <span class="role-count">{{ row.count }}</span>
            </div>
            <div class="role-bar">
              <div class="role-bar-fill" [style.width.%]="roleBarWidth(row.count)"></div>
            </div>
          </div>
          <p *ngIf="!roleCounts().length" class="panel-empty">No users found.</p>
        </article>
      </div>

      <!-- 11. Mosque status + Recent activity -->
      <div class="sdash-split-row">
        <article class="scard">
          <h3 class="scard-heading mb-3">Mosque status</h3>
          <div class="status-grid">
            <div *ngFor="let row of mosqueStatusRows()" class="status-cell">
              <p class="status-label">{{ row.label }}</p>
              <p class="status-value">{{ row.count }}</p>
            </div>
          </div>
        </article>

        <article class="scard scard--activity">
          <div class="table-head">
            <h3 class="scard-heading">Recent activity</h3>
            <a routerLink="/dashboard/super/audit" class="sdash-link-sm">All logs →</a>
          </div>
          <ul class="activity-list">
            <li *ngFor="let log of recentLogs()" class="activity-item">
              <span class="activity-icon">{{ activityIcon(log.action) }}</span>
              <div class="activity-body">
                <p class="activity-title">{{ log.description || log.action }}</p>
                <p class="activity-meta">{{ log.actorId }} · {{ log.createdAt | date:'medium' }}</p>
              </div>
            </li>
          </ul>
          <p *ngIf="!recentLogs().length" class="panel-empty">No recent platform activity yet.</p>
        </article>
      </div>

      <!-- 12. Platform roadmap -->
      <section class="sdash-section">
        <h3 class="sdash-section-title">Platform roadmap</h3>
        <p class="sdash-section-desc">Step-by-step guide for full platform setup — each card opens a live screen.</p>
        <div class="roadmap-list">
          <a *ngFor="let w of workflow" [routerLink]="w.route" class="scard roadmap-card scard--interactive">
            <div class="roadmap-inner">
              <span class="step-num">{{ w.step }}</span>
              <div class="roadmap-body">
                <div class="roadmap-head">
                  <h4 class="roadmap-title">{{ w.title }}</h4>
                  <ng-container *ngIf="stats() as s">
                    <span *ngIf="w.statKey" class="roadmap-stat" [class]="w.statClass || 'roadmap-stat--default'">
                      {{ w.statLabel }}: {{ s[w.statKey!] }}
                    </span>
                  </ng-container>
                </div>
                <p class="roadmap-summary">{{ w.summary }}</p>
                <ul class="roadmap-steps" *ngIf="w.steps.length">
                  <li *ngFor="let line of w.steps">{{ line }}</li>
                </ul>
              </div>
              <span class="roadmap-open">Open →</span>
            </div>
          </a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .sdash { display: flex; flex-direction: column; gap: 1rem; }
    .sdash-header {
      display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 0.75rem;
      margin-bottom: 0.25rem;
    }
    .sdash-title { margin: 0; font-size: 1.125rem; font-weight: 600; color: #fff; }
    .sdash-greeting { margin: 0.25rem 0 0; font-size: 0.9375rem; color: #fcd34d; font-weight: 500; }
    .sdash-sub { margin: 0.125rem 0 0; font-size: 0.8125rem; color: #6ee7b7; opacity: 0.75; }
    .sdash-refresh {
      font-size: 0.8125rem; font-weight: 600; color: #022c22; background: #f59e0b;
      padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; cursor: pointer;
    }
    .sdash-refresh:disabled { opacity: 0.6; cursor: wait; }
    .sdash-link-sm { font-size: 0.75rem; color: #fbbf24; text-decoration: none; }
    .sdash-link-sm:hover { text-decoration: underline; }
    .sdash-section-title { margin: 0 0 0.75rem; font-size: 1rem; font-weight: 600; color: #fff; }
    .sdash-section-desc { margin: -0.5rem 0 0.75rem; font-size: 0.8125rem; color: #6ee7b7; opacity: 0.8; }
    .mb-3 { margin-bottom: 0.75rem; }

    .scard {
      background: #064e3b; border: 1px solid #065f46; border-radius: 0.75rem;
      padding: 0.875rem 1rem; text-decoration: none; color: inherit; display: block;
    }
    .scard--interactive {
      transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }
    .scard--interactive:hover {
      border-color: rgba(245, 158, 11, 0.45);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
    }
    .scard--alert { border-color: rgba(245, 158, 11, 0.35); background: rgba(120, 53, 15, 0.15); }
    .scard-heading { margin: 0; font-size: 0.9375rem; font-weight: 600; color: #fff; }
    .scard-heading--alert { color: #fbbf24; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.75rem; }

    .sdash-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
    @media (min-width: 1024px) { .sdash-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    .sdash-stats .scard { display: flex; align-items: center; gap: 0.75rem; }
    .scard-icon {
      width: 2.25rem; height: 2.25rem; border-radius: 0.5rem;
      background: rgba(16, 185, 129, 0.12); border: 1px solid #065f46;
      display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;
    }
    .scard--warn .scard-icon { background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.35); }
    .scard-label { margin: 0; font-size: 0.75rem; color: #6ee7b7; opacity: 0.8; }
    .scard-value { margin: 0.125rem 0 0; font-size: 1.5rem; font-weight: 700; color: #fff; line-height: 1; }
    .scard--warn .scard-value { color: #fbbf24; }

    .alert-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .alert-item { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; font-size: 0.8125rem; }
    .alert-msg { color: #ecfdf5; }
    .alert-action { color: #fbbf24; font-weight: 700; text-decoration: none; flex-shrink: 0; }

    .sdash-hero-row { display: grid; gap: 0.75rem; grid-template-columns: 1fr; }
    @media (min-width: 900px) { .sdash-hero-row { grid-template-columns: 1.2fr 1fr; } }
    .scard--hero {
      background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
      border-color: rgba(245, 158, 11, 0.35); padding: 1.25rem;
    }
    .hero-eyebrow { margin: 0; font-size: 0.75rem; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.06em; }
    .hero-prayer {
      margin: 0.5rem 0 0; font-family: ui-serif, Georgia, serif;
      font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 700; color: #fff;
    }
    .hero-countdown {
      margin: 0.375rem 0 0; font-family: ui-monospace, monospace;
      font-size: clamp(2rem, 5vw, 3rem); font-weight: 700; color: #fbbf24; letter-spacing: 0.04em;
    }
    .hero-meta { margin: 0.5rem 0 0; font-size: 0.8125rem; color: #a7f3d0; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
    .hero-chip {
      font-size: 0.75rem; font-weight: 600; padding: 0.375rem 0.75rem; border-radius: 9999px;
      background: rgba(245, 158, 11, 0.15); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.35);
      text-decoration: none; cursor: pointer;
    }
    .hero-chip--ghost { background: transparent; color: #6ee7b7; border-color: #065f46; }

    .scard--clock { padding: 1.25rem; text-align: center; }
    .clock-digital {
      margin: 0; font-family: ui-monospace, monospace; font-size: clamp(2rem, 4vw, 2.75rem);
      font-weight: 700; color: #fff; letter-spacing: 0.06em;
    }
    .clock-gregorian { margin: 0.5rem 0 0; font-size: 0.875rem; color: #d1fae5; }
    .clock-hijri { margin: 0.25rem 0 0; font-size: 0.8125rem; color: #6ee7b7; font-style: italic; }
    .clock-badges { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.375rem; margin-top: 0.75rem; }
    .clock-badge {
      font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 0.2rem 0.5rem; border-radius: 9999px; border: 1px solid #065f46; color: #6ee7b7;
    }
    .clock-badge--gold { color: #fcd34d; border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.1); }
    .clock-badge--ramadan { color: #c4b5fd; border-color: rgba(167, 139, 250, 0.4); background: rgba(139, 92, 246, 0.12); }

    .table-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.75rem; }
    .table-hint { font-size: 0.75rem; color: #6ee7b7; opacity: 0.65; }
    .table-wrap { border: 1px solid #065f46; border-radius: 0.5rem; overflow: hidden; }
    .ptable { width: 100%; font-size: 0.8125rem; border-collapse: collapse; text-align: center; }
    .ptable thead tr { background: rgba(6, 78, 59, 0.8); }
    .ptable th { padding: 0.5rem 0.75rem; font-weight: 500; color: #6ee7b7; text-align: center; }
    .ptable th:first-child { text-align: left; }
    .ptable td { padding: 0.5rem 0.75rem; color: #d1fae5; border-top: 1px solid #065f46; }
    .ptable td:first-child { text-align: left; }
    .ptable-row--current { background: rgba(245, 158, 11, 0.08); }
    .ptable-row--current td { color: #fff; }
    .ptable-row--next { background: rgba(59, 130, 246, 0.08); }
    .ptable-name { font-weight: 600; }
    .ptable-pill {
      margin-left: 0.5rem; font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
      padding: 0.125rem 0.375rem; border-radius: 9999px;
      background: rgba(245, 158, 11, 0.2); color: #fbbf24;
    }
    .ptable-pill--next { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .ptable-action a { color: #6ee7b7; text-decoration: none; opacity: 0.7; }
    .ptable-action a:hover { opacity: 1; color: #fbbf24; }

    .sdash-mini-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
    @media (min-width: 900px) { .sdash-mini-row { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    .scard--mini { display: flex; align-items: flex-start; gap: 0.625rem; }
    .mini-icon { font-size: 1.25rem; line-height: 1; flex-shrink: 0; }
    .mini-label { margin: 0; font-size: 0.6875rem; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.04em; }
    .mini-value { margin: 0.125rem 0 0; font-size: 1.125rem; font-weight: 700; color: #fff; }
    .mini-value--sm { font-size: 0.875rem; font-weight: 600; color: #fcd34d; }
    .mini-hint { margin: 0.25rem 0 0; font-size: 0.6875rem; color: #6ee7b7; opacity: 0.65; }

    .scard--marquee { padding: 0; overflow: hidden; }
    .marquee-track {
      mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
      -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
    }
    .marquee-inner {
      display: flex; gap: 2.5rem; width: max-content;
      animation: sdashMarquee 40s linear infinite; padding: 0.75rem 0;
    }
    .marquee-inner:hover { animation-play-state: paused; }
    @keyframes sdashMarquee {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
    .marquee-item {
      display: inline-flex; align-items: center; gap: 0.5rem;
      font-size: 0.8125rem; color: #d1fae5; white-space: nowrap;
    }
    .marquee-icon { opacity: 0.85; }
    .marquee-tag {
      font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
      padding: 0.125rem 0.375rem; border-radius: 9999px;
      background: rgba(16, 185, 129, 0.2); color: #34d399;
    }

    .scard--slider { position: relative; padding-bottom: 2.75rem; min-height: 9rem; }
    .slider-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
    .slider-dots { display: flex; gap: 0.375rem; }
    .slider-dot {
      width: 0.5rem; height: 0.5rem; border-radius: 9999px; border: none; padding: 0;
      background: #065f46; cursor: pointer;
    }
    .slider-dot--active { background: #f59e0b; transform: scale(1.15); }
    .slider-kind {
      font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #fbbf24;
    }
    .slider-title { margin: 0.375rem 0 0; font-size: 1rem; font-weight: 600; color: #fff; }
    .slider-text { margin: 0.5rem 0 0; font-size: 0.875rem; color: #a7f3d0; line-height: 1.55; }
    .slider-ref { margin: 0.5rem 0 0; font-size: 0.75rem; color: #6ee7b7; font-style: italic; }
    .slider-nav { position: absolute; right: 1rem; bottom: 0.875rem; display: flex; gap: 0.375rem; }
    .slider-btn {
      width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid #065f46;
      background: #022c22; color: #6ee7b7; cursor: pointer; font-size: 1.125rem; line-height: 1;
    }
    .slider-btn:hover { border-color: #f59e0b; color: #fbbf24; }

    .quick-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
    @media (min-width: 640px) { .quick-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    .quick-action { padding: 1rem; }
    .quick-icon { font-size: 1.5rem; display: block; margin-bottom: 0.5rem; }
    .quick-label { margin: 0; font-size: 0.8125rem; font-weight: 700; color: #fff; }
    .quick-desc { margin: 0.25rem 0 0; font-size: 0.6875rem; color: #6ee7b7; line-height: 1.35; }

    .sdash-split-row { display: grid; gap: 0.75rem; }
    @media (min-width: 1024px) { .sdash-split-row { grid-template-columns: 1fr 1fr; } }
    .panel-empty { margin: 0; font-size: 0.8125rem; color: #6ee7b7; }
    .claim-row { padding-bottom: 0.75rem; margin-bottom: 0.75rem; border-bottom: 1px solid rgba(6, 95, 70, 0.6); }
    .claim-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .claim-name { margin: 0; font-size: 0.875rem; font-weight: 600; color: #fff; }
    .claim-meta { margin: 0.25rem 0 0.5rem; font-size: 0.75rem; color: #6ee7b7; }
    .claim-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .btn-approve {
      background: #10b981; color: #022c22; font-weight: 700; padding: 0.375rem 0.875rem;
      border-radius: 0.5rem; border: none; cursor: pointer; font-size: 0.8125rem;
    }
    .btn-reject {
      background: #ef4444; color: #fff; font-weight: 700; padding: 0.375rem 0.875rem;
      border-radius: 0.5rem; border: none; cursor: pointer; font-size: 0.8125rem;
    }
    .role-row { margin-bottom: 0.75rem; }
    .role-row:last-child { margin-bottom: 0; }
    .role-head { display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 0.25rem; }
    .role-name { color: #a7f3d0; }
    .role-count { color: #fff; font-weight: 700; }
    .role-bar { height: 6px; border-radius: 9999px; background: rgba(16, 185, 129, 0.25); overflow: hidden; }
    .role-bar-fill { height: 100%; background: #10b981; border-radius: 9999px; }

    .status-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
    .status-cell {
      background: #022c22; border: 1px solid #065f46; border-radius: 0.5rem;
      padding: 0.75rem; text-align: center;
    }
    .status-label { margin: 0; font-size: 0.6875rem; color: #6ee7b7; text-transform: uppercase; }
    .status-value { margin: 0.25rem 0 0; font-size: 1.25rem; font-weight: 700; color: #fff; }

    .activity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .activity-item {
      display: flex; align-items: flex-start; gap: 0.75rem;
      padding: 0.625rem 0.75rem; border: 1px solid #065f46; border-radius: 0.5rem;
      background: rgba(2, 44, 34, 0.35);
    }
    .activity-icon { font-size: 1rem; flex-shrink: 0; margin-top: 0.125rem; }
    .activity-title { margin: 0; font-size: 0.8125rem; color: #ecfdf5; }
    .activity-meta { margin: 0.25rem 0 0; font-size: 0.75rem; color: #6ee7b7; opacity: 0.7; }

    .roadmap-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .roadmap-card { padding: 1rem 1.125rem; }
    .roadmap-inner { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 0.75rem; }
    .step-num {
      width: 2rem; height: 2rem; border-radius: 9999px;
      background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.45);
      color: #fbbf24; font-weight: 700; font-size: 0.875rem;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .roadmap-body { flex: 1; min-width: 0; }
    .roadmap-head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 0.375rem; }
    .roadmap-title { margin: 0; font-size: 1rem; font-weight: 700; color: #fff; }
    .roadmap-stat {
      font-size: 0.6875rem; font-weight: 700; padding: 0.125rem 0.5rem; border-radius: 9999px; border: 1px solid;
    }
    .roadmap-stat--default { color: #6ee7b7; border-color: #065f46; background: rgba(6, 78, 59, 0.5); }
    .roadmap-stat--warn { color: #fbbf24; border-color: rgba(245, 158, 11, 0.45); background: rgba(120, 53, 15, 0.25); }
    .roadmap-stat--active { color: #86efac; border-color: rgba(34, 197, 94, 0.45); background: rgba(20, 83, 45, 0.35); }
    .roadmap-summary { margin: 0 0 0.75rem; font-size: 0.8125rem; color: #a7f3d0; }
    .roadmap-steps { list-style: disc; margin: 0.5rem 0 0; padding: 0 0 0 1.125rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .roadmap-steps li { font-size: 0.8125rem; color: #d1fae5; line-height: 1.4; }
    .roadmap-open {
      flex-shrink: 0; align-self: center; font-size: 0.8125rem; font-weight: 700;
      color: #022c22; background: #f59e0b; padding: 0.375rem 0.75rem; border-radius: 0.5rem;
    }
  `]
})
export class SuperDashboardComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private platform = inject(PlatformService);
  private todayService = inject(TodayService);
  private admin = inject(AdminService);
  private mosqueService = inject(MosqueService);

  stats = signal<PlatformStats | null>(null);
  today = signal<TodayResponse | null>(null);
  pendingClaims = signal<Mosque[]>([]);
  recentLogs = signal<AuditLogEntry[]>([]);
  users = signal<PlatformUser[]>([]);
  mosques = signal<Mosque[]>([]);
  mosqueName = signal('Platform mosque');
  openCampaigns = signal(0);
  loading = signal(false);

  liveClock = signal('--:--:--');
  gregorianDate = signal('');
  hijriDate = signal('');
  countdown = signal('00:00:00');
  slideIndex = signal(0);

  private clockTimer?: ReturnType<typeof setInterval>;
  private slideTimer?: ReturnType<typeof setInterval>;

  readonly icons = SUPER_ADMIN_NAV_ICONS;

  readonly statCards: StatCard[] = [
    { label: 'Active mosques', valueKey: 'activeMosques', route: '/dashboard/super/mosques', icon: SUPER_ADMIN_NAV_ICONS['mosque'] },
    { label: 'Pending claims', valueKey: 'pendingClaims', route: '/dashboard/super/mosques/claims', icon: SUPER_ADMIN_NAV_ICONS['stamp'], warn: true },
    { label: 'Total users', valueKey: 'totalUsers', route: '/dashboard/super/users', icon: SUPER_ADMIN_NAV_ICONS['users'] },
    { label: 'Open campaigns', valueKey: 'openCampaigns', route: '/dashboard/admin/janaza', icon: SUPER_ADMIN_NAV_ICONS['campaigns'] },
  ];

  readonly quickActions: QuickAction[] = [
    { label: 'Mosques', route: '/dashboard/super/mosques', icon: SUPER_ADMIN_NAV_ICONS['mosque'], desc: 'Add & monitor listings' },
    { label: 'Users', route: '/dashboard/super/users', icon: SUPER_ADMIN_NAV_ICONS['users'], desc: 'Browse all accounts' },
    { label: 'Roles', route: '/dashboard/super/users', icon: '🔑', desc: 'Assign permissions' },
    { label: 'Claims', route: '/dashboard/super/mosques/claims', icon: SUPER_ADMIN_NAV_ICONS['stamp'], desc: 'Approve ownership' },
    { label: 'Assignment', route: '/dashboard/super/mosque-assignment', icon: '🏛️', desc: 'Link users to mosques' },
    { label: 'Features', route: '/dashboard/super/users/features', icon: SUPER_ADMIN_NAV_ICONS['toggle'], desc: 'Toggle modules' },
    { label: 'Reports', route: '/dashboard/super/reports', icon: '📈', desc: 'Platform metrics' },
    { label: 'Settings', route: '/dashboard/super/settings', icon: SUPER_ADMIN_NAV_ICONS['settings'], desc: 'Configuration' },
  ];

  readonly workflow: WorkflowStep[] = [
    {
      step: 1,
      route: '/dashboard/super',
      title: 'Dashboard',
      summary: 'Platform overview with live stats, prayer widgets, and quick actions.',
      steps: [
        'Review mosque, claim, and user totals',
        'Handle pending claims and recent activity',
        'Use quick actions to jump to any module',
      ],
      statLabel: 'Users',
      statKey: 'totalUsers',
    },
    {
      step: 2,
      route: '/dashboard/super/mosques',
      title: 'Mosque Management',
      summary: 'Add mosque listings and monitor status across the platform.',
      steps: [
        'Seed new unclaimed mosque listings for rollout',
        'Enter name, slug, address, and city details',
        'Track Active, Unclaimed, and Claimed mosques',
      ],
      statLabel: 'Total',
      statKey: 'totalMosques',
    },
    {
      step: 3,
      route: '/dashboard/super/users',
      title: 'User Management',
      summary: 'Browse every account on the platform.',
      steps: [
        'Search users by name, username, or email',
        'View join date and current role badges',
        'Use Role Assignment (step 4) to change permissions',
      ],
      statLabel: 'Users',
      statKey: 'totalUsers',
    },
    {
      step: 4,
      route: '/dashboard/super/users',
      title: 'Role Assignment',
      summary: 'Grant or revoke platform roles for each user.',
      steps: [
        'Select a user and review their current roles',
        'Assign Admin, Teacher, Parent, Member, etc.',
        'Remove roles that are no longer needed',
      ],
    },
    {
      step: 5,
      route: '/dashboard/super/mosque-assignment',
      title: 'Mosque Assignment',
      summary: 'Link users to mosques as admin or owner.',
      steps: [
        'Pick a mosque and a user from the lists',
        'Optionally mark the user as Mosque Owner',
        'Save — admin access applies immediately',
      ],
    },
    {
      step: 6,
      route: '/dashboard/super/mosques/claims',
      title: 'Claims Management',
      summary: 'Review and resolve mosque ownership requests.',
      steps: [
        'Open the pending claims queue',
        'Verify mosque and claimant details',
        'Approve or reject with an optional reason',
      ],
      statLabel: 'Pending',
      statKey: 'pendingClaims',
      statClass: 'roadmap-stat roadmap-stat--warn',
    },
    {
      step: 7,
      route: '/dashboard/super/users/features',
      title: 'Feature Flags',
      summary: 'Turn modules on or off per mosque.',
      steps: [
        'Select the mosque to configure',
        'Toggle Announcements, Events, Madrassah, etc.',
        'Changes apply immediately for that mosque',
      ],
    },
    {
      step: 8,
      route: '/dashboard/super/audit',
      title: 'Audit Logs',
      summary: 'Track platform changes and admin actions.',
      steps: [
        'Review role changes, claim decisions, and seeds',
        'Inspect prayer time edits in the combined log',
        'Use timestamps to trace who changed what',
      ],
    },
    {
      step: 9,
      route: '/dashboard/super/reports',
      title: 'Reports',
      summary: 'Platform metrics and per-mosque data snapshots.',
      steps: [
        'View status breakdown across all mosques',
        'Check announcement, event, and student counts',
        'Export insights for stakeholders (coming soon)',
      ],
      statLabel: 'Active',
      statKey: 'activeMosques',
      statClass: 'roadmap-stat roadmap-stat--active',
    },
    {
      step: 10,
      route: '/dashboard/super/settings',
      title: 'Settings',
      summary: 'Platform configuration and integration status.',
      steps: [
        'Review API URL and default mosque ID',
        'Check social login provider configuration',
        'Confirm support contacts and defaults',
      ],
    },
  ];

  readonly slides: SlideItem[] = [
    {
      kind: 'Qur\'an',
      title: 'Remember Me — I will remember you',
      body: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.',
      ref: 'Al-Baqarah 2:152',
    },
    {
      kind: 'Hadith',
      title: 'The best of people',
      body: 'The best of people are those who are most beneficial to others.',
      ref: 'Tabarani',
    },
    {
      kind: 'Reminder',
      title: 'Prayer is the first question',
      body: 'Guard your five daily prayers — the believer\'s appointment with Allah comes before all else.',
    },
    {
      kind: 'Promotion',
      title: 'Dalail al-Khayrat circle',
      body: 'Join the weekly wird circle every Thursday after Maghrib — open to all murids on MOS.',
      ref: 'Content library',
    },
  ];

  greeting = computed(() => {
    const name = this.auth.user()?.fullName || this.auth.user()?.userName || 'Super Admin';
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${period}, ${name}`;
  });

  ramadan = computed(() => isRamadan());
  isFriday = computed(() => this.today()?.isFriday ?? new Date().getDay() === 5);
  dayName = computed(() => currentDayName());

  nextPrayerName = computed(() => {
    const next = this.today()?.nextPrayer;
    return next?.name?.replace(' (tomorrow)', '') ?? '—';
  });

  nextJamaatFmt = computed(() => {
    const j = this.today()?.nextPrayer?.jamaat;
    return j ? formatTime12(j) : '—';
  });

  nextAdhanFmt = computed(() => {
    const t = this.today();
    const next = t?.nextPrayer;
    if (!t?.prayerTimes || !next) return '—';
    const slot = getPrayerSlots(t.prayerTimes).find(p => p.name === next.name.replace(' (tomorrow)', ''));
    return slot ? formatTime12(slot.start) : '—';
  });

  prayerRows = computed((): PrayerRow[] => {
    const t = this.today();
    if (!t?.prayerTimes) return [];
    const active = getActivePrayerName(t.prayerTimes);
    const nextName = t.nextPrayer?.name.replace(' (tomorrow)', '') ?? '';
    return getPrayerSlots(t.prayerTimes).map(p => ({
      name: p.name,
      adhan: p.start,
      iqamah: p.jamaat,
      adhanFmt: formatTime12(p.start),
      iqamahFmt: formatTime12(p.jamaat),
      isCurrent: p.name === active,
      isNext: p.name === nextName,
    }));
  });

  suhoorFmt = computed(() => {
    const fajr = this.today()?.prayerTimes?.fajrStart;
    return fajr ? formatTime12(suhoorEndTime(fajr)) : '—';
  });

  iftarFmt = computed(() => {
    const maghrib = this.today()?.prayerTimes?.maghribStart;
    return maghrib ? formatTime12(maghrib) : '—';
  });

  marqueeItems = computed((): MarqueeItem[] => {
    const items: MarqueeItem[] = [];
    const t = this.today();
    for (const a of t?.announcements ?? []) {
      items.push({ icon: '📢', text: a.title, tag: a.status === 'Published' ? 'Notice' : 'Draft' });
    }
    if (t?.tonightEvent) {
      items.push({ icon: '📅', text: t.tonightEvent.title, tag: t.tonightEvent.eventType || 'Event' });
    }
    if (this.stats()?.pendingClaims) {
      items.push({
        icon: '✓',
        text: `${this.stats()!.pendingClaims} mosque claim(s) awaiting Super Admin review`,
        tag: 'Action',
      });
    }
    if (this.openCampaigns() > 0) {
      items.push({
        icon: '📿',
        text: `${this.openCampaigns()} active reading campaign(s) across the platform`,
        tag: 'Campaign',
      });
    }
    items.push({
      icon: '💝',
      text: 'Support your masjid — donation campaigns can be published from Announcements',
      tag: 'Campaign',
    });
    if (!items.length) {
      items.push({ icon: 'ℹ️', text: 'No live announcements — publish from Oversight → Announcements / events' });
    }
    return items;
  });

  marqueeDoubled = computed(() => [...this.marqueeItems(), ...this.marqueeItems()]);
  activeSlide = computed(() => this.slides[this.slideIndex()] ?? this.slides[0]);

  roleCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const role of Object.values(ROLES)) counts.set(role, 0);
    for (const user of this.users()) {
      for (const role of user.roles) {
        counts.set(role, (counts.get(role) ?? 0) + 1);
      }
    }
    const rows: RoleCount[] = [];
    for (const [role, count] of counts) {
      if (count > 0) rows.push({ role, count });
    }
    return rows.sort((a, b) => b.count - a.count);
  });

  mosqueStatusRows = computed(() => {
    const mosques = this.mosques();
    const tally = (status: string) => mosques.filter(m => m.status === status).length;
    return [
      { label: 'Active', count: tally('Active') },
      { label: 'Claimed', count: tally('Claimed') },
      { label: 'Unclaimed', count: tally('Unclaimed') },
    ];
  });

  alerts = computed(() => {
    const s = this.stats();
    const items: { message: string; route: string; action: string }[] = [];
    if (s && s.pendingClaims > 0) {
      items.push({
        message: `${s.pendingClaims} mosque claim${s.pendingClaims > 1 ? 's' : ''} waiting for your review`,
        route: '/dashboard/super/mosques/claims',
        action: 'Review claims',
      });
    }
    const unclaimed = this.mosques().filter(m => m.status === 'Unclaimed').length;
    if (unclaimed > 0) {
      items.push({
        message: `${unclaimed} unclaimed mosque listing${unclaimed > 1 ? 's' : ''} ready for rollout`,
        route: '/dashboard/super/mosques',
        action: 'View mosques',
      });
    }
    return items;
  });

  ngOnInit(): void {
    this.tickClock();
    this.clockTimer = setInterval(() => this.tickClock(), 1000);
    this.slideTimer = setInterval(() => this.nextSlide(), 8000);
    this.refresh();
  }

  ngOnDestroy(): void {
    if (this.clockTimer) clearInterval(this.clockTimer);
    if (this.slideTimer) clearInterval(this.slideTimer);
  }

  statValue(key: StatCard['valueKey'], stats: PlatformStats): number {
    if (key === 'openCampaigns') return this.openCampaigns();
    return stats[key];
  }

  refreshToday(): void {
    this.todayService.getToday().subscribe(d => {
      if (!d.nextPrayer && d.prayerTimes) {
        d.nextPrayer = resolveNextPrayer(d.prayerTimes);
      }
      this.today.set(d);
      this.tickCountdown();
    });
  }

  refresh(): void {
    this.loading.set(true);
    forkJoin({
      stats: this.platform.getStats(),
      claims: this.platform.getPendingClaims(),
      logs: this.platform.getAuditLogs(8),
      users: this.platform.getUsers(),
      mosques: this.admin.getAllMosques(),
      today: this.todayService.getToday(),
    }).pipe(
      switchMap(({ stats, claims, logs, users, mosques, today }) => {
        if (!mosques.length) {
          return of({ stats, claims, logs, users, mosques, today, openCampaigns: 0 });
        }
        return forkJoin(
          mosques.map(m =>
            this.mosqueService.getReadingCampaigns(m.id).pipe(
              map(campaigns => campaigns.filter(c => c.isActive).length),
              catchError(() => of(0))
            )
          )
        ).pipe(
          map(counts => ({
            stats,
            claims,
            logs,
            users,
            mosques,
            today,
            openCampaigns: counts.reduce((a, b) => a + b, 0),
          }))
        );
      })
    ).subscribe({
      next: ({ stats, claims, logs, users, mosques, today, openCampaigns }) => {
        if (!today.nextPrayer && today.prayerTimes) {
          today.nextPrayer = resolveNextPrayer(today.prayerTimes);
        }
        this.stats.set(stats);
        this.pendingClaims.set(claims.slice(0, 3));
        this.recentLogs.set(logs);
        this.users.set(users);
        this.mosques.set(mosques);
        this.today.set(today);
        this.openCampaigns.set(openCampaigns);
        const mosque = mosques.find(m => m.id === today.mosqueId);
        this.mosqueName.set(mosque?.name ?? 'Default mosque');
        this.tickCountdown();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goToSlide(i: number): void {
    this.slideIndex.set(i % this.slides.length);
  }

  nextSlide(): void {
    this.slideIndex.update(i => (i + 1) % this.slides.length);
  }

  prevSlide(): void {
    this.slideIndex.update(i => (i - 1 + this.slides.length) % this.slides.length);
  }

  roleBarWidth(count: number): number {
    const max = Math.max(...this.roleCounts().map(r => r.count), 1);
    return Math.round((count / max) * 100);
  }

  approveClaim(id: number): void {
    this.platform.approveClaim(id).subscribe(() => this.refresh());
  }

  rejectClaim(id: number): void {
    this.platform.rejectClaim(id).subscribe(() => this.refresh());
  }

  activityIcon(action: string): string {
    const a = action.toLowerCase();
    if (a.includes('claim')) return '✓';
    if (a.includes('prayer')) return '⏰';
    if (a.includes('role')) return '👥';
    if (a.includes('mosque') || a.includes('seed')) return '⌂';
    if (a.includes('content') || a.includes('publish')) return '📖';
    return '↺';
  }

  private tickClock(): void {
    const now = new Date();
    this.liveClock.set(
      now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    );
    this.gregorianDate.set(now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    this.hijriDate.set(formatHijriDate(now));
    this.tickCountdown();
  }

  private tickCountdown(): void {
    const jamaat = this.today()?.nextPrayer?.jamaat;
    this.countdown.set(jamaat ? countdownToJamaat(jamaat) : '00:00:00');
  }
}
