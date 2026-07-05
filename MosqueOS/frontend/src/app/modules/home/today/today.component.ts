import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TodayService } from '../../../core/services/today.service';
import { QuranService } from '../../../core/services/quran.service';
import { PlatformService, PlatformStats } from '../../../core/services/platform.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { MemberService, MemberDashboardResponse } from '../../../core/services/member.service';
import { TodayResponse, QuranCard } from '../../../core/models';
import { ROLES } from '../../../core/constants/roles';
import { navIsMember } from '../../../core/config/nav.config';
import { countdownToJamaat, formatTime12, getPrayerSlots } from '../../../core/utils/prayer.utils';
import { DashboardBadgesComponent } from '../../../shared/ui/dashboard-badges.component';

@Component({
  selector: 'app-today',
  standalone: true,
  imports: [CommonModule, RouterModule, DashboardBadgesComponent],
  templateUrl: './today.component.html',
  styles: [`
    :host { display: block; width: 100%; }

    .today-page {
      --today-surface: var(--mos-surface);
      --today-border: var(--mos-border);
      --today-gold: var(--mos-gold);
      --today-gold-soft: var(--mos-gold-soft);
      --today-text: var(--mos-text-primary);
      --today-muted: var(--mos-text-secondary);
    }

    .today-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 6rem 1rem;
      color: var(--today-muted);
    }
    .today-spinner {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 9999px;
      border: 2px solid var(--mos-gold-35);
      border-top-color: var(--today-gold);
      animation: todaySpin 0.8s linear infinite;
    }
    @keyframes todaySpin { to { transform: rotate(360deg); } }

    .today-header {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--today-border);
    }
    .today-header-grid {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    @media (min-width: 1024px) {
      .today-header-grid {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }
    .today-header-badges {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .today-header-badges app-dashboard-badges { display: contents; }
    .today-friday-chip {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      color: var(--mos-gold-deep);
      border: 1px solid rgba(212, 175, 55, 0.35);
      background: var(--today-gold-soft);
    }
    .today-title {
      font-family: ui-serif, Georgia, serif;
      font-size: clamp(1.875rem, 4vw, 2.75rem);
      font-weight: 700;
      color: var(--today-text);
      line-height: 1.15;
      margin: 0;
    }
    .today-subtitle {
      margin: 0.5rem 0 0;
      color: var(--today-muted);
      font-size: 1rem;
    }
    .today-quick-nav { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .today-quick-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      border-radius: var(--mos-radius-btn);
      border: 1px solid var(--today-border);
      background: var(--today-surface);
      color: var(--mos-primary);
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      box-shadow: var(--mos-shadow-card);
      transition: all 0.2s ease;
    }
    .today-quick-link svg { width: 1rem; height: 1rem; opacity: 0.85; }
    .today-quick-link:hover {
      border-color: rgba(15, 76, 58, 0.25);
      background: var(--mos-mint-bg);
      color: var(--mos-primary-deep);
    }
    .today-quick-link--gold {
      color: var(--mos-gold-deep);
      border-color: rgba(212, 175, 55, 0.35);
      background: var(--today-gold-soft);
    }

    .today-alert {
      margin-bottom: 1.5rem;
      padding: 0.875rem 1rem;
      border-radius: 0.75rem;
      background: var(--mos-badge-rejected-bg);
      border: 1px solid rgba(220, 38, 38, 0.2);
      color: var(--mos-badge-rejected-text);
      font-size: 0.9375rem;
    }

    .today-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 1280px) {
      .today-layout { grid-template-columns: minmax(280px, 340px) 1fr; gap: 2rem; }
    }
    .today-prayer-col { display: flex; flex-direction: column; gap: 1.25rem; }
    .today-main-col { display: flex; flex-direction: column; gap: 2rem; }

    .today-panel {
      background: var(--today-surface);
      border: 1px solid var(--today-border);
      border-radius: var(--mos-radius-card);
      padding: 1.25rem 1.375rem;
      box-shadow: var(--mos-shadow-card);
      color: var(--today-text);
    }
    .today-panel--admin {
      margin-bottom: 2rem;
      padding: 1.375rem 1.5rem;
      border-color: rgba(15, 76, 58, 0.18);
      background: linear-gradient(180deg, var(--mos-mint-bg) 0%, var(--today-surface) 100%);
    }
    .today-panel--lift {
      transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
    }
    .today-panel--lift:hover {
      transform: translateY(-2px);
      border-color: rgba(212, 175, 55, 0.35);
      box-shadow: var(--mos-shadow-card-hover);
    }
    .today-panel--dua {
      border-color: rgba(212, 175, 55, 0.28);
      background: linear-gradient(145deg, var(--mos-cream-soft) 0%, var(--today-surface) 100%);
    }
    .today-panel--event {
      background: linear-gradient(135deg, var(--mos-mint-bg) 0%, var(--today-surface) 100%);
      border-color: rgba(15, 76, 58, 0.15);
    }
    .today-panel--empty {
      text-align: center;
      color: var(--today-muted);
      font-size: 0.9375rem;
      border-style: dashed;
      background: var(--mos-bg);
    }
    .today-panel--participate { margin-top: 1rem; }
    .today-panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.125rem;
    }
    .today-panel-head .today-btn-gold { width: 100%; }
    @media (min-width: 640px) {
      .today-panel-head .today-btn-gold { width: auto; }
    }
    .today-panel-head--compact { margin-bottom: 0.875rem; }
    .today-panel-title {
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--today-text);
      margin: 0;
    }
    .today-panel-title--sm { font-size: 0.9375rem; }
    .today-panel-desc {
      margin: 0.25rem 0 0;
      font-size: 0.8125rem;
      color: var(--today-muted);
    }

    .today-stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    @media (min-width: 1024px) {
      .today-stats-grid { grid-template-columns: repeat(4, 1fr); gap: 1rem; }
    }
    .today-stat {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      padding: 0.875rem;
      border-radius: var(--mos-radius-card);
      border: 1px solid var(--today-border);
      background: var(--today-surface);
      box-shadow: var(--mos-shadow-card);
      transition: border-color 0.2s, transform 0.2s;
      min-width: 0;
      text-decoration: none;
      color: inherit;
    }
    @media (min-width: 640px) {
      .today-stat { gap: 0.875rem; padding: 1rem; }
    }
    .today-stat:hover {
      border-color: rgba(15, 76, 58, 0.22);
      transform: translateY(-1px);
      box-shadow: var(--mos-shadow-card-hover);
    }
    .today-stat--warn .today-stat-num { color: var(--mos-warning); }
    .today-stat-icon-wrap {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.625rem;
      background: var(--today-gold-soft);
      border: 1px solid rgba(212, 175, 55, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--mos-gold-deep);
    }
    .today-stat-icon-wrap svg { width: 1.125rem; height: 1.125rem; }
    .today-stat-label {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--today-muted);
      margin: 0;
    }
    .today-stat-num {
      font-size: 1.625rem;
      font-weight: 800;
      color: var(--today-text);
      line-height: 1.2;
      margin: 0.125rem 0 0;
    }
    .today-stat-num--sm { font-size: 1.125rem; font-weight: 700; color: var(--mos-primary); }
    .today-stat-hint {
      font-size: 0.6875rem;
      color: var(--today-muted);
      margin: 0.125rem 0 0;
    }

    .today-hero {
      position: relative;
      overflow: hidden;
      border-radius: var(--mos-radius-card);
      padding: 1.75rem 1.5rem;
      text-align: center;
      border: 1px solid rgba(15, 76, 58, 0.2);
      background: linear-gradient(155deg, var(--mos-prayer-card-from) 0%, var(--mos-prayer-card-to) 100%);
      box-shadow: var(--mos-shadow-card);
      color: var(--mos-text-inverse);
    }
    .today-hero-glow {
      position: absolute;
      top: -40%;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      height: 80%;
      background: radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .today-hero-label {
      position: relative;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--mos-on-hero-muted);
      margin: 0 0 0.5rem;
    }
    .today-hero-prayer {
      position: relative;
      font-family: ui-serif, Georgia, serif;
      font-size: clamp(2rem, 5vw, 2.75rem);
      font-weight: 700;
      color: #fff;
      margin: 0;
      line-height: 1.1;
    }
    .today-hero-countdown {
      position: relative;
      font-family: ui-monospace, monospace;
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      font-weight: 700;
      color: var(--mos-gold-bright);
      margin: 0.75rem 0 1.25rem;
      letter-spacing: 0.02em;
    }
    .today-hero-jamaat {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.875rem 1rem;
      border-radius: 0.75rem;
      background: rgba(8, 54, 42, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .today-hero-jamaat-label {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--mos-on-hero-muted);
    }
    .today-hero-jamaat-time {
      font-size: 1.375rem;
      font-weight: 700;
      color: #fff;
    }

    .today-prayer-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .today-prayer-list li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.625rem 0.75rem;
      border-radius: 0.5rem;
      background: var(--mos-bg);
      border: 1px solid transparent;
      font-size: 0.875rem;
    }
    .today-prayer-list li span:first-child {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mos-primary);
    }
    .today-prayer-list li span:last-child {
      font-family: ui-monospace, monospace;
      font-weight: 700;
      color: var(--today-text);
    }
    .today-prayer-item--active {
      border-color: rgba(212, 175, 55, 0.45) !important;
      background: var(--mos-mint-bg) !important;
    }
    .today-prayer-item--active span:first-child { color: var(--mos-gold-deep) !important; }

    .today-section-head {
      margin-bottom: 1.125rem;
      padding-left: 0.875rem;
      border-left: 3px solid var(--today-gold);
    }
    .today-section-title {
      font-family: ui-serif, Georgia, serif;
      font-size: 1.375rem;
      font-weight: 700;
      color: var(--today-text);
      margin: 0;
    }
    .today-section-desc {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: var(--today-muted);
    }
    .today-cards-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    @media (min-width: 768px) {
      .today-cards-grid { grid-template-columns: repeat(2, 1fr); }
      .today-span-2 { grid-column: span 2; }
    }

    .today-card-heading {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--today-text);
      margin: 0.625rem 0 0.5rem;
    }
    .today-card-text {
      font-size: 0.875rem;
      line-height: 1.55;
      color: var(--today-muted);
      margin: 0 0 1rem;
    }
    .today-strong { color: var(--mos-primary); font-weight: 800; }
    .today-label {
      display: inline-block;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
    }
    .today-label--gold {
      background: var(--today-gold-soft);
      color: var(--mos-gold-deep);
      border: 1px solid rgba(212, 175, 55, 0.3);
    }
    .today-label--gold-solid {
      background: var(--mos-gold-gradient);
      color: var(--mos-primary-deep);
    }
    .today-label--muted {
      background: var(--mos-primary-08);
      color: var(--mos-primary);
      border: 1px solid var(--mos-primary-18);
    }

    .today-dua-arabic {
      font-family: ui-serif, Georgia, 'Traditional Arabic', serif;
      font-size: clamp(1.375rem, 3vw, 1.875rem);
      line-height: 1.7;
      color: var(--mos-primary-deep);
      text-align: right;
      margin: 0.75rem 0;
    }
    .today-dua-trans {
      font-size: 0.9375rem;
      font-style: italic;
      color: var(--today-muted);
      margin: 0 0 0.75rem;
      line-height: 1.55;
    }

    .today-progress-wrap { margin-bottom: 1rem; }
    .today-progress-bar {
      height: 0.375rem;
      border-radius: 9999px;
      background: var(--mos-border);
      overflow: hidden;
    }
    .today-progress-fill {
      height: 100%;
      border-radius: 9999px;
      background: var(--mos-gold-gradient);
      transition: width 0.5s ease;
    }
    .today-progress-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: var(--today-muted);
    }

    .today-event-row,
    .today-participate-row {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    @media (min-width: 640px) {
      .today-event-row,
      .today-participate-row {
        flex-direction: row;
        align-items: center;
      }
    }
    .today-participate-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 0.875rem;
      background: var(--today-gold-soft);
      border: 1px solid rgba(212, 175, 55, 0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--mos-gold-deep);
      flex-shrink: 0;
    }
    .today-participate-icon svg { width: 1.375rem; height: 1.375rem; }
    .today-participate-body { flex: 1; min-width: 0; }

    .today-announce-list {
      list-style: none;
      margin: 0 0 1rem;
      padding: 0;
    }
    .today-announce-list li {
      display: flex;
      gap: 0.875rem;
      padding: 0.875rem 0;
      border-bottom: 1px solid var(--today-border);
    }
    .today-announce-list li:last-child { border-bottom: none; padding-bottom: 0; }
    .today-announce-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 9999px;
      background: var(--mos-success);
      margin-top: 0.5rem;
      flex-shrink: 0;
    }
    .today-announce-item--featured .today-announce-dot {
      background: var(--today-gold);
      box-shadow: 0 0 0 3px var(--today-gold-soft);
    }
    .today-announce-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }
    .today-announce-head h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--today-text);
    }
    .today-announce-list li p {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--today-muted);
    }

    .today-btn-gold {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.625rem 1.125rem;
      border-radius: var(--mos-radius-btn);
      background: var(--mos-gold-gradient);
      color: var(--mos-primary-deep);
      font-size: 0.875rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      box-shadow: var(--mos-gold-shadow);
      transition: filter 0.2s, transform 0.2s, box-shadow 0.2s;
    }
    .today-btn-gold:hover {
      filter: brightness(1.03);
      transform: translateY(-1px);
      box-shadow: var(--mos-gold-shadow-hover);
    }
    .today-btn-gold--block { width: 100%; }
    .today-btn-ghost {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 1rem;
      border-radius: var(--mos-radius-btn);
      border: 1px solid var(--today-border);
      background: var(--today-surface);
      color: var(--mos-primary);
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      transition: border-color 0.2s, color 0.2s, background 0.2s;
    }
    .today-btn-ghost:hover {
      border-color: rgba(15, 76, 58, 0.25);
      background: var(--mos-mint-bg);
      color: var(--mos-primary-deep);
    }
    .today-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--mos-primary);
      text-decoration: none;
      transition: color 0.2s;
    }
    .today-link:hover { color: var(--mos-primary-hover); text-decoration: underline; }
    .today-link::after { content: '→'; }
    .today-error { margin-top: 2rem; padding: 2rem; }
    .today-error p { margin: 0 0 1rem; color: var(--mos-badge-rejected-text); }
  `]
})
export class TodayComponent implements OnInit, OnDestroy {
  private todayService = inject(TodayService);
  private quranService = inject(QuranService);
  private platform = inject(PlatformService);
  private mosqueContext = inject(MosqueContextService);
  private memberService = inject(MemberService);
  authService = inject(AuthService);

  data = signal<TodayResponse | null>(null);
  memberDash = signal<MemberDashboardResponse | null>(null);
  platformStats = signal<PlatformStats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  countdown = signal('00:00:00');
  formatTime = formatTime12;

  isSuperAdmin = computed(() => this.authService.roles().includes(ROLES.SuperAdmin));
  isMember = computed(() =>
    this.authService.isAuthenticated() && navIsMember(this.authService.roles()));
  mosqueName = computed(() =>
    this.memberDash()?.mosqueName ?? this.mosqueContext.mosque()?.name ?? null);
  private timer?: ReturnType<typeof setInterval>;
  private lastLoadKey = '';

  ngOnInit(): void {
    this.timer = setInterval(() => this.tickCountdown(), 1000);
    this.waitForAuthAndLoad();
  }

  private waitForAuthAndLoad(): void {
    if (!this.authService.loading()) {
      this.load();
      return;
    }
    const poll = setInterval(() => {
      if (!this.authService.loading()) {
        clearInterval(poll);
        this.load();
      }
    }, 50);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  prayerSlots(): { name: string; jamaatFmt: string; active: boolean }[] {
    const d = this.data();
    if (!d?.prayerTimes) return [];
    const activeName = d.nextPrayer?.name.replace(' (tomorrow)', '') ?? '';
    return getPrayerSlots(d.prayerTimes).map(p => ({
      name: p.name,
      jamaatFmt: formatTime12(p.jamaat),
      active: p.name === activeName,
    }));
  }

  quranProgress(card: QuranCard): number {
    if (!card.totalParas) return 0;
    return Math.min(100, (card.completedParas / card.totalParas) * 100);
  }

  retry(): void {
    this.lastLoadKey = '';
    this.loading.set(true);
    this.error.set(null);
    this.load();
  }

  private load(): void {
    const loadKey = `${this.authService.roles().join('|')}:${this.authService.user()?.homeMosqueId ?? ''}`;
    if (loadKey === this.lastLoadKey && this.data()) return;
    this.lastLoadKey = loadKey;

    this.loading.set(true);
    this.error.set(null);

    this.mosqueContext.resolve().then(mosqueId => {
      this.todayService.getToday(mosqueId).subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
          this.tickCountdown();
        },
        error: () => {
          this.error.set('Could not load today data. Please try again.');
          this.loading.set(false);
        }
      });

      if (this.isMember()) {
        this.memberService.getDashboard(mosqueId).subscribe({
          next: dash => this.memberDash.set(dash),
          error: () => { /* optional */ }
        });
      }

      if (this.isSuperAdmin()) {
        this.platform.getStats().subscribe({
          next: s => this.platformStats.set(s),
          error: () => { /* optional */ }
        });
      }
    }).catch(() => {
      this.error.set('Could not resolve your mosque. Please try again.');
      this.loading.set(false);
    });
  }

  private tickCountdown(): void {
    const d = this.data();
    if (d?.nextPrayer?.jamaat) {
      this.countdown.set(countdownToJamaat(d.nextPrayer.jamaat));
    }
  }

  startQuran(): void {
    this.quranService.startPlan().subscribe(() => this.load());
  }

  markQuranDone(para: number): void {
    this.quranService.completePara(para).subscribe(() => this.load());
  }
}
