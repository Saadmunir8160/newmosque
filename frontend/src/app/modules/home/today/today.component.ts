import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TodayService } from '../../../core/services/today.service';
import { QuranService } from '../../../core/services/quran.service';
import { PlatformService, PlatformStats } from '../../../core/services/platform.service';
import { TodayResponse, QuranCard } from '../../../core/models';
import { ROLES } from '../../../core/constants/roles';
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
      --today-bg: #022c22;
      --today-surface: rgba(6, 78, 59, 0.35);
      --today-border: rgba(16, 185, 129, 0.18);
      --today-gold: #f59e0b;
      --today-gold-soft: rgba(245, 158, 11, 0.12);
      --today-text: #ecfdf5;
      --today-muted: #a7f3d0;
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
      border: 2px solid rgba(245, 158, 11, 0.25);
      border-top-color: var(--today-gold);
      animation: todaySpin 0.8s linear infinite;
    }
    @keyframes todaySpin { to { transform: rotate(360deg); } }

    /* Header */
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
    .today-header-badges app-dashboard-badges {
      display: contents;
    }
    .today-friday-chip {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      color: #fcd34d;
      border: 1px solid rgba(245, 158, 11, 0.35);
      background: var(--today-gold-soft);
    }
    .today-title {
      font-family: ui-serif, Georgia, serif;
      font-size: clamp(1.875rem, 4vw, 2.75rem);
      font-weight: 700;
      color: #fff;
      line-height: 1.15;
      margin: 0;
    }
    .today-subtitle {
      margin: 0.5rem 0 0;
      color: var(--today-muted);
      font-size: 1rem;
    }
    .today-quick-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .today-quick-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      border-radius: 0.625rem;
      border: 1px solid var(--today-border);
      background: var(--today-surface);
      color: var(--today-muted);
      font-size: 0.8125rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .today-quick-link svg { width: 1rem; height: 1rem; opacity: 0.85; }
    .today-quick-link:hover {
      color: #fff;
      border-color: rgba(245, 158, 11, 0.4);
      background: rgba(6, 78, 59, 0.65);
    }
    .today-quick-link--gold {
      color: #fcd34d;
      border-color: rgba(245, 158, 11, 0.35);
      background: var(--today-gold-soft);
    }

    .today-alert {
      margin-bottom: 1.5rem;
      padding: 0.875rem 1rem;
      border-radius: 0.75rem;
      background: rgba(127, 29, 29, 0.2);
      border: 1px solid rgba(248, 113, 113, 0.25);
      color: #fecaca;
      font-size: 0.9375rem;
    }

    /* Layout */
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

    /* Panels */
    .today-panel {
      background: linear-gradient(180deg, rgba(6, 78, 59, 0.28) 0%, rgba(2, 44, 34, 0.95) 100%);
      border: 1px solid var(--today-border);
      border-radius: 1rem;
      padding: 1.25rem 1.375rem;
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset;
    }
    .today-panel--admin {
      margin-bottom: 2rem;
      padding: 1.375rem 1.5rem;
      border-color: rgba(245, 158, 11, 0.15);
      background: linear-gradient(135deg, rgba(6, 78, 59, 0.45) 0%, rgba(2, 44, 34, 0.98) 100%);
    }
    .today-panel--lift {
      transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
    }
    .today-panel--lift:hover {
      transform: translateY(-2px);
      border-color: rgba(245, 158, 11, 0.3);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
    }
    .today-panel--dua {
      border-color: rgba(245, 158, 11, 0.2);
      background: linear-gradient(145deg, rgba(6, 95, 70, 0.35) 0%, rgba(2, 44, 34, 0.98) 60%);
    }
    .today-panel--event {
      background: linear-gradient(135deg, rgba(4, 120, 87, 0.25) 0%, rgba(2, 44, 34, 0.98) 100%);
    }
    .today-panel--empty {
      text-align: center;
      color: var(--today-muted);
      font-size: 0.9375rem;
      border-style: dashed;
    }
    .today-panel--participate {
      margin-top: 1rem;
    }
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
      color: #fff;
      margin: 0;
    }
    .today-panel-title--sm { font-size: 0.9375rem; }
    .today-panel-desc {
      margin: 0.25rem 0 0;
      font-size: 0.8125rem;
      color: var(--today-muted);
      opacity: 0.9;
    }

    /* Stats */
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
      border-radius: 0.875rem;
      border: 1px solid var(--today-border);
      background: rgba(2, 44, 34, 0.6);
      transition: border-color 0.2s, transform 0.2s;
      min-width: 0;
    }
    @media (min-width: 640px) {
      .today-stat { gap: 0.875rem; padding: 1rem; }
    }
    .today-stat:hover {
      border-color: rgba(245, 158, 11, 0.35);
      transform: translateY(-1px);
    }
    .today-stat--warn .today-stat-num { color: #fbbf24; }
    .today-stat-icon-wrap {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.625rem;
      background: var(--today-gold-soft);
      border: 1px solid rgba(245, 158, 11, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #fbbf24;
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
      color: #fff;
      line-height: 1.2;
      margin: 0.125rem 0 0;
    }
    .today-stat-num--sm { font-size: 1.125rem; font-weight: 700; color: #6ee7b7; }
    .today-stat-hint {
      font-size: 0.6875rem;
      color: #6ee7b7;
      opacity: 0.85;
      margin: 0.125rem 0 0;
    }

    /* Hero prayer */
    .today-hero {
      position: relative;
      overflow: hidden;
      border-radius: 1.125rem;
      padding: 1.75rem 1.5rem;
      text-align: center;
      border: 1px solid rgba(245, 158, 11, 0.22);
      background: linear-gradient(165deg, #047857 0%, #065f46 40%, #022c22 100%);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
    }
    .today-hero-glow {
      position: absolute;
      top: -40%;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      height: 80%;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%);
      pointer-events: none;
    }
    .today-hero-label {
      position: relative;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #6ee7b7;
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
      color: var(--today-gold);
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
      background: rgba(2, 44, 34, 0.65);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .today-hero-jamaat-label {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #6ee7b7;
    }
    .today-hero-jamaat-time {
      font-size: 1.375rem;
      font-weight: 700;
      color: #fff;
    }

    /* Prayer list */
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
      background: rgba(2, 44, 34, 0.5);
      border: 1px solid transparent;
      font-size: 0.875rem;
    }
    .today-prayer-list li span:first-child {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #6ee7b7;
    }
    .today-prayer-list li span:last-child {
      font-family: ui-monospace, monospace;
      font-weight: 700;
      color: #fff;
    }
    .today-prayer-item--active {
      border-color: rgba(245, 158, 11, 0.45) !important;
      background: rgba(6, 78, 59, 0.55) !important;
    }
    .today-prayer-item--active span:first-child { color: #fbbf24 !important; }

    /* Sections */
    .today-section-head {
      margin-bottom: 1.125rem;
      padding-left: 0.875rem;
      border-left: 3px solid var(--today-gold);
    }
    .today-section-title {
      font-family: ui-serif, Georgia, serif;
      font-size: 1.375rem;
      font-weight: 700;
      color: #fff;
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

    /* Card content */
    .today-card-heading {
      font-size: 1.125rem;
      font-weight: 700;
      color: #fff;
      margin: 0.625rem 0 0.5rem;
    }
    .today-card-text {
      font-size: 0.875rem;
      line-height: 1.55;
      color: var(--today-muted);
      margin: 0 0 1rem;
    }
    .today-label {
      display: inline-block;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
    }
    .today-label--gold { background: var(--today-gold-soft); color: #fbbf24; }
    .today-label--gold-solid { background: var(--today-gold); color: #022c22; }
    .today-label--muted { background: rgba(16, 185, 129, 0.12); color: #6ee7b7; }

    .today-dua-arabic {
      font-family: ui-serif, Georgia, 'Traditional Arabic', serif;
      font-size: clamp(1.375rem, 3vw, 1.875rem);
      line-height: 1.7;
      color: #fff;
      text-align: right;
      margin: 0.75rem 0;
    }
    .today-dua-trans {
      font-size: 0.9375rem;
      font-style: italic;
      color: rgba(167, 243, 208, 0.9);
      margin: 0 0 0.75rem;
      line-height: 1.55;
    }

    .today-progress-wrap { margin-bottom: 1rem; }
    .today-progress-bar {
      height: 0.375rem;
      border-radius: 9999px;
      background: rgba(6, 78, 59, 0.8);
      overflow: hidden;
    }
    .today-progress-fill {
      height: 100%;
      border-radius: 9999px;
      background: linear-gradient(90deg, #d97706, #fbbf24);
      transition: width 0.5s ease;
    }
    .today-progress-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #6ee7b7;
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
      border: 1px solid rgba(245, 158, 11, 0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fbbf24;
      flex-shrink: 0;
    }
    .today-participate-icon svg { width: 1.375rem; height: 1.375rem; }
    .today-participate-body { flex: 1; min-width: 0; }

    /* Announcements */
    .today-announce-list {
      list-style: none;
      margin: 0 0 1rem;
      padding: 0;
    }
    .today-announce-list li {
      display: flex;
      gap: 0.875rem;
      padding: 0.875rem 0;
      border-bottom: 1px solid rgba(16, 185, 129, 0.12);
    }
    .today-announce-list li:last-child { border-bottom: none; padding-bottom: 0; }
    .today-announce-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 9999px;
      background: #10b981;
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
      color: #fff;
    }
    .today-announce-list li p {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--today-muted);
    }

    /* Buttons & links */
    .today-btn-gold {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.625rem 1.125rem;
      border-radius: 0.5rem;
      background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
      color: #022c22;
      font-size: 0.875rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);
      transition: filter 0.2s, transform 0.2s;
    }
    .today-btn-gold:hover { filter: brightness(1.05); transform: translateY(-1px); }
    .today-btn-gold--block { width: 100%; }
    .today-btn-ghost {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid var(--today-border);
      color: var(--today-muted);
      font-size: 0.8125rem;
      font-weight: 600;
      transition: border-color 0.2s, color 0.2s;
    }
    .today-btn-ghost:hover { border-color: rgba(245, 158, 11, 0.4); color: #fff; }
    .today-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #fbbf24;
      transition: color 0.2s;
    }
    .today-link:hover { color: #fde68a; }
    .today-link::after { content: '→'; }
  `]
})
export class TodayComponent implements OnInit, OnDestroy {
  private todayService = inject(TodayService);
  private quranService = inject(QuranService);
  private platform = inject(PlatformService);
  authService = inject(AuthService);

  data = signal<TodayResponse | null>(null);
  platformStats = signal<PlatformStats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  countdown = signal('00:00:00');
  formatTime = formatTime12;

  isSuperAdmin = computed(() => this.authService.roles().includes(ROLES.SuperAdmin));
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.load();
    this.timer = setInterval(() => this.tickCountdown(), 1000);
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

  private load(): void {
    this.todayService.getToday().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
        this.tickCountdown();
      },
      error: (e) => {
        this.error.set(e?.message || 'Could not load today data. Please try again.');
        this.loading.set(false);
      }
    });

    if (this.isSuperAdmin()) {
      this.platform.getStats().subscribe({
        next: s => this.platformStats.set(s),
        error: () => { /* optional */ }
      });
    }
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
