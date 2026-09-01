import { afterNextRender, Component, Injector, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError, filter, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { MosqueService } from '../../../core/services/mosque.service';
import { TodayService } from '../../../core/services/today.service';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SeoService } from '../../../core/services/seo.service';
import {
  Announcement, ClaimSubmissionDetails, JanazaAnnouncement, JumuahTime, Mosque,
  MosqueEvent, PrayerTimesDaily, TodayResponse
} from '../../../core/models';
import {
  countdownToJamaat, formatTime12, getPrayerSlots, nextJumuahCountdown,
  nowInTimezone, resolveJumuahCountdowns, resolveNextPrayer, JumuahSlotCountdown
} from '../../../core/utils/prayer.utils';
import { environment } from '../../../../environments/environment';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { MosqueStatusIndicatorComponent } from '../../../shared/ui/mosque-status-indicator.component';
import { AuthLoginModalComponent } from '../../../shared/ui/auth-login-modal.component';
import { ROLES } from '../../../core/constants/roles';
import {
  DEMO_FALLBACK_ANNOUNCEMENTS, DEMO_FALLBACK_DUA, DEMO_FALLBACK_JUMUAH,
  DEMO_FALLBACK_MOSQUE, DEMO_FALLBACK_QURAN, DEMO_FALLBACK_WIRD,
  demoFallbackEvents, demoFallbackPrayerTimes
} from './demo-fallback.data';
import { FACILITY_LABELS, isModuleFlagEnabled } from '../../../core/constants/mosque-form.constants';

const DEMO_TOUR_KEY = 'mos_demo_tour_done';
const SAVED_MOSQUES_KEY = 'mos_saved_mosques';

@Component({
  selector: 'app-demo-mosque',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HasRoleDirective, MosqueStatusIndicatorComponent, AuthLoginModalComponent],
  templateUrl: './demo-mosque.component.html',
  styles: [`
    :host {
      display: block;
      --demo-primary: var(--mos-primary);
      --demo-primary-deep: var(--mos-primary-deep);
      --demo-secondary: var(--mos-secondary);
      --demo-gold: var(--mos-gold);
      --demo-gold-soft: var(--mos-gold-soft);
      --demo-bg: var(--mos-bg);
      --demo-surface: var(--mos-surface);
      --demo-text: var(--mos-text-primary);
      --demo-muted: var(--mos-text-secondary);
      --demo-border: var(--mos-border);
      --demo-radius: var(--mos-radius-card);
      --demo-shadow: var(--mos-shadow-card);
    }

    .demo-page {
      min-height: 100dvh;
      width: 100%;
      overflow-x: hidden;
      background: var(--demo-bg);
      color: var(--demo-text);
    }

    /* Nav */
    .demo-nav {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 0.75rem;
      padding-top: max(0.75rem, env(safe-area-inset-top));
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--demo-border);
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(8px);
      position: sticky;
      top: 0;
      z-index: 30;
    }
    .demo-nav__back {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: 10px;
      border: 1px solid var(--demo-border);
      background: var(--demo-bg);
      color: var(--demo-text);
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.18s, border-color 0.18s, color 0.18s;
    }
    .demo-nav__back:hover {
      background: var(--mos-primary-06);
      border-color: var(--mos-primary-25);
      color: var(--demo-primary);
    }
    .demo-nav__title {
      flex: 1;
      min-width: 0;
      text-align: center;
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--demo-primary);
      order: 3;
      basis: 100%;
    }
    @media (min-width: 640px) {
      .demo-nav__title { order: unset; basis: auto; font-size: 1rem; }
    }
    .demo-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      flex-shrink: 0;
    }
    .demo-badge--live {
      color: var(--demo-primary-deep);
      background: var(--demo-gold-soft);
      border: 1px solid var(--mos-gold-45);
    }
    .demo-badge--pulse { animation: demoPulse 2s ease-in-out infinite; }
  @keyframes demoPulse {
      0%, 100% { box-shadow: 0 0 0 0 var(--mos-gold-35); }
      50% { box-shadow: 0 0 0 8px rgba(212, 175, 55, 0); }
    }
    .demo-badge--public {
      color: var(--demo-primary);
      background: var(--mos-primary-08);
      border: 1px solid var(--mos-primary-18);
    }
    .demo-nav__replay {
      padding: 0.25rem 0.625rem;
      border-radius: 8px;
      border: 1px solid var(--demo-border);
      background: transparent;
      color: var(--demo-muted);
      font-size: 0.6875rem;
      font-weight: 600;
      cursor: pointer;
      transition: color 0.18s, border-color 0.18s;
    }
    .demo-nav__replay:hover {
      color: var(--demo-primary);
      border-color: var(--mos-primary-25);
    }

    .demo-tour-banner-wrap { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .demo-tour-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.625rem 1rem;
      border-radius: 12px;
      background: var(--demo-gold-soft);
      border: 1px solid var(--mos-gold-35);
    }
    .demo-tour-banner p {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--mos-gold-dark);
    }
    .demo-tour-banner__skip {
      padding: 0.375rem 0.75rem;
      font-size: 0.6875rem;
      font-weight: 700;
      border-radius: 8px;
      border: 1px solid var(--demo-border);
      background: var(--demo-surface);
      color: var(--demo-text);
      cursor: pointer;
    }

    .demo-offline-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--mos-gold-dark);
      background: var(--demo-gold-soft);
      border-bottom: 1px solid var(--mos-gold-35);
    }

    /* Hero — dark emerald base so copy text stays readable (no light top-left wash) */
    .demo-hero {
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: linear-gradient(
        155deg,
        var(--mos-primary-deep) 0%,
        var(--mos-primary) 38%,
        var(--mos-secondary) 72%,
        var(--mos-hero-to) 100%
      );
    }
    .demo-hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 70% 55% at 88% 15%, rgba(212, 175, 55, 0.12) 0%, transparent 55%),
        radial-gradient(ellipse 50% 40% at 10% 90%, rgba(13, 148, 136, 0.15) 0%, transparent 50%);
      pointer-events: none;
    }
    .demo-hero__inner {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.75rem;
      padding-top: 2rem;
      padding-bottom: 2.5rem;
    }
    @media (min-width: 1024px) {
      .demo-hero__inner {
        flex-direction: row;
        align-items: flex-start;
        gap: 2.5rem;
        padding-top: 2.5rem;
        padding-bottom: 3rem;
      }
    }
    .demo-hero__copy {
      flex: 1;
      width: 100%;
      text-align: center;
    }
    @media (min-width: 1024px) { .demo-hero__copy { text-align: left; } }

    .demo-eyebrow {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--mos-gold-bright);
    }
    .demo-eyebrow--sm { margin-bottom: 0.25rem; font-size: 0.6875rem; }

    .demo-hero__title {
      margin: 0 0 1rem;
      font-family: ui-serif, Georgia, serif;
      font-size: clamp(1.5rem, 4vw, 3rem);
      font-weight: 800;
      line-height: 1.15;
      color: var(--mos-text-inverse);
      text-shadow: 0 2px 16px rgba(0, 0, 0, 0.28);
    }
    .demo-hero__accent {
      color: var(--mos-gold-bright);
      text-shadow: 0 2px 12px rgba(0, 0, 0, 0.22);
    }
    .demo-hero__desc {
      margin: 0 auto;
      font-size: 1rem;
      line-height: 1.65;
      color: rgba(255, 255, 255, 0.92);
      max-width: 36rem;
      text-shadow: 0 1px 8px rgba(0, 0, 0, 0.2);
    }
  @media (min-width: 1024px) {
    .demo-hero__desc { margin: 0; font-size: 1.125rem; }
  }

    .demo-hero__meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
      margin: 1.25rem 0 0;
    }
    @media (min-width: 1024px) { .demo-hero__meta { justify-content: flex-start; } }

    .demo-meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.95);
      background: rgba(8, 54, 42, 0.55);
      border: 1px solid var(--mos-gold-35);
      backdrop-filter: blur(6px);
    }

    .demo-today-widgets {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.625rem;
      width: 100%;
      margin-top: 0.25rem;
    }
    @media (max-width: 380px) {
      .demo-today-widgets { grid-template-columns: 1fr; }
    }
    .demo-widget {
      padding: 0.75rem 0.875rem;
      border-radius: 12px;
      background: rgba(8, 54, 42, 0.5);
      backdrop-filter: blur(8px);
      border: 1px solid var(--mos-gold-35);
      text-align: left;
    }
    .demo-widget__label {
      margin: 0 0 0.25rem;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(255, 255, 255, 0.78);
    }
    .demo-widget__value {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--mos-text-inverse);
      line-height: 1.35;
    }

    .demo-hero__cards {
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .demo-prayer-card {
      padding: 1.25rem 1.5rem;
      border-radius: var(--demo-radius);
      text-align: center;
      background: linear-gradient(145deg, var(--mos-prayer-card-from) 0%, var(--mos-prayer-card-to) 100%);
      border: 1px solid var(--mos-gold-45);
      box-shadow: 0 12px 32px rgba(8, 54, 42, 0.28);
    }
    .demo-prayer-card__label {
      margin: 0 0 0.5rem;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--mos-on-hero-muted);
    }
    .demo-prayer-card__name {
      margin: 0 0 0.25rem;
      font-family: ui-serif, Georgia, serif;
      font-size: clamp(1.75rem, 5vw, 3rem);
      font-weight: 800;
      color: var(--mos-text-inverse);
    }
    .demo-prayer-card__countdown {
      margin: 0 0 1rem;
      font-family: ui-monospace, monospace;
      font-size: clamp(1.5rem, 4vw, 2.25rem);
      font-weight: 800;
      color: var(--mos-gold-bright);
      letter-spacing: 0.04em;
    }
    .demo-prayer-card__jamaat {
      padding: 0.875rem 1rem;
      border-radius: 12px;
      background: var(--demo-surface);
      border: 1px solid var(--demo-border);
    }
    .demo-prayer-card__jamaat-label {
      margin: 0;
      font-size: 0.75rem;
      color: var(--demo-muted);
    }
    .demo-prayer-card__jamaat-time {
      margin: 0.125rem 0 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--demo-primary);
    }

    .demo-jumuah-card {
      padding: 1rem 1.25rem;
      border-radius: var(--demo-radius);
      text-align: center;
      background: rgba(8, 54, 42, 0.5);
      backdrop-filter: blur(8px);
      border: 1px solid var(--mos-gold-35);
    }
    .demo-jumuah-card--active {
      background: rgba(15, 76, 58, 0.65);
      border-color: var(--mos-gold-55);
    }
    .demo-jumuah-card__hint {
      margin: 0 0 0.25rem;
      font-size: 0.75rem;
      color: var(--mos-on-hero-muted);
    }
    .demo-jumuah-card__time {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--mos-text-inverse);
    }
    .demo-jumuah-card__countdown {
      margin: 0.5rem 0 0;
      font-family: ui-monospace, monospace;
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--mos-gold-bright);
    }

    /* Sections */
    .demo-section {
      padding: 3rem 0;
      background: var(--demo-surface);
    }
    .demo-section--alt { background: var(--demo-bg); }
    .demo-section__title {
      margin: 0 0 1.5rem;
      font-family: ui-serif, Georgia, serif;
      font-size: clamp(1.25rem, 3vw, 1.875rem);
      font-weight: 800;
      color: var(--demo-primary);
      text-align: center;
    }
    .demo-about-text {
      margin: 0 auto;
      max-width: 42rem;
      text-align: center;
      line-height: 1.65;
      color: var(--demo-muted);
      font-size: 0.9375rem;
    }

    .demo-prayer-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }
    @media (min-width: 640px) { .demo-prayer-grid { grid-template-columns: repeat(3, 1fr); gap: 0.75rem; } }
    @media (min-width: 1024px) { .demo-prayer-grid { grid-template-columns: repeat(5, 1fr); } }

    .demo-prayer-slot {
      padding: 0.75rem 0.5rem;
      border-radius: 12px;
      text-align: center;
      background: var(--demo-bg);
      border: 1px solid var(--demo-border);
      transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
    }
    .demo-prayer-slot:hover { transform: translateY(-2px); box-shadow: var(--demo-shadow); }
    .demo-prayer-slot h3 {
      margin: 0 0 0.25rem;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--demo-muted);
    }
    .demo-prayer-slot__time {
      margin: 0;
      font-family: ui-monospace, monospace;
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--demo-text);
    }
    .demo-prayer-slot__countdown {
      margin: 0.375rem 0 0;
      font-family: ui-monospace, monospace;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--mos-gold-bright);
    }
    .demo-prayer-slot--active {
      background: var(--mos-primary-06);
      border-color: var(--mos-gold-55);
      box-shadow: 0 0 0 1px var(--mos-gold-30);
    }
    .demo-prayer-slot--active h3 { color: var(--demo-primary); }

    .demo-jumuah-panel {
      margin-top: 2rem;
      padding: 1.25rem 1.5rem;
      border-radius: var(--demo-radius);
      background: var(--demo-bg);
      border: 1px solid var(--demo-border);
    }
    .demo-jumuah-panel__title {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mos-gold-bright);
      text-align: center;
    }
    .demo-jumuah-panel__slots {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    @media (min-width: 640px) {
      .demo-jumuah-panel__slots { flex-direction: row; justify-content: center; }
    }
    .demo-jumuah-slot {
      text-align: center;
      padding: 0.75rem 1rem;
      border-radius: 12px;
    }
    .demo-jumuah-slot--active {
      background: var(--mos-primary-06);
      border: 1px solid var(--mos-gold-55);
    }
    .demo-jumuah-slot__label { margin: 0; font-size: 0.875rem; color: var(--demo-muted); }
    .demo-jumuah-slot__time {
      margin: 0.25rem 0 0;
      font-family: ui-monospace, monospace;
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--demo-text);
    }
    .demo-jumuah-slot__cd {
      margin: 0.375rem 0 0;
      font-family: ui-monospace, monospace;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--mos-gold-bright);
    }
    .demo-jumuah-slot__cd--lg { font-size: 1.25rem; }
    .demo-jumuah-slot__next {
      margin: 0.25rem 0 0;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mos-gold-bright);
    }

    /* Announcements */
    .demo-announce-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    @media (min-width: 1024px) { .demo-announce-grid { grid-template-columns: 1fr 1fr; gap: 2rem; } }

    .demo-announce-featured {
      padding: 1.25rem 1.5rem;
      border-radius: var(--demo-radius);
      background: var(--demo-surface);
      border: 1px solid var(--mos-gold-35);
      box-shadow: var(--demo-shadow);
    }
    .demo-announce-featured h3 {
      margin: 0.75rem 0 0.5rem;
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--demo-text);
    }
    .demo-announce-featured p { margin: 0; font-size: 0.9375rem; color: var(--demo-muted); line-height: 1.55; }

    .demo-announce-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .demo-announce-item {
      padding: 1rem;
      border-radius: 12px;
      background: var(--demo-surface);
      border: 1px solid var(--demo-border);
    }
    .demo-announce-item h4 { margin: 0; font-size: 0.9375rem; font-weight: 700; color: var(--demo-text); }
    .demo-announce-item p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--demo-muted); }

    .demo-tag {
      display: inline-block;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      background: var(--demo-gold-soft);
      color: var(--mos-gold-dark);
      border: 1px solid var(--mos-gold-35);
    }
    .demo-tag--gold { background: var(--demo-gold); color: var(--demo-primary-deep); border-color: transparent; }

    /* Events */
    .demo-events-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }
    @media (min-width: 1024px) { .demo-events-grid { grid-template-columns: 1fr 1fr; } }

    .demo-events-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .demo-event-card {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 12px;
      background: var(--demo-bg);
      border: 1px solid var(--demo-border);
      transition: transform 0.18s, box-shadow 0.18s;
    }
    .demo-event-card:hover { transform: translateY(-2px); box-shadow: var(--demo-shadow); }
    .demo-event-card__date {
      min-width: 60px;
      padding: 0.5rem;
      border-radius: 12px;
      text-align: center;
      background: var(--mos-primary-08);
      border: 1px solid var(--mos-primary-18);
      flex-shrink: 0;
    }
    .demo-event-card__date p { margin: 0; }
    .demo-event-card__date p:first-child {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--mos-gold-bright);
      text-transform: uppercase;
    }
    .demo-event-card__date p:last-child {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--demo-primary);
    }
    .demo-event-card h4 { margin: 0.5rem 0 0.25rem; font-size: 0.9375rem; font-weight: 700; color: var(--demo-text); }
    .demo-event-card p { margin: 0; font-size: 0.8125rem; color: var(--demo-muted); }

    .demo-janaza-card {
      padding: 1.25rem;
      margin-bottom: 1rem;
      border-radius: var(--demo-radius);
      background: var(--demo-surface);
      border: 1px solid rgba(220, 38, 38, 0.25);
    }
    .demo-janaza-card__verse { margin: 0 0 0.5rem; font-size: 0.9375rem; color: var(--demo-muted); font-style: italic; }
    .demo-janaza-card h4 { margin: 0 0 0.75rem; font-size: 1.125rem; font-weight: 800; color: var(--demo-primary); }
    .demo-janaza-card p { margin: 0; font-size: 0.8125rem; color: var(--demo-text); }
    .demo-janaza-card__loc { margin-top: 0.5rem !important; color: var(--demo-muted) !important; }

    /* Dua */
    .demo-dua { text-align: center; }
    .demo-dua__arabic {
      margin: 0 0 1rem;
      font-family: 'Amiri', 'Traditional Arabic', serif;
      font-size: clamp(1.25rem, 3vw, 1.75rem);
      line-height: 1.8;
      color: var(--demo-primary);
    }
    .demo-dua__trans {
      margin: 0;
      font-size: 0.875rem;
      font-style: italic;
      color: var(--demo-muted);
    }

    /* Footer */
    .demo-footer {
      padding: 2rem 0;
      background: var(--demo-primary-deep);
      border-top: 1px solid var(--mos-gold-30);
    }
    .demo-footer__grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 768px) { .demo-footer__grid { grid-template-columns: 1fr 1fr; } }
    .demo-footer h3 { margin: 0 0 0.5rem; font-size: 1.125rem; font-weight: 700; color: var(--mos-text-inverse); }
    .demo-footer p { margin: 0; font-size: 0.8125rem; color: var(--mos-on-hero-muted); line-height: 1.5; }
    .demo-footer__meta {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
    @media (min-width: 768px) { .demo-footer__meta { align-items: flex-end; } }

    .demo-loading {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(248, 250, 249, 0.9);
      color: var(--demo-muted);
      font-size: 0.875rem;
    }

    .demo-not-found {
      min-height: 60vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      text-align: center;
      padding: 2rem;
    }
    .demo-not-found h1 { margin: 0; font-size: 1.5rem; color: var(--demo-primary); }
    .demo-not-found p { margin: 0; color: var(--demo-muted); }

    .demo-banner-wrap { width: 100%; max-height: 220px; overflow: hidden; }
    .demo-banner { width: 100%; height: 220px; object-fit: cover; display: block; }
    .demo-logo { width: 72px; height: 72px; object-fit: contain; border-radius: 12px; margin-bottom: 0.75rem; background: #fff; padding: 4px; }

    .demo-claim-box {
      margin-top: 1rem;
      padding: 1rem 1.125rem;
      border-radius: 12px;
      border: 1px solid rgba(212, 175, 55, 0.35);
      background: linear-gradient(145deg, rgba(2, 44, 34, 0.97) 0%, rgba(6, 78, 59, 0.92) 100%);
      max-width: 420px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }
    .demo-claim-box--pending {
      border-color: #fbbf24;
      background: linear-gradient(145deg, rgba(69, 45, 8, 0.95) 0%, rgba(120, 80, 10, 0.9) 100%);
    }
    .demo-claim-box p {
      margin: 0 0 0.65rem;
      font-size: 0.8125rem;
      color: rgba(167, 243, 208, 0.9);
      font-weight: 600;
    }
    .demo-claim-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      border: 2px solid var(--demo-gold);
      background: linear-gradient(135deg, var(--demo-gold) 0%, #e8c547 100%);
      color: #08362a;
      font-size: 0.875rem;
      font-weight: 800;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(212, 175, 55, 0.45);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .demo-claim-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(212, 175, 55, 0.55);
    }
    .demo-claim-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .demo-claim-msg { margin: 0.5rem 0 0 !important; font-size: 0.75rem !important; font-weight: 600; }
    .demo-claim-msg--ok { color: #6ee7b7 !important; }
    .demo-claim-msg--err { color: #fca5a5 !important; }
    .demo-claim-form { display: grid; gap: 0.55rem; margin-top: 0.5rem; }
    .demo-claim-input {
      width: 100%; box-sizing: border-box; padding: 0.55rem 0.75rem; border-radius: 8px;
      border: 1px solid rgba(212, 175, 55, 0.28);
      background: rgba(0, 0, 0, 0.28);
      color: #ecfdf5;
      font-size: 0.8125rem;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      pointer-events: auto;
      -webkit-text-fill-color: #ecfdf5;
    }
    .demo-claim-input:-webkit-autofill,
    .demo-claim-input:-webkit-autofill:focus {
      -webkit-text-fill-color: #ecfdf5;
      box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.28) inset;
      caret-color: #ecfdf5;
    }
    .demo-claim-input::placeholder { color: rgba(167, 243, 208, 0.45); }
    .demo-claim-input:focus {
      border-color: var(--demo-gold);
      box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
    }
    .demo-claim-input option { color: #08362a; background: #ecfdf5; }
    .demo-claim-file {
      font-size: 0.75rem;
      color: rgba(167, 243, 208, 0.8);
      display: grid;
      gap: 0.35rem;
      padding: 0.5rem 0.65rem;
      border-radius: 8px;
      border: 1px dashed rgba(212, 175, 55, 0.35);
      background: rgba(0, 0, 0, 0.18);
    }
    .demo-claim-file input[type="file"] { font-size: 0.75rem; color: rgba(236, 253, 245, 0.85); }
    .demo-claim-textarea { min-height: 4.5rem; resize: vertical; }
    .demo-claim-docs { display: grid; gap: 0.45rem; }
    .demo-claim-docs__title { margin: 0; font-size: 0.72rem; font-weight: 700; color: rgba(236, 253, 245, 0.85); }
    .demo-claim-check {
      display: flex;
      align-items: flex-start;
      gap: 0.45rem;
      font-size: 0.76rem;
      color: rgba(236, 253, 245, 0.9);
      line-height: 1.4;
    }
    .demo-claim-check input { margin-top: 0.15rem; }
    .demo-nav__admin-link {
      margin-left: auto;
      font-size: 0.72rem;
      font-weight: 700;
      color: #065f46;
      text-decoration: none;
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 9999px;
      padding: 0.25rem 0.65rem;
      background: rgba(255, 255, 255, 0.85);
    }
    /* Issue 1 — editable claim fields */
    .demo-claim-field {
      display: grid;
      gap: 0.25rem;
      font-size: 0.6875rem;
      font-weight: 600;
      color: rgba(167, 243, 208, 0.75);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    /* Issue 2 — SuperAdmin / role guidance */
    .demo-claim-admin-note {
      margin-top: 0.5rem;
      padding: 0.75rem;
      border-radius: 8px;
      border: 1px solid rgba(212, 175, 55, 0.35);
      background: rgba(0, 0, 0, 0.22);
    }
    .demo-claim-admin-note p {
      margin: 0 0 0.65rem;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: rgba(236, 253, 245, 0.9);
      text-transform: none;
      letter-spacing: normal;
      font-weight: 500;
    }
    .demo-claim-btn--secondary {
      background: transparent;
      color: #fcd34d;
      border-color: rgba(212, 175, 55, 0.45);
      box-shadow: none;
    }
    .demo-claim-role-note {
      margin: 0.5rem 0 0;
      font-size: 0.8125rem;
      line-height: 1.45;
      color: #fca5a5;
      font-weight: 600;
    }
    .demo-claim-optional {
      font-weight: 500;
      font-size: 0.75rem;
      opacity: 0.75;
    }
    .demo-claim-loading {
      margin: 0.5rem 0 0;
      font-size: 0.8125rem;
      color: rgba(167, 243, 208, 0.85);
    }
    .demo-claim-box--pending .demo-claim-review-id {
      margin: 0.35rem 0 0;
      font-family: ui-monospace, monospace;
      font-size: 0.875rem;
      font-weight: 800;
      color: #fcd34d;
    }
    .demo-claim-review-meta {
      margin: 0.5rem 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 0.35rem;
      font-size: 0.8125rem;
      color: rgba(254, 243, 199, 0.92);
    }
    .demo-claim-review-meta li {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .demo-claim-review-meta strong { color: #fde68a; }

    .demo-empty { text-align: center; }
    .demo-empty p { margin: 0.5rem 0 0; font-size: 0.8125rem; color: var(--demo-muted); }

    .demo-public-stats {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;
    }
    @media (min-width: 768px) { .demo-public-stats { grid-template-columns: repeat(4, 1fr); } }
    .demo-public-stat {
      padding: 1rem; border-radius: 12px; text-align: center;
      background: var(--demo-surface); border: 1px solid var(--demo-border);
    }
    .demo-public-stat__value { margin: 0; font-size: 1.5rem; font-weight: 800; color: var(--demo-primary); }
    .demo-public-stat__label { margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--demo-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .demo-facility-badges { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
    .demo-facility-badge {
      padding: 0.35rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600;
      background: var(--mos-primary-08); color: var(--demo-primary); border: 1px solid var(--mos-primary-18);
    }
    .demo-services-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    @media (min-width: 768px) { .demo-services-grid { grid-template-columns: repeat(3, 1fr); } }
    .demo-service-card {
      padding: 1rem; border-radius: 12px; text-align: center; font-weight: 600;
      background: var(--demo-bg); border: 1px solid var(--demo-border); color: var(--demo-text);
    }
    .demo-map { width: 100%; height: 280px; border: 0; border-radius: 12px; }
    .demo-directions-link {
      display: inline-block; margin-top: 0.75rem; font-weight: 700; color: var(--demo-primary); text-decoration: none;
    }
    .demo-directions-link:hover { text-decoration: underline; }

    .demo-nav__actions {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; margin-left: auto;
    }
    .demo-nav__action {
      padding: 0.3rem 0.65rem; border-radius: 999px; border: 1px solid rgba(16,185,129,.35);
      background: rgba(255,255,255,.9); color: #065f46; font-size: 0.68rem; font-weight: 700; cursor: pointer;
    }
    .demo-nav__action--primary { background: linear-gradient(135deg, #d4af37, #e8c547); color: #08362a; border-color: #d4af37; }
    .demo-nav__action--saved { background: #ecfdf5; border-color: #34d399; }
    .demo-action-toast {
      margin-top: 0.35rem; padding: 0.55rem 1rem; border-radius: 10px;
      background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46; font-size: 0.8125rem; font-weight: 600;
    }
    .demo-claim-box__head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .demo-verification-badge {
      font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 999px;
      background: rgba(251,191,36,.2); color: #fcd34d; border: 1px solid rgba(251,191,36,.35);
    }
    .demo-status-workflow {
      display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.65rem;
      font-size: 0.62rem; font-weight: 700; color: rgba(167,243,208,.75); text-transform: uppercase;
    }
    .demo-workflow-step--current { color: #fcd34d; }
    .demo-workflow-step--done { color: #6ee7b7; }
    .demo-workflow-arrow { margin: 0 0.15rem; opacity: 0.6; }
    .demo-claim-meta {
      list-style: none; margin: 0 0 0.75rem; padding: 0; display: grid; gap: 0.35rem;
      font-size: 0.8125rem; color: rgba(167,243,208,.85);
    }
    .demo-claim-meta li { display: flex; justify-content: space-between; gap: 0.75rem; }
    .demo-claim-meta strong { color: #ecfdf5; }
    .demo-progress-tracker {
      display: flex; flex-wrap: wrap; gap: 0.35rem 0.5rem; margin: 0.75rem 0;
    }
    .demo-progress-step {
      display: flex; align-items: center; gap: 0.35rem; font-size: 0.68rem; font-weight: 700;
      color: rgba(254,243,199,.55); text-transform: uppercase;
    }
    .demo-progress-step__dot {
      width: 0.55rem; height: 0.55rem; border-radius: 50%; background: rgba(254,243,199,.35);
    }
    .demo-progress-step--complete { color: #fde68a; }
    .demo-progress-step--complete .demo-progress-step__dot { background: #fbbf24; }
    .demo-progress-step--active { color: #fff; }
    .demo-progress-step--active .demo-progress-step__dot { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,.35); }
    .demo-section-split {
      display: grid; gap: 2rem;
    }
    @media (min-width: 900px) { .demo-section-split { grid-template-columns: 1.2fr 1fr; align-items: start; } }
    .demo-section__title--left { text-align: left; }
    .demo-overview-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1rem; margin: 0;
    }
    @media (max-width: 420px) {
      .demo-overview-grid { grid-template-columns: 1fr; }
    }
    .demo-overview-grid dt { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: var(--demo-muted); }
    .demo-overview-grid dd { margin: 0.2rem 0 0; font-size: 0.9375rem; color: var(--demo-text); line-height: 1.5; }
    .demo-overview-grid__full { grid-column: 1 / -1; }
    .demo-prayer-method { text-align: center; margin: -0.75rem 0 1rem; font-size: 0.875rem; color: var(--demo-muted); }
    .demo-prayer-highlight {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; max-width: 32rem; margin: 0 auto;
    }
    .demo-prayer-highlight__item {
      padding: 1rem; border-radius: 12px; text-align: center; background: var(--demo-bg); border: 1px solid var(--demo-border);
    }
    .demo-prayer-highlight__item span { display: block; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: var(--demo-muted); }
    .demo-prayer-highlight__item strong { display: block; margin-top: 0.25rem; font-size: 1.125rem; color: var(--demo-primary); }
    .demo-prayer-highlight__item em { display: block; margin-top: 0.25rem; font-style: normal; font-family: ui-monospace, monospace; color: var(--mos-gold-bright); font-weight: 800; }
    .demo-events-grid-cards {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;
    }
    .demo-event-grid-card {
      padding: 1rem; border-radius: 12px; background: var(--demo-surface); border: 1px solid var(--demo-border);
    }
    .demo-event-grid-card__date { margin: 0 0 0.35rem; font-size: 0.75rem; font-weight: 800; color: var(--mos-gold-bright); text-transform: uppercase; }
    .demo-event-grid-card h3 { margin: 0 0 0.35rem; font-size: 1rem; color: var(--demo-text); }
    .demo-event-grid-card p { margin: 0 0 0.5rem; font-size: 0.8125rem; color: var(--demo-muted); }
    .demo-gallery {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.65rem;
    }
    .demo-gallery img {
      width: 100%; height: 140px; object-fit: cover; border-radius: 12px; border: 1px solid var(--demo-border);
    }
    .demo-contact-grid {
      display: grid; gap: 1.5rem;
    }
    @media (min-width: 768px) { .demo-contact-grid { grid-template-columns: 1fr 1fr; } }
    .demo-contact-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.65rem; }
    .demo-contact-list li { display: grid; gap: 0.15rem; }
    .demo-contact-list span { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: var(--demo-muted); }
    .demo-contact-list a { color: var(--demo-primary); font-weight: 700; text-decoration: none; }
    .demo-contact-list a:hover { text-decoration: underline; }
    .demo-social-links { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
    .demo-social-links a {
      padding: 0.35rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700;
      background: var(--mos-primary-08); color: var(--demo-primary); border: 1px solid var(--mos-primary-18); text-decoration: none;
    }
    .demo-claim-box app-mosque-status-indicator { margin-bottom: 0; }
    /* Claim modal */
    .claim-modal-backdrop {
      position: fixed; inset: 0; z-index: 200;
      background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    }
    .claim-modal {
      width: min(100%, 540px); max-height: 90dvh; display: flex; flex-direction: column;
      background: #06261e; border: 1px solid rgba(212,175,55,0.35); border-radius: 16px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.45);
    }
    .claim-modal__head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;
      padding: 1.25rem 1.25rem 1rem; border-bottom: 1px solid rgba(212,175,55,0.2); flex-shrink: 0;
    }
    .claim-modal__eyebrow { margin: 0 0 0.25rem; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(167,243,208,.65); }
    .claim-modal__head h2 { margin: 0; font-size: 1.125rem; font-weight: 800; color: #fff; }
    .claim-modal__close {
      flex-shrink: 0; width: 2rem; height: 2rem; border-radius: 8px;
      border: 1px solid rgba(212,175,55,0.3); background: transparent;
      color: rgba(167,243,208,.7); font-size: 0.9rem; cursor: pointer;
    }
    .claim-modal__body {
      flex: 1; overflow-y: auto; padding: 1rem 1.25rem;
      display: flex; flex-direction: column; gap: 0.75rem;
      scrollbar-width: thin; scrollbar-color: rgba(212,175,55,0.3) transparent;
    }
    .claim-modal__hint { margin: 0; font-size: 0.8125rem; color: rgba(167,243,208,.75); line-height: 1.5; }
    .claim-modal__foot {
      flex-shrink: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0.625rem;
      padding: 1rem 1.25rem; border-top: 1px solid rgba(212,175,55,0.2);
    }
  `]
})
export class DemoMosqueComponent implements OnInit, OnDestroy {
  /** `public` = production `/mosque/:slug`; `demo` = guided demo at `/demo`. */
  @Input() viewMode: 'demo' | 'public' = 'demo';
  /** Open claim modal after profile loads (e.g. `/mosque/:slug/claim`). */
  @Input() openClaimOnLoad = false;

  private mosqueService = inject(MosqueService);
  private todayService = inject(TodayService);
  private adminService = inject(AdminService);
  readonly auth = inject(AuthService);
  private seo = inject(SeoService);
  private injector = inject(Injector);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);

  showLoginModal = signal(false);
  showClaimModal = signal(false);
  showClaimSuccess = signal(false);
  pendingClaim = signal<ClaimSubmissionDetails | null>(null);
  actionToast = signal('');
  private savedMosqueIds = new Set<number>();
  private toastTimer?: ReturnType<typeof setTimeout>;
  prayerTimes = signal<PrayerTimesDaily | null>(null);
  jumuah = signal<JumuahTime[]>([]);
  announcements = signal<Announcement[]>([]);
  events = signal<MosqueEvent[]>([]);
  janaza = signal<JanazaAnnouncement[]>([]);
  nextPrayerName = signal('—');
  countdown = signal('00:00:00');
  nextJamaat = signal('—');
  jumuahCountdowns = signal<JumuahSlotCountdown[]>([]);
  nextJumuah = signal<{ slotNumber: number; jamaatTime: string; countdown: string } | null>(null);
  isFriday = signal(false);
  tourActive = signal(false);
  tourCompleted = signal(!!sessionStorage.getItem(DEMO_TOUR_KEY));
  featuredDua = signal<{ title: string; arabicText: string; translation?: string } | null>(null);
  todayWird = signal<string | null>(null);
  todayQuran = signal<string | null>(null);
  usingOfflineDemo = signal(false);
  loading = signal(true);
  notFound = signal(false);
  claimMsg = signal('');
  claimMsgOk = signal(true);
  claimSubmitted = signal(false);
  claiming = signal(false);
  formatTime = formatTime12;
  enabledModules = signal<Record<string, boolean>>({});

  claimFile: File | null = null;
  claimDto = {
    fullName: '',
    phone: '',
    position: '',
    organization: '',
    relationshipToMosque: '',
    yearsAssociated: null as number | null,
    reason: '',
    authorizedDeclaration: false,
    accurateInfoDeclaration: false,
  };

  mosque = signal<Mosque | null>(null);

  private apiOrigin = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
  private timer?: ReturnType<typeof setInterval>;
  private tourTimers: ReturnType<typeof setTimeout>[] = [];
  private tourCancelled = false;
  private tourProgrammaticScroll = false;
  private userScrollHandler?: () => void;
  slug = environment.defaultMosqueSlug;
  isPublicProfile = false;
  readonly ROLES = ROLES;

  private readonly tourSections = [
    'demo-hero', 'jamaat', 'announcements', 'events', 'dua', 'demo-footer'
  ];

  ngOnInit(): void {
    const slugParam = this.route.snapshot.paramMap.get('slug');
    this.isPublicProfile = this.viewMode === 'public';
    this.slug = this.isPublicProfile
      ? (slugParam ?? '')
      : (slugParam ?? environment.defaultMosqueSlug);

    void this.initMosquePage();
  }

  private async initMosquePage(): Promise<void> {
    if (this.auth.loading()) {
      await firstValueFrom(
        toObservable(this.auth.loading, { injector: this.injector }).pipe(
          filter(loading => !loading),
          take(1),
        ),
      );
    }

    this.startPrayerTimer();
    this.refreshPendingClaim();
    this.loadSavedMosques();

    const previewAdmin = this.route.snapshot.queryParamMap.get('preview') === 'admin';
    const mosqueIdParam = Number(this.route.snapshot.queryParamMap.get('mosqueId'));

    if (this.isPublicProfile && (previewAdmin || this.auth.isSuperAdmin())) {
      if (Number.isFinite(mosqueIdParam) && mosqueIdParam > 0) {
        this.mosqueService.getById(mosqueIdParam).subscribe({
          next: (mosque) => {
            if (mosque.slug) this.slug = mosque.slug;
            this.loadMosqueData(mosque);
          },
          error: () => this.loadAdminBySlugOrNotFound(),
        });
        return;
      }
      if (this.slug) {
        this.mosqueService.getBySlug(this.slug).subscribe({
          next: (mosque) => this.loadMosqueData(mosque),
          error: () => this.loadPublicOrNotFound(),
        });
        return;
      }
      this.handlePublicNotFound();
      return;
    }

    if (!this.slug) {
      this.handlePublicNotFound();
      return;
    }

    const load$ = this.isPublicProfile
      ? this.mosqueService.getPublicBySlug(this.slug)
      : this.mosqueService.getBySlug(this.slug);

    load$.subscribe({
      next: (mosque) => this.loadMosqueData(mosque),
      error: () => this.tryAdminPreviewLoad(),
    });
  }

  private loadAdminBySlugOrNotFound(): void {
    if (!this.slug) {
      this.handlePublicNotFound();
      return;
    }
    this.mosqueService.getBySlug(this.slug).subscribe({
      next: (mosque) => this.loadMosqueData(mosque),
      error: () => this.handlePublicNotFound(),
    });
  }

  private loadPublicOrNotFound(): void {
    if (!this.slug) {
      this.handlePublicNotFound();
      return;
    }
    this.mosqueService.getPublicBySlug(this.slug).subscribe({
      next: (mosque) => this.loadMosqueData(mosque),
      error: () => this.tryAdminPreviewLoad(),
    });
  }

  private startPrayerTimer(): void {
    this.timer = setInterval(() => {
      const pt = this.prayerTimes();
      if (pt) this.tickPrayer(pt);
      const j = this.jumuah();
      if (j.length) this.tickJumuah(j);
    }, 1000);
  }

  private loadMosqueData(mosque: Mosque): void {
    const mosqueId = mosque.id;
    this.applyFeatureFlags(mosque);
    const flags = this.enabledModules();
    const on = (key: string, defaultOn = false) => flags[key] ?? defaultOn;
    const safe = <T>(obs: import('rxjs').Observable<T>, fallback: T) =>
      obs.pipe(catchError(() => of(fallback)));

    forkJoin({
      mosque: of(mosque),
      prayers: safe(
        on('PrayerTimes', true) ? this.mosqueService.getDailyPrayerTimes(mosqueId) : of({ times: null, exceptions: [] as unknown[] }),
        { times: null, exceptions: [] as unknown[] }
      ),
      jumuah: safe(on('PrayerTimes', true) ? this.mosqueService.getJumuahTimes(mosqueId) : of([] as JumuahTime[]), [] as JumuahTime[]),
      announcements: safe(on('Announcements') ? this.mosqueService.getAnnouncements(mosqueId) : of([] as Announcement[]), [] as Announcement[]),
      events: safe(on('Events') ? this.mosqueService.getEvents(mosqueId) : of([] as MosqueEvent[]), [] as MosqueEvent[]),
      janaza: safe(on('Janaza', true) ? this.mosqueService.getJanaza(mosqueId) : of([] as JanazaAnnouncement[]), [] as JanazaAnnouncement[]),
      today: safe(this.todayService.getToday(mosqueId), {} as TodayResponse),
    }).subscribe({
      next: ({ mosque, prayers, jumuah, announcements, events, janaza, today }) => {
        this.mosque.set(mosque);
        this.usingOfflineDemo.set(false);
        this.applySeo(mosque);
        if (prayers.times) {
          this.prayerTimes.set(prayers.times);
          this.tickPrayer(prayers.times);
        } else if (on('PrayerTimes', true)) {
          const pt = demoFallbackPrayerTimes();
          this.prayerTimes.set(pt);
          this.tickPrayer(pt);
        }
        this.jumuah.set(jumuah.length ? jumuah : (on('PrayerTimes', true) ? DEMO_FALLBACK_JUMUAH : []));
        this.tickJumuah(this.jumuah());
        this.announcements.set(announcements);
        this.events.set(events);
        this.janaza.set(janaza);
        if (today.recommendedDua) this.featuredDua.set(today.recommendedDua);
        this.refreshPendingClaim();
        if (today.recommendedWird) this.todayWird.set(today.recommendedWird.name);
        if (today.quranCard) {
          this.todayQuran.set(`Para ${today.quranCard.todaysPara} of ${today.quranCard.totalParas}`);
        }
        this.onDemoReady();
      },
      error: () => {
        this.mosque.set(mosque);
        this.fillMissingFromFallback();
        this.onDemoReady();
      }
    });
  }

  moduleEnabled(key: string): boolean {
    return isModuleFlagEnabled(this.enabledModules(), key);
  }

  private applyFeatureFlags(mosque: Mosque): void {
    const map: Record<string, boolean> = {};
    for (const s of mosque.settings ?? []) {
      map[s.moduleKey] = s.isEnabled;
    }
    this.enabledModules.set(map);
  }

  private applyFallbackDemo(): void {
    this.usingOfflineDemo.set(true);
    this.mosque.set(DEMO_FALLBACK_MOSQUE);
    const pt = demoFallbackPrayerTimes();
    this.prayerTimes.set(pt);
    this.jumuah.set(DEMO_FALLBACK_JUMUAH);
    this.announcements.set(DEMO_FALLBACK_ANNOUNCEMENTS);
    this.events.set(demoFallbackEvents());
    this.featuredDua.set(DEMO_FALLBACK_DUA);
    this.todayWird.set(DEMO_FALLBACK_WIRD);
    this.todayQuran.set(DEMO_FALLBACK_QURAN);
    this.tickPrayer(pt);
    this.tickJumuah(DEMO_FALLBACK_JUMUAH);
  }

  /** Keep mosque from API but fill empty sections when partial load fails */
  private fillMissingFromFallback(): void {
    if (!this.isPublicProfile) {
      this.usingOfflineDemo.set(true);
    }
    if (!this.prayerTimes()) {
      const pt = demoFallbackPrayerTimes();
      this.prayerTimes.set(pt);
      this.tickPrayer(pt);
    }
    if (!this.jumuah().length) {
      this.jumuah.set(DEMO_FALLBACK_JUMUAH);
      this.tickJumuah(DEMO_FALLBACK_JUMUAH);
    }
    if (!this.announcements().length) this.announcements.set(DEMO_FALLBACK_ANNOUNCEMENTS);
    if (!this.events().length) this.events.set(demoFallbackEvents());
    if (!this.featuredDua()) this.featuredDua.set(DEMO_FALLBACK_DUA);
    if (!this.todayWird()) this.todayWird.set(DEMO_FALLBACK_WIRD);
    if (!this.todayQuran()) this.todayQuran.set(DEMO_FALLBACK_QURAN);
  }

  displayDescription(): string {
    const m = this.mosque();
    return m?.shortDescription?.trim()
      || m?.description?.trim()
      || 'A community mosque serving daily prayers, madrassah classes, and weekly gatherings of dhikr.';
  }

  hasAboutSection(): boolean {
    const m = this.mosque();
    if (!m?.description?.trim()) return false;
    const short = m.shortDescription?.trim() ?? '';
    const full = m.description.trim();
    return !short || full !== short;
  }

  aboutDescription(): string {
    return this.mosque()?.description?.trim() ?? '';
  }

  mediaUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.apiOrigin}${path}`;
  }

  isUnclaimed(): boolean {
    const s = this.mosque()?.status;
    return s === 'Unclaimed' || s === 'ClaimPending';
  }

  isActive(): boolean {
    return this.mosque()?.status === 'Active';
  }

  /** Claim under review (mosque stays Unclaimed; CTA gated by allowClaimRequests) or Claimed awaiting activation. */
  isClaimPending(): boolean {
    const m = this.mosque();
    if (!m) return false;
    if (m.status === 'Claimed') return true;
    return this.isUnclaimed() && m.allowClaimRequests === false;
  }

  canSeePendingBadge(): boolean {
    if (!this.isClaimPending()) return false;
    return this.auth.isSuperAdmin() || this.auth.isAuthenticated();
  }

  canClaimMosque(): boolean {
    const m = this.mosque();
    return this.isUnclaimed()
      && m?.allowClaimRequests !== false
      && (this.auth.hasRole(ROLES.MosqueOwner) || this.auth.hasRole(ROLES.MosqueAdmin));
  }

  showClaimBox(): boolean {
    return this.isPublicProfile && this.isUnclaimed() && this.mosque()?.allowClaimRequests !== false;
  }

  editProfileRoute(): string[] {
    const m = this.mosque();
    if (!m) return ['/dashboard/admin/mosque'];
    if (this.auth.isSuperAdmin()) return ['/dashboard/admin/mosque'];
    return ['/dashboard/admin/mosque'];
  }

  editProfileQueryParams(): { mosqueId: number } | null {
    const m = this.mosque();
    if (!m || !this.auth.isSuperAdmin()) return null;
    return { mosqueId: m.id };
  }

  private tryAdminPreviewLoad(): void {
    const wantsPreview = this.route.snapshot.queryParamMap.get('preview') === 'admin';
    const mosqueIdParam = Number(this.route.snapshot.queryParamMap.get('mosqueId'));

    if (this.isPublicProfile && (wantsPreview || this.auth.isSuperAdmin())) {
      if (Number.isFinite(mosqueIdParam) && mosqueIdParam > 0) {
        this.mosqueService.getById(mosqueIdParam).subscribe({
          next: (mosque) => {
            if (mosque.slug) this.slug = mosque.slug;
            this.loadMosqueData(mosque);
          },
          error: () => this.loadAdminBySlugOrNotFound(),
        });
        return;
      }
      if (this.slug) {
        this.mosqueService.getBySlug(this.slug).subscribe({
          next: (mosque) => this.loadMosqueData(mosque),
          error: () => this.handlePublicNotFound(),
        });
        return;
      }
    }
    if (this.isPublicProfile) {
      this.handlePublicNotFound();
      return;
    }
    this.applyFallbackDemo();
    this.onDemoReady();
  }

  private handlePublicNotFound(): void {
    this.notFound.set(true);
    this.loading.set(false);
    this.seo.setPage('Mosque not found', 'This mosque profile could not be found.');
  }

  claimLoginRoute(): string[] {
    return ['/auth/login'];
  }

  claimLoginQueryParams(): { returnUrl: string } {
    const returnUrl = this.isPublicProfile
      ? `/claim-mosque/${this.slug}`
      : '/demo';
    return { returnUrl };
  }

  /** Mosque Owner or Mosque Admin may submit ownership claims. */
  canSubmitClaim(): boolean {
    if (this.auth.isSuperAdmin()) return false;
    return this.auth.hasRole(ROLES.MosqueOwner) || this.auth.hasRole(ROLES.MosqueAdmin);
  }

  isSuperAdminViewer(): boolean {
    return this.auth.isSuperAdmin();
  }

  openClaimFlow(): void {
    if (this.auth.loading()) {
      this.showToast('Checking your login — please try again in a moment.');
      return;
    }
    if (!this.auth.isAuthenticated()) {
      this.showLoginModal.set(true);
      return;
    }
    if (this.isSuperAdminViewer()) {
      this.showToast('Log in as a mosque owner account to submit a claim, or use Review claims.');
      return;
    }
    if (!this.canSubmitClaim()) {
      this.showToast('Only mosque owner or mosque admin accounts can submit a claim.');
      return;
    }
    this.claimMsg.set('');
    this.showClaimModal.set(true);
  }

  claimWorkflowSteps(): { label: string; current: boolean; done: boolean }[] {
    const labels = ['Unclaimed', 'Submitted', 'Verification', 'Review', 'Approval', 'Active'];
    return labels.map((label, i) => ({ label, current: i === 0, done: false }));
  }

  claimProgressSteps(): { label: string; active: boolean; complete: boolean }[] {
    const labels = ['Submitted', 'Verification', 'Admin Review', 'Approval', 'Activation'];
    const activeIdx = this.claimSubmitted() || this.pendingClaim() ? 1 : 0;
    return labels.map((label, i) => ({
      label,
      complete: i < activeIdx,
      active: i === activeIdx,
    }));
  }

  claimCountLabel(): string {
    return this.isUnclaimed() ? '0 — be the first to claim' : '—';
  }

  mosqueLastUpdated(): string {
    const m = this.mosque();
    const raw = m?.updatedAt || m?.createdAt;
    if (!raw) return 'Recently listed';
    return new Date(raw).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  establishedYear(): string {
    const m = this.mosque();
    if (m?.createdAt) return new Date(m.createdAt).getFullYear().toString();
    return '—';
  }

  missionStatement(): string {
    return this.mosque()?.shortDescription?.trim()
      || 'Serving the local Muslim community with daily prayers, education, and outreach.';
  }

  languagesSpoken(): string {
    return 'English, Urdu, Arabic';
  }

  volunteerCount(): string {
    return this.moduleEnabled('Participation') ? '12+' : '—';
  }

  classCount(): number {
    return this.moduleEnabled('Madrassah') ? Math.max(3, this.events().length) : this.events().length;
  }

  calculationMethod(): string {
    return 'Muslim World League (MWL)';
  }

  galleryImages(): string[] {
    const m = this.mosque();
    if (!m) return [];
    const imgs = [m.bannerUrl, m.logoUrl].filter((u): u is string => !!u?.trim());
    return [...new Set(imgs)];
  }

  isSaved(): boolean {
    const id = this.mosque()?.id;
    return id != null && this.savedMosqueIds.has(id);
  }

  toggleSaveMosque(): void {
    const id = this.mosque()?.id;
    if (id == null) return;
    if (this.savedMosqueIds.has(id)) {
      this.savedMosqueIds.delete(id);
      this.showToast('Removed from saved mosques.');
    } else {
      this.savedMosqueIds.add(id);
      this.showToast('Mosque saved to your list.');
    }
    localStorage.setItem(SAVED_MOSQUES_KEY, JSON.stringify([...this.savedMosqueIds]));
  }

  shareMosque(): void {
    const url = window.location.href;
    const name = this.mosque()?.name ?? 'Mosque';
    if (navigator.share) {
      navigator.share({ title: name, url }).catch(() => this.copyShareLink(url));
    } else {
      this.copyShareLink(url);
    }
  }

  reportListing(): void {
    this.showToast('Report submitted. Our team will review this listing.');
  }

  scrollToSection(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private copyShareLink(url: string): void {
    navigator.clipboard?.writeText(url).then(
      () => this.showToast('Profile link copied to clipboard.'),
      () => this.showToast('Share this page URL from your browser.')
    );
  }

  private loadSavedMosques(): void {
    try {
      const raw = localStorage.getItem(SAVED_MOSQUES_KEY);
      const ids = raw ? JSON.parse(raw) as number[] : [];
      this.savedMosqueIds = new Set(ids.filter(n => typeof n === 'number'));
    } catch {
      this.savedMosqueIds = new Set();
    }
  }

  private showToast(msg: string): void {
    this.actionToast.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.actionToast.set(''), 3500);
  }

  onLoginModalClosed(): void {
    this.showLoginModal.set(false);
  }

  onLoggedInFromModal(): void {
    this.showLoginModal.set(false);
    if (this.canSubmitClaim()) {
      this.showClaimModal.set(true);
    }
  }

  onClaimFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.claimFile = input.files?.[0] ?? null;
  }

  submitClaimForm(): void {
    const m = this.mosque();
    if (!m || this.claiming()) return;
    const dto = this.claimDto;
    if (!dto.fullName?.trim()) { this.claimMsg.set('Full name is required.'); this.claimMsgOk.set(false); return; }
    if (!dto.phone?.trim()) { this.claimMsg.set('Phone is required.'); this.claimMsgOk.set(false); return; }
    if (!dto.position?.trim()) { this.claimMsg.set('Position is required.'); this.claimMsgOk.set(false); return; }
    if (!dto.relationshipToMosque) { this.claimMsg.set('Relationship to mosque is required.'); this.claimMsgOk.set(false); return; }
    if (!dto.reason?.trim() || dto.reason.trim().length < 10) { this.claimMsg.set('Reason must be at least 10 characters.'); this.claimMsgOk.set(false); return; }
    if (!dto.authorizedDeclaration || !dto.accurateInfoDeclaration) { this.claimMsg.set('You must confirm both declarations.'); this.claimMsgOk.set(false); return; }

    this.claiming.set(true);
    this.claimMsg.set('');

    const form = new FormData();
    form.append('fullName', dto.fullName.trim());
    form.append('phone', dto.phone.trim());
    form.append('position', dto.position.trim());
    form.append('relationshipToMosque', dto.relationshipToMosque);
    form.append('reason', dto.reason.trim());
    form.append('authorizedDeclaration', String(dto.authorizedDeclaration));
    form.append('accurateInfoDeclaration', String(dto.accurateInfoDeclaration));
    if (dto.organization?.trim()) form.append('organization', dto.organization.trim());
    if (dto.yearsAssociated != null) form.append('yearsAssociated', String(dto.yearsAssociated));
    if (this.claimFile) form.append('document', this.claimFile, this.claimFile.name);

    this.adminService.submitClaimForm(m.id, form).subscribe({
      next: (res: unknown) => {
        const r = res as { message?: string; mosque?: Mosque; claim?: import('../../../core/models').ClaimSubmissionDetails };
        this.claiming.set(false);
        this.onClaimSubmitted({ message: r.message ?? 'Claim submitted successfully.', mosque: r.mosque, claim: r.claim });
        this.claimDto = { fullName: '', phone: '', position: '', organization: '', relationshipToMosque: '', yearsAssociated: null, reason: '', authorizedDeclaration: false, accurateInfoDeclaration: false };
        this.claimFile = null;
      },
      error: (err: { error?: { message?: string } }) => {
        this.claiming.set(false);
        this.claimMsg.set(err?.error?.message ?? 'Claim submission failed. Please try again.');
        this.claimMsgOk.set(false);
      },
    });
  }

  onClaimModalClosed(): void {
    this.showClaimModal.set(false);
  }

  onClaimSubmitted(res: { message: string; mosque?: Mosque; claim?: ClaimSubmissionDetails }): void {
    this.claimMsgOk.set(true);
    this.claimSubmitted.set(true);
    this.claimMsg.set(res.message || 'Your claim has been submitted and is pending review.');
    if (res.mosque) this.mosque.set(res.mosque);
    if (res.claim) this.pendingClaim.set(res.claim);
    this.showClaimModal.set(false);
    this.showClaimSuccess.set(true);
  }

  claimDashboardRoute(): string[] {
    if (this.auth.hasRole(ROLES.MosqueOwner)) return ['/dashboard/owner'];
    if (this.auth.hasRole(ROLES.MosqueAdmin)) return ['/dashboard/admin'];
    return ['/dashboard'];
  }

  private maybeOpenClaimFromUrl(): void {
    const wantsClaim =
      this.openClaimOnLoad ||
      this.route.snapshot.queryParamMap.get('claim') === '1';
    if (!wantsClaim || !this.showClaimBox()) return;
    if (!this.auth.loading() && this.auth.isAuthenticated()) {
      this.openClaimFlow();
    }
  }

  private refreshPendingClaim(): void {
    if (!this.auth.isAuthenticated()) return;
    const mosqueId = this.mosque()?.id;
    if (!mosqueId) return;

    this.adminService.getMyClaims().subscribe({
      next: (claims) => {
        const list = (claims as { mosqueId?: number; status?: string; claimReference?: string; submittedAt?: string; submittedDate?: string }[]) ?? [];
        const match = list.find(c => c.mosqueId === mosqueId && (c.status === 'Pending' || c.status === 'pending'));
        if (match) {
          this.pendingClaim.set({
            claimReference: match.claimReference,
            submittedAt: match.submittedAt ?? match.submittedDate,
          } as ClaimSubmissionDetails);
        }
      },
      error: () => { /* ignore */ },
    });
  }

  formatClaimDate(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  }

  private applySeo(m: Mosque): void {
    if (!this.isPublicProfile) return;
    const desc = m.description?.slice(0, 160)
      || `${m.name} — ${m.city}, ${m.country}. Prayer times, announcements and community updates.`;
    this.seo.setPage(m.name, desc, `${m.name}, ${m.city}, mosque`, this.mediaUrl(m.bannerUrl || m.logoUrl));
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.stopTour();
  }

  skipTour(): void {
    this.stopTour(true);
  }

  replayTour(): void {
    sessionStorage.removeItem(DEMO_TOUR_KEY);
    this.tourCompleted.set(false);
    this.stopTour();
    this.scheduleTourStart(true);
  }

  private onDemoReady(): void {
    this.loading.set(false);
    if (this.isPublicProfile) this.maybeOpenClaimFromUrl();
    if (!this.isPublicProfile) this.scheduleTourStart();
  }

  private scheduleTourStart(force = false): void {
    afterNextRender(() => {
      requestAnimationFrame(() => this.maybeStartTour(force));
    }, { injector: this.injector });
  }

  private stopTour(persist = false): void {
    this.tourCancelled = true;
    this.tourActive.set(false);
    this.tourTimers.forEach(t => clearTimeout(t));
    this.tourTimers = [];
    this.detachUserScrollListeners();
    if (persist) {
      sessionStorage.setItem(DEMO_TOUR_KEY, '1');
      this.tourCompleted.set(true);
    }
  }

  private attachUserScrollListeners(): void {
    this.detachUserScrollListeners();
    this.userScrollHandler = () => {
      if (this.tourProgrammaticScroll) return;
      this.stopTour(true);
    };
    window.addEventListener('wheel', this.userScrollHandler, { passive: true });
    window.addEventListener('touchmove', this.userScrollHandler, { passive: true });
  }

  private detachUserScrollListeners(): void {
    if (!this.userScrollHandler) return;
    window.removeEventListener('wheel', this.userScrollHandler);
    window.removeEventListener('touchmove', this.userScrollHandler);
    this.userScrollHandler = undefined;
  }

  private scrollTourTo(id: string): void {
    this.tourProgrammaticScroll = true;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.queueTour(() => { this.tourProgrammaticScroll = false; }, 1200);
  }

  private maybeStartTour(force = false): void {
    if (!force && sessionStorage.getItem(DEMO_TOUR_KEY)) return;

    const sections = this.tourSections.filter(id => !!document.getElementById(id));
    if (!sections.length) return;

    this.tourActive.set(true);
    this.tourCancelled = false;
    this.attachUserScrollListeners();

    const pauseMs = 3200;
    let step = 0;

    const runStep = () => {
      if (this.tourCancelled) return;

      if (step >= sections.length) {
        this.scrollTourTo('demo-nav');
        this.queueTour(() => {
          sessionStorage.setItem(DEMO_TOUR_KEY, '1');
          this.tourCompleted.set(true);
          this.tourActive.set(false);
          this.detachUserScrollListeners();
        }, pauseMs);
        return;
      }

      this.scrollTourTo(sections[step]);
      step++;
      this.queueTour(runStep, pauseMs);
    };

    window.scrollTo({ top: 0, behavior: 'auto' });
    this.queueTour(runStep, 600);
  }

  private queueTour(fn: () => void, delay: number): void {
    this.tourTimers.push(setTimeout(fn, delay));
  }

  private tickPrayer(times: PrayerTimesDaily): void {
    const tz = this.mosque()?.timezone || 'Europe/London';
    const next = resolveNextPrayer(times, tz);
    this.nextPrayerName.set(next.name);
    this.nextJamaat.set(formatTime12(next.jamaat));
    this.countdown.set(countdownToJamaat(next.jamaat, tz));
  }

  private tickJumuah(slots: JumuahTime[]): void {
    const tz = this.mosque()?.timezone || 'Europe/London';
    this.isFriday.set(nowInTimezone(tz).dayOfWeek === 5);
    this.jumuahCountdowns.set(resolveJumuahCountdowns(slots, tz));
    this.nextJumuah.set(nextJumuahCountdown(slots, tz));
  }

  prayerSlots(): { name: string; jamaat: string; active: boolean; countdown: string }[] {
    const pt = this.prayerTimes();
    if (!pt) return [];
    const tz = this.mosque()?.timezone || 'Europe/London';
    const next = resolveNextPrayer(pt, tz);
    const activeName = next.name.replace(' (tomorrow)', '');
    return getPrayerSlots(pt).map(p => ({
      name: p.name,
      jamaat: formatTime12(p.jamaat),
      active: p.name === activeName,
      countdown: p.name === activeName ? countdownToJamaat(p.jamaat, tz) : '',
    }));
  }

  featuredAnnouncement(): Announcement | undefined {
    return this.announcements().find(a => a.isFeatured) || this.announcements()[0];
  }

  otherAnnouncements(): Announcement[] {
    const featured = this.featuredAnnouncement();
    return this.announcements().filter(a => a.id !== featured?.id).slice(0, 3);
  }

  facilityBadges(): string[] {
    const keys = this.mosque()?.facilities ?? [];
    if (keys.length) return keys.map(k => FACILITY_LABELS[k] ?? k);
    return ['Parking', 'Wudu Area', "Women's Prayer Area", 'Library', 'Madrasah'];
  }

  publicServices(): string[] {
    return ['Nikah', 'Janazah', 'Counselling', 'Quran Classes', 'Youth Programs'];
  }

  publicStatMembers(): string {
    return '—';
  }

  mapEmbedUrl(): SafeResourceUrl | null {
    const m = this.mosque();
    if (!m?.latitude || !m?.longitude) return null;
    const url = `https://maps.google.com/maps?q=${m.latitude},${m.longitude}&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  directionsUrl(): string | null {
    const m = this.mosque();
    if (!m) return null;
    const q = encodeURIComponent(`${m.address}, ${m.city}, ${m.postcode}, ${m.country}`);
    if (m.latitude && m.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  }
}
