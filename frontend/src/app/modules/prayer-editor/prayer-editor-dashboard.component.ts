import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PrayerEditorService, PrayerEditorDashboard } from '../../core/services/prayer-editor.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { NextPrayer, PrayerTimesDaily } from '../../core/models';
import {
  countdownToJamaat,
  formatTime12,
  resolveNextPrayer,
  DEFAULT_PRAYER_TIMEZONE,
} from '../../core/utils/prayer.utils';

@Component({
  selector: 'app-prayer-editor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="ped">
      <header class="ped-top">
        <div class="ped-top__left">
          <p class="ped-label">Prayer Times Editor</p>
          <h1 class="ped-title">Dashboard</h1>
        </div>
        <div class="ped-top__right">
          <div class="ped-meta">
            <p class="ped-meta__date">{{ todayLabel }}</p>
            <p class="ped-meta__mosque">{{ mosqueName() }}</p>
          </div>
          <div class="ped-avatar" [attr.title]="userName()" [attr.aria-label]="userName()">
            {{ userInitials() }}
          </div>
        </div>
      </header>

      <section class="ped-next" *ngIf="nextPrayer() as np" aria-live="polite" aria-atomic="true">
        <div class="ped-next__left">
          <p class="ped-next__label">Next prayer</p>
          <h2 class="ped-next__name">{{ np.name }}</h2>
          <p class="ped-next__meta">
            Jamaat {{ formatClock(np.jamaat) }}
            <span *ngIf="np.start"> · Start {{ formatClock(np.start) }}</span>
            <span class="ped-next__tz"> · {{ timezoneLabel() }}</span>
          </p>
        </div>
        <div class="ped-next__right">
          <p class="ped-next__count-label">Countdown</p>
          <p class="ped-next__count">{{ countdown() || '—' }}</p>
        </div>
      </section>

      <section class="ped-next ped-next--empty" *ngIf="!nextPrayer() && !loadingTimes()">
        <div>
          <p class="ped-next__label">Next prayer</p>
          <h2 class="ped-next__name">No timetable yet</h2>
          <p class="ped-next__meta">Add today's times to enable the live countdown.</p>
        </div>
        <a routerLink="/dashboard/prayer-editor/daily" class="ped-btn">Edit Schedule</a>
      </section>

      <section class="ped-kpis" *ngIf="summary() as s" aria-label="Summary">
        <article class="ped-kpi">
          <p class="ped-kpi__label">Today's Prayers</p>
          <p class="ped-kpi__value">{{ times() ? '5 prayers' : '—' }}</p>
          <p class="ped-kpi__hint">{{ s.today | date:'mediumDate' }}</p>
        </article>
        <article class="ped-kpi">
          <p class="ped-kpi__label">Next Prayer</p>
          <p class="ped-kpi__value ped-kpi__value--sm">{{ nextPrayer()?.name || '—' }}</p>
          <p class="ped-kpi__hint ped-kpi__hint--live" *ngIf="countdown()">{{ countdown() }}</p>
          <p class="ped-kpi__hint" *ngIf="!countdown()">No live countdown</p>
        </article>
        <article class="ped-kpi">
          <p class="ped-kpi__label">Last Updated</p>
          <p class="ped-kpi__value ped-kpi__value--sm">{{ lastUpdatedLabel() }}</p>
          <p class="ped-kpi__hint">Published timetable</p>
        </article>
        <article class="ped-kpi">
          <p class="ped-kpi__label">Status</p>
          <p class="ped-kpi__value ped-kpi__value--sm">
            <span class="ped-status" [class.ped-status--ok]="(s.todayStatus || '') === 'Published'"
              [class.ped-status--draft]="(s.todayStatus || '') === 'Draft'">
              {{ s.todayStatus || 'No data' }}
            </span>
          </p>
          <p class="ped-kpi__hint">{{ s.publishedDays }} published · {{ s.draftDays }} draft</p>
        </article>
      </section>

      <section class="ped-card ped-timetable" aria-labelledby="ped-tt-title">
        <div class="ped-card__head">
          <div>
            <h2 id="ped-tt-title" class="ped-card__title">Today's Timetable</h2>
            <p class="ped-card__sub">Manage today's prayer schedule · next prayer highlighted</p>
          </div>
          <a routerLink="/dashboard/prayer-editor/daily" class="ped-btn">Edit Schedule</a>
        </div>

        <div *ngIf="!times()" class="ped-empty">
          No prayer times for today. Use Edit Schedule to add them.
      </div>

        <div *ngIf="times() as t" class="ped-table-wrap">
          <div class="ped-table-head" aria-hidden="true">
            <span>Prayer</span>
            <span>Start Time</span>
            <span>Jamaat Time</span>
            <span>Status</span>
          </div>
          <div
            class="ped-row"
            *ngFor="let p of prayers"
            [class.ped-row--next]="isNextPrayer(p.label)">
            <div class="ped-row__prayer">
              <span class="ped-icon" [attr.data-prayer]="p.key" aria-hidden="true">{{ p.icon }}</span>
              <span class="ped-row__name">
                {{ p.label }}
                <span *ngIf="isNextPrayer(p.label)" class="ped-row__next-tag">Next</span>
              </span>
            </div>
            <span class="ped-row__time">{{ formatClock(t[p.start]) }}</span>
            <span class="ped-row__jamaat">
              {{ formatClock(t[p.jamaat]) }}
              <span *ngIf="isNextPrayer(p.label) && countdown()" class="ped-row__cd">{{ countdown() }}</span>
            </span>
            <span class="ped-row__status">
              <span class="ped-pill" [class.ped-pill--ok]="rowStatus() === 'Published'"
                [class.ped-pill--draft]="rowStatus() === 'Draft'">
                {{ rowStatus() }}
              </span>
            </span>
        </div>
        </div>
      </section>

      <section class="ped-actions" aria-label="Quick actions">
        <a routerLink="/dashboard/prayer-editor/daily" class="ped-action">
          <span class="ped-action__icon" aria-hidden="true">⏰</span>
          <span class="ped-action__title">Edit Daily</span>
          <span class="ped-action__desc">Start &amp; jamaat times</span>
        </a>
        <a routerLink="/dashboard/prayer-editor/jumuah" class="ped-action">
          <span class="ped-action__icon" aria-hidden="true">🕌</span>
          <span class="ped-action__title">Jumuah</span>
          <span class="ped-action__desc">Friday prayer slots</span>
        </a>
        <a routerLink="/dashboard/prayer-editor/ramadan" class="ped-action">
          <span class="ped-action__icon" aria-hidden="true">🌙</span>
          <span class="ped-action__title">Ramadan</span>
          <span class="ped-action__desc">Suhoor &amp; iftar</span>
        </a>
        <a routerLink="/dashboard/prayer-editor/audit" class="ped-action">
          <span class="ped-action__icon" aria-hidden="true">📋</span>
          <span class="ped-action__title">Audit Log</span>
          <span class="ped-action__desc">Change history</span>
        </a>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
    }

    .ped {
      --ped-bg: #F8FAFC;
      --ped-card: #ffffff;
      --ped-ink: #0f172a;
      --ped-muted: #64748b;
      --ped-border: #e2e8f0;
      --ped-primary: #0f4c3a;
      --ped-radius: 16px;
      --ped-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 0.25rem 0 2rem;
      color: var(--ped-ink);
      background: transparent;
    }

    .ped-top {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.25rem;
    }

    .ped-label {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ped-primary);
    }

    .ped-title {
      margin: 0.35rem 0 0;
      font-size: clamp(1.75rem, 3vw, 2.15rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--ped-ink);
      line-height: 1.15;
    }

    .ped-top__right {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .ped-meta {
      text-align: right;
    }

    .ped-meta__date {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--ped-ink);
    }

    .ped-meta__mosque {
      margin: 0.15rem 0 0;
      font-size: 0.75rem;
      color: var(--ped-muted);
      max-width: 14rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ped-avatar {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: linear-gradient(145deg, #0f4c3a, #08362a);
      color: #e6d28a;
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(15, 76, 58, 0.25);
    }

    .ped-next {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1.25rem;
      padding: 1.25rem 1.35rem;
      border-radius: var(--ped-radius);
      border: 1px solid rgba(15, 76, 58, 0.22);
      background:
        linear-gradient(135deg, rgba(15, 76, 58, 0.08), rgba(15, 76, 58, 0.02)),
        #fff;
      box-shadow: var(--ped-shadow);
    }

    .ped-next--empty {
      border-style: dashed;
      background: #fff;
    }

    .ped-next__label {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ped-primary);
    }

    .ped-next__name {
      margin: 0.35rem 0 0;
      font-size: clamp(1.35rem, 2.5vw, 1.75rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--ped-ink);
      line-height: 1.15;
    }

    .ped-next__meta {
      margin: 0.35rem 0 0;
      font-size: 0.875rem;
      color: var(--ped-muted);
    }

    .ped-next__tz {
      font-weight: 600;
    }

    .ped-next__right {
      text-align: right;
      min-width: 9rem;
    }

    .ped-next__count-label {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ped-muted);
    }

    .ped-next__count {
      margin: 0.3rem 0 0;
      font-family: ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', monospace;
      font-size: clamp(1.65rem, 3vw, 2.15rem);
      font-weight: 800;
      letter-spacing: 0.04em;
      color: var(--ped-primary);
      font-variant-numeric: tabular-nums;
      line-height: 1.1;
    }

    .ped-kpis {
      display: grid;
      gap: 0.85rem;
      grid-template-columns: 1fr;
    }

    @media (min-width: 640px) {
      .ped-kpis { grid-template-columns: repeat(2, 1fr); }
    }

    @media (min-width: 1024px) {
      .ped-kpis { grid-template-columns: repeat(4, 1fr); }
    }

    .ped-kpi {
      background: var(--ped-card);
      border: 1px solid var(--ped-border);
      border-radius: var(--ped-radius);
      box-shadow: var(--ped-shadow);
      padding: 1.1rem 1.15rem;
      min-height: 6.5rem;
    }

    .ped-kpi__label {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ped-muted);
    }

    .ped-kpi__value {
      margin: 0.45rem 0 0;
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--ped-ink);
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .ped-kpi__value--sm { font-size: 1.05rem; }

    .ped-kpi__hint {
      margin: 0.35rem 0 0;
      font-size: 0.75rem;
      color: var(--ped-muted);
    }

    .ped-kpi__hint--live {
      font-family: ui-monospace, monospace;
      font-weight: 700;
      color: var(--ped-primary);
      font-variant-numeric: tabular-nums;
    }

    .ped-status {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 800;
      background: #f1f5f9;
      color: #475569;
    }

    .ped-status--ok {
      background: rgba(22, 101, 52, 0.1);
      color: #166534;
    }

    .ped-status--draft {
      background: rgba(180, 83, 9, 0.12);
      color: #92400e;
    }

    .ped-card {
      background: var(--ped-card);
      border: 1px solid var(--ped-border);
      border-radius: var(--ped-radius);
      box-shadow: var(--ped-shadow);
      padding: 1.25rem 1.25rem 1.35rem;
    }

    .ped-card__head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.85rem;
      margin-bottom: 1.15rem;
    }

    .ped-card__title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--ped-ink);
      letter-spacing: -0.02em;
    }

    .ped-card__sub {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: var(--ped-muted);
    }

    .ped-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.6rem 1.1rem;
      border-radius: 999px;
      background: var(--ped-primary);
      color: #fff;
      font-size: 0.8125rem;
      font-weight: 700;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: background 0.18s ease, transform 0.18s ease;
      white-space: nowrap;
    }

    .ped-btn:hover {
      background: #0a3d2e;
      transform: translateY(-1px);
    }

    .ped-empty {
      padding: 1.5rem 0.25rem;
      color: var(--ped-muted);
      font-size: 0.9rem;
    }

    .ped-table-head {
      display: none;
      grid-template-columns: 1.4fr 1fr 1fr 0.9fr;
      gap: 0.75rem;
      padding: 0 1rem 0.55rem;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ped-muted);
    }

    @media (min-width: 720px) {
      .ped-table-head { display: grid; }
    }

    .ped-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.45rem;
      padding: 0.9rem 1rem;
      margin-bottom: 0.55rem;
      border-radius: 14px;
      border: 1px solid var(--ped-border);
      background: #fff;
      transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    }

    .ped-row:hover {
      background: #f8fafc;
      border-color: rgba(15, 76, 58, 0.2);
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
    }

    .ped-row--next {
      background: rgba(15, 76, 58, 0.05);
      border-color: rgba(15, 76, 58, 0.35);
      box-shadow: 0 0 0 1px rgba(15, 76, 58, 0.08);
    }

    .ped-row--next:hover {
      background: rgba(15, 76, 58, 0.07);
      border-color: rgba(15, 76, 58, 0.4);
    }

    @media (min-width: 720px) {
      .ped-row {
        grid-template-columns: 1.4fr 1fr 1fr 0.9fr;
        align-items: center;
        gap: 0.75rem;
      }
    }

    .ped-row__prayer {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .ped-icon {
      width: 2.15rem;
      height: 2.15rem;
      border-radius: 10px;
      display: grid;
      place-items: center;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .ped-icon[data-prayer='fajr'] { background: #e0f2fe; }
    .ped-icon[data-prayer='dhuhr'] { background: #fef3c7; }
    .ped-icon[data-prayer='asr'] { background: #ffedd5; }
    .ped-icon[data-prayer='maghrib'] { background: #fce7f3; }
    .ped-icon[data-prayer='isha'] { background: #ede9fe; }

    .ped-row__name {
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--ped-ink);
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      flex-wrap: wrap;
    }

    .ped-row__next-tag {
      display: inline-flex;
      padding: 0.12rem 0.45rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: var(--ped-primary);
      color: #fff;
    }

    .ped-row__time,
    .ped-row__jamaat {
      font-variant-numeric: tabular-nums;
      font-size: 0.9rem;
      color: #334155;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .ped-row__jamaat { font-weight: 700; color: var(--ped-primary); }

    .ped-row__cd {
      font-family: ui-monospace, monospace;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--ped-muted);
      letter-spacing: 0.02em;
    }

    .ped-pill {
      display: inline-flex;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: #f1f5f9;
      color: #475569;
    }

    .ped-pill--ok {
      background: rgba(22, 101, 52, 0.1);
      color: #166534;
    }

    .ped-pill--draft {
      background: rgba(180, 83, 9, 0.12);
      color: #92400e;
    }

    .ped-actions {
      display: grid;
      gap: 0.85rem;
      grid-template-columns: 1fr;
    }

    @media (min-width: 640px) {
      .ped-actions { grid-template-columns: repeat(2, 1fr); }
    }

    @media (min-width: 1024px) {
      .ped-actions { grid-template-columns: repeat(4, 1fr); }
    }

    .ped-action {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 1.15rem 1.1rem;
      border-radius: var(--ped-radius);
      border: 1px solid var(--ped-border);
      background: var(--ped-card);
      box-shadow: var(--ped-shadow);
      text-decoration: none;
      color: inherit;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }

    .ped-action:hover {
      transform: translateY(-2px);
      border-color: rgba(15, 76, 58, 0.22);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
    }

    .ped-action__icon {
      font-size: 1.25rem;
      margin-bottom: 0.35rem;
    }

    .ped-action__title {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--ped-ink);
    }

    .ped-action__desc {
      font-size: 0.78rem;
      color: var(--ped-muted);
    }
  `],
})
export class PrayerEditorDashboardComponent implements OnInit, OnDestroy {
  private editor = inject(PrayerEditorService);
  private mosqueCtx = inject(MosqueContextService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  summary = signal<PrayerEditorDashboard | null>(null);
  times = signal<PrayerTimesDaily | null>(null);
  nextPrayer = signal<NextPrayer | null>(null);
  countdown = signal('');
  loadingTimes = signal(true);
  private mosqueId = 1;
  private timer?: ReturnType<typeof setInterval>;

  todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: DEFAULT_PRAYER_TIMEZONE,
  });

  prayers = [
    { key: 'fajr', label: 'Fajr', icon: '🌅', start: 'fajrStart' as const, jamaat: 'fajrJamaat' as const },
    { key: 'dhuhr', label: 'Dhuhr', icon: '☀️', start: 'dhuhrStart' as const, jamaat: 'dhuhrJamaat' as const },
    { key: 'asr', label: 'Asr', icon: '🌤', start: 'asrStart' as const, jamaat: 'asrJamaat' as const },
    { key: 'maghrib', label: 'Maghrib', icon: '🌇', start: 'maghribStart' as const, jamaat: 'maghribJamaat' as const },
    { key: 'isha', label: 'Isha', icon: '🌙', start: 'ishaStart' as const, jamaat: 'ishaJamaat' as const },
  ];

  mosqueName = computed(() =>
    this.summary()?.mosqueName
    || this.mosqueCtx.mosque()?.name
    || 'Your mosque');

  timezoneLabel = computed(() =>
    this.mosqueCtx.mosque()?.timezone || DEFAULT_PRAYER_TIMEZONE);

  userName = computed(() => {
    const u = this.auth.user();
    return u?.fullName?.trim() || u?.userName || 'Editor';
  });

  userInitials = computed(() => {
    const name = this.userName();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  ngOnInit(): void {
    const loadData = (id: number) => {
      this.mosqueId = id;
      this.editor.getDashboard(id).subscribe(s => this.summary.set(s));
      // includeDraft so editors still get countdown for draft days
      this.editor.getDaily(id).subscribe({
        next: r => {
          this.times.set(r.times ?? null);
          this.loadingTimes.set(false);
          this.tickCountdown();
        },
        error: () => {
          this.times.set(null);
          this.loadingTimes.set(false);
          this.tickCountdown();
        },
      });
    };

    const qId = parseInt(this.route.snapshot.queryParamMap.get('mosqueId') || '', 10);
    if (!isNaN(qId) && qId > 0) {
      loadData(qId);
    } else {
      this.mosqueCtx.resolve().then(loadData);
    }
    this.timer = setInterval(() => this.tickCountdown(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  formatClock(value?: string | null): string {
    if (!value?.trim()) return '—';
    return formatTime12(value);
  }

  rowStatus(): string {
    return this.summary()?.todayStatus
      || this.times()?.status
      || '—';
  }

  isNextPrayer(label: string): boolean {
    const name = this.nextPrayer()?.name?.replace(' (tomorrow)', '') ?? '';
    return !!name && name === label;
  }

  lastUpdatedLabel(): string {
    const t = this.times();
    const raw = t?.publishedAt;
    if (!raw) return '—';
    try {
      return new Date(raw).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: this.timezoneLabel(),
      });
    } catch {
      return '—';
    }
  }

  private tickCountdown(): void {
    const t = this.times();
    if (!t) {
      this.nextPrayer.set(null);
      this.countdown.set('');
      return;
    }
    const tz = this.timezoneLabel();
    const next = resolveNextPrayer(t, tz);
    this.nextPrayer.set(next);
    this.countdown.set(countdownToJamaat(next.jamaat, tz));
  }
}
