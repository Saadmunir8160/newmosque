import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { JumuahTime, MosqueEvent, PrayerTimesDaily } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import {
  countdownToJamaat, formatTime12, getPrayerSlots, nextJumuahCountdown,
  nowInTimezone, resolveNextPrayer, DEFAULT_PRAYER_TIMEZONE
} from '../../../core/utils/prayer.utils';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styles: [`
    :host { display: block; width: 100%; }

    /* ── Keyframes ── */
    @keyframes mosFadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes mosFloat {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-8px); }
    }

    /* ── Hero entrance ── */
    .mos-hero-in {
      opacity: 0;
      animation: mosFadeInUp 0.7s ease forwards;
    }
    .mos-hero-in-1 { animation-delay: 0.1s; }
    .mos-hero-in-2 { animation-delay: 0.25s; }
    .mos-hero-in-3 { animation-delay: 0.4s; }
    .mos-hero-in-4 { animation-delay: 0.55s; }

    /* ── Phone float ── */
    .mos-float { animation: mosFloat 4s ease-in-out infinite; }
    .mos-float-1 { animation-delay: 0s; }
    .mos-float-2 { animation-delay: 0.8s; }
    .mos-float-3 { animation-delay: 1.6s; }

    /* ── Scroll reveal ── */
    .mos-reveal {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .mos-reveal-visible {
      opacity: 1;
      transform: translateY(0);
    }
    .mos-stagger-0 { transition-delay: 0s; }
    .mos-stagger-1 { transition-delay: 0.08s; }
    .mos-stagger-2 { transition-delay: 0.16s; }
    .mos-stagger-3 { transition-delay: 0.24s; }
    .mos-stagger-4 { transition-delay: 0.32s; }
    .mos-stagger-5 { transition-delay: 0.4s; }

    /* ── Nav link underline ── */
    .mos-nav-link {
      position: relative;
      transition: color 0.2s ease;
    }
    .mos-nav-link::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 0;
      height: 2px;
      background: var(--mos-gold-bright);
      border-radius: 1px;
      transition: width 0.25s ease;
    }
    .mos-nav-link:hover::after { width: 100%; }
    .mos-nav-link.active { color: var(--mos-text-inverse); }
    .mos-nav-link.active::after { width: 100%; }

    /* ── Professional navbar (light SaaS) ── */
    .mos-nav {
      position: sticky; top: 0; z-index: 50;
      border-bottom: 1px solid var(--mos-border);
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    }
    .mos-nav.scrolled {
      background: var(--mos-surface);
      border-bottom-color: var(--mos-border);
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
    }
    .mos-nav-inner {
      display: flex; align-items: center; justify-content: space-between;
      gap: 0.75rem; min-height: 64px; min-width: 0;
    }
    @media (min-width: 1024px) { .mos-nav-inner { min-height: 72px; } }
    .mos-brand {
      display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0;
    }
    .mos-brand-mark {
      width: 38px; height: 38px; border-radius: 11px;
      background: var(--mos-gold-gradient);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 0.95rem; color: var(--mos-primary-deep);
      box-shadow: var(--mos-gold-shadow);
    }
    .mos-brand-text { line-height: 1.15; }
    .mos-brand-name { display: block; font-weight: 800; font-size: 1rem; color: var(--mos-text-primary); letter-spacing: -0.02em; }
    @media (min-width: 640px) { .mos-brand-name { font-size: 1.05rem; } }
    .mos-brand-tag { display: block; font-size: 0.65rem; color: var(--mos-primary); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
    @media (max-width: 380px) { .mos-brand-tag { display: none; } }
    .mos-nav-center {
      display: none; align-items: center; gap: 2px;
      padding: 5px; border-radius: 999px;
      background: var(--mos-bg);
      border: 1px solid var(--mos-border);
    }
    @media (min-width: 1024px) { .mos-nav-center { display: flex; } }
    .mos-nav-pill {
      padding: 8px 16px; border-radius: 999px; border: none; background: transparent;
      color: var(--mos-text-secondary); font-size: 0.875rem; font-weight: 500; cursor: pointer;
      text-decoration: none; transition: color 0.2s, background 0.2s;
    }
    .mos-nav-pill:hover { color: var(--mos-primary); background: var(--mos-primary-08); }
    .mos-nav-pill.active { color: var(--mos-primary-deep); background: var(--mos-gold-bright); font-weight: 600; }
    .mos-nav-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .mos-btn-ghost {
      display: none; padding: 9px 18px; border-radius: 10px; font-size: 0.875rem; font-weight: 600;
      border: 1.5px solid var(--mos-border-input); background: transparent; color: var(--mos-text-primary);
      cursor: pointer; transition: all 0.2s ease;
    }
    .mos-btn-ghost:hover { border-color: var(--mos-primary); background: var(--mos-primary-06); color: var(--mos-primary); }
    @media (min-width: 640px) { .mos-btn-ghost { display: inline-flex; align-items: center; } }
    .mos-btn-primary {
      display: none; padding: 9px 20px; border-radius: 10px; font-size: 0.875rem; font-weight: 700;
      border: none; background: var(--mos-gold-gradient); color: var(--mos-primary-deep);
      text-decoration: none; cursor: pointer;
      box-shadow: var(--mos-gold-shadow);
      transition: transform 0.15s, box-shadow 0.2s;
    }
    .mos-btn-primary:hover { transform: translateY(-1px); box-shadow: var(--mos-gold-shadow-hover); }
    @media (min-width: 640px) { .mos-btn-primary { display: inline-flex; align-items: center; } }
    .mos-menu-toggle {
      display: flex; align-items: center; justify-content: center;
      width: 42px; height: 42px; border-radius: 10px;
      border: 1px solid var(--mos-border-input); background: var(--mos-surface);
      color: var(--mos-primary); cursor: pointer; transition: background 0.2s, border-color 0.2s;
    }
    .mos-menu-toggle:hover { background: var(--mos-bg); border-color: var(--mos-primary); }
    @media (min-width: 1024px) { .mos-menu-toggle { display: none; } }
    .mos-menu-toggle svg { transition: transform 0.25s ease; }
    .mos-menu-toggle.open svg { transform: rotate(90deg); }
    .mos-mobile-drawer {
      overflow: hidden; max-height: 0; opacity: 0;
      transition: max-height 0.35s ease, opacity 0.25s ease;
      border-top: 1px solid transparent;
    }
    .mos-mobile-drawer.open {
      max-height: 480px; opacity: 1;
      border-top-color: var(--mos-border);
    }
    .mos-mobile-nav { padding: 1rem 1.25rem 1.25rem; display: flex; flex-direction: column; gap: 4px; }
    .mos-mobile-link {
      width: 100%; text-align: left; padding: 12px 14px; border-radius: 10px;
      border: none; background: transparent; color: var(--mos-text-secondary); font-size: 0.95rem; font-weight: 500;
      cursor: pointer; text-decoration: none; transition: background 0.2s, color 0.2s;
    }
    .mos-mobile-link:hover, .mos-mobile-link.active { background: var(--mos-primary-08); color: var(--mos-primary); }
    .mos-mobile-cta {
      margin-top: 12px; padding-top: 14px; border-top: 1px solid var(--mos-border);
      display: flex; flex-direction: column; gap: 10px;
    }

    /* ── Card hover lift ── */
    .mos-card-hover {
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
    }
    .mos-card-hover:hover {
      transform: translateY(-4px);
      border-color: var(--mos-primary-35) !important;
      box-shadow: var(--mos-shadow-card-hover);
    }

    /* ── Spiritual tag scale ── */
    .mos-tag-hover {
      transition: transform 0.2s ease, border-color 0.2s ease;
      cursor: default;
    }
    .mos-tag-hover:hover {
      transform: scale(1.05);
      border-color: var(--mos-primary);
    }

    .mos-content-section h2,
    .mos-content-section h3,
    .mos-content-section .text-white {
      color: var(--mos-text-primary) !important;
    }

    .mos-content-section p {
      color: var(--mos-text-secondary);
    }

    /* Today Screen showcase */
    .mos-showcase-section {
      background: linear-gradient(180deg, var(--mos-bg) 0%, var(--mos-mint-soft) 55%, var(--mos-bg) 100%);
      border-top: 1px solid var(--mos-border);
      border-bottom: 1px solid var(--mos-border);
    }
    .mos-showcase-check {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 9999px;
      background: var(--mos-primary-10);
      color: var(--mos-primary);
      border: 1px solid var(--mos-primary-18);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6875rem;
      font-weight: 800;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }
    .mos-showcase-card {
      background: var(--mos-surface);
      border: 1px solid var(--mos-border);
      border-radius: 1.5rem;
      padding: 1.5rem 1.75rem;
      box-shadow: var(--mos-shadow-card-hover);
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }
    .mos-showcase-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 28px rgba(15, 23, 42, 0.1);
    }
    .mos-showcase-prayer {
      background: linear-gradient(135deg, var(--mos-prayer-card-from) 0%, var(--mos-prayer-card-to) 100%);
      border-radius: 1rem;
      padding: 1.25rem 1rem;
      margin-bottom: 1rem;
      text-align: center;
      border: 1px solid var(--mos-gold-35);
      box-shadow: 0 8px 24px rgba(15, 76, 58, 0.22);
    }
    .mos-showcase-prayer__label {
      margin: 0 0 0.25rem;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--mos-on-hero-muted);
    }
    .mos-showcase-prayer__name {
      margin: 0;
      font-size: 1.875rem;
      font-family: ui-serif, Georgia, serif;
      font-weight: 700;
      color: var(--mos-text-inverse);
      line-height: 1.2;
    }
    .mos-showcase-prayer__timer {
      margin: 0.375rem 0 0;
      font-size: 1.5rem;
      font-family: ui-monospace, monospace;
      font-weight: 700;
      color: var(--mos-gold);
      letter-spacing: 0.04em;
    }
    .mos-showcase-mini {
      background: var(--mos-bg);
      border: 1px solid var(--mos-border);
      border-radius: 0.875rem;
      padding: 0.75rem 0.875rem;
      transition: border-color 0.2s, background 0.2s;
    }
    .mos-showcase-mini:hover {
      border-color: var(--mos-primary-25);
      background: var(--mos-surface);
    }
    .mos-showcase-mini__label {
      margin: 0;
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--mos-primary);
    }
    .mos-showcase-mini__value {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--mos-text-primary);
      line-height: 1.4;
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
      .mos-hero-in,
      .mos-float {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
      }
      .mos-reveal {
        opacity: 1;
        transform: none;
        transition: none;
      }
      .mos-card-hover:hover { transform: none; }
      .mos-tag-hover:hover { transform: none; }
      .mos-nav-link::after { display: none; }
    }

    .phone {
      width: min(100%, 200px);
      max-width: 100%;
      flex-shrink: 0;
      border-radius: 22px;
      border: 2px solid var(--mos-gold-35);
      background: linear-gradient(180deg, var(--mos-primary-deep) 0%, var(--mos-text-primary) 100%);
      padding: 6px;
      box-shadow: var(--mos-phone-shadow), 0 0 0 1px rgba(212, 175, 55, 0.12);
    }
    .phone-screen {
      border-radius: 16px;
      overflow: hidden;
      background: linear-gradient(180deg, var(--mos-surface) 0%, var(--mos-mint-soft) 100%);
      min-height: 180px;
      color: var(--mos-text-primary);
    }
    .phone-notch {
      width: 48px;
      height: 5px;
      background: rgba(255, 255, 255, 0.85);
      border-radius: 99px;
      margin: 4px auto 8px;
    }
    .phone-caption {
      text-align: center;
      font-size: 0.75rem;
      color: var(--mos-on-hero-muted);
      margin-top: 0.5rem;
    }

    .phone-screen__eyebrow {
      margin: 0 0 4px;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--mos-text-secondary);
    }
    .phone-screen__hero {
      margin: 0 0 4px;
      font-family: ui-serif, Georgia, serif;
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--mos-primary);
      line-height: 1.2;
    }
    .phone-screen__countdown {
      margin: 0;
      font-family: ui-monospace, monospace;
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--mos-gold);
      letter-spacing: 0.04em;
    }
    .phone-screen__countdown--lg { font-size: 1.25rem; margin-bottom: 4px; }
    .phone-screen__sub {
      margin: 2px 0 0;
      font-size: 0.5625rem;
      color: var(--mos-text-secondary);
    }

    .phone-prayer-list {
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .phone-prayer-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.625rem;
      color: var(--mos-text-secondary);
      padding: 2px 0;
    }
    .phone-prayer-row--active {
      color: var(--mos-gold);
      font-weight: 700;
    }

    .phone-mini-card {
      padding: 8px 10px;
      margin-bottom: 8px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--mos-mint-soft) 0%, var(--mos-mint-bg) 100%);
      border: 1px solid var(--mos-primary-18);
      border-left: 3px solid var(--mos-primary);
      box-shadow: 0 2px 8px rgba(15, 76, 58, 0.08);
    }
    .phone-mini-card--quran {
      background: linear-gradient(135deg, var(--mos-cream) 0%, var(--mos-cream-soft) 100%);
      border-color: var(--mos-gold-30);
      border-left-color: var(--mos-gold);
      margin-bottom: 0;
    }
    .phone-mini-card--event {
      background: linear-gradient(135deg, var(--mos-cream) 0%, var(--mos-cream-warm) 100%);
      border-color: var(--mos-gold-30);
      border-left-color: var(--mos-gold);
    }
    .phone-mini-card--class {
      background: linear-gradient(135deg, var(--mos-blue-soft) 0%, var(--mos-mint-soft) 100%);
      border-color: rgba(29, 107, 87, 0.2);
      border-left-color: var(--mos-secondary);
      margin-bottom: 0;
    }
    .phone-mini-card__label {
      margin: 0;
      font-size: 0.5625rem;
      font-weight: 600;
      color: var(--mos-text-secondary);
    }
    .phone-mini-card__tag {
      margin: 0 0 2px;
      font-size: 0.5625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mos-gold-dark);
    }
    .phone-mini-card__value {
      margin: 2px 0 0;
      font-size: 0.625rem;
      font-weight: 700;
      color: var(--mos-primary);
      line-height: 1.3;
    }
    .phone-mini-card__meta {
      margin: 2px 0 0;
      font-size: 0.5625rem;
      color: var(--mos-text-secondary);
    }
    .phone-mini-card__countdown {
      margin: 4px 0 0;
      font-family: ui-monospace, monospace;
      font-size: 0.625rem;
      font-weight: 700;
      color: var(--mos-gold);
    }

    @media (min-width: 640px) {
      .mos-phone-row { flex-direction: row; }
      .phone { width: 168px; }
      .phone-screen { min-height: 220px; }
    }

    .mos-countdown-live {
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.06em;
    }

    .mos-footer {
      background: linear-gradient(180deg, var(--mos-surface) 0%, var(--mos-bg) 100%);
      border-top: 1px solid var(--mos-border);
      position: relative;
    }
    .mos-footer-accent {
      height: 3px;
      background: linear-gradient(90deg, transparent, var(--mos-primary) 18%, var(--mos-accent-light) 50%, var(--mos-primary) 82%, transparent);
    }
    .mos-footer-inner { position: relative; z-index: 1; }
    .mos-footer-logo {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 0.75rem;
      background: linear-gradient(135deg, var(--mos-primary) 0%, var(--mos-primary-hover) 100%);
      border: 1px solid var(--mos-primary-18);
      box-shadow: 0 4px 12px rgba(15, 76, 58, 0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .mos-footer-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1.5rem;
      padding: 0.375rem 0.75rem;
      border-radius: 9999px;
      background: var(--mos-surface);
      border: 1px solid var(--mos-border);
      color: var(--mos-text-secondary);
      font-size: 0.75rem;
      font-weight: 600;
      box-shadow: var(--mos-shadow-card);
    }
    .mos-footer-badge__dot {
      width: 0.375rem;
      height: 0.375rem;
      border-radius: 9999px;
      background: var(--mos-accent-light);
      box-shadow: 0 0 0 2px var(--mos-gold-30);
    }
    .mos-footer-heading {
      margin: 0 0 1.25rem;
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--mos-text-primary);
    }
    .footer-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--mos-text-secondary);
      font-size: 0.9375rem;
      font-weight: 500;
      transition: color 0.2s ease, transform 0.2s ease;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      text-align: left;
    }
    .footer-link__chev {
      opacity: 0.45;
      color: var(--mos-primary);
      flex-shrink: 0;
    }
    .footer-link:hover {
      color: var(--mos-primary);
      transform: translateX(2px);
    }
    .footer-link:hover .footer-link__chev { opacity: 1; }
    .footer-contact-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      font-size: 0.9375rem;
      line-height: 1.5;
    }
    .footer-contact-label {
      margin: 0 0 0.125rem;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--mos-text-muted);
    }
    .footer-contact-value {
      margin: 0;
      color: var(--mos-text-primary);
      font-weight: 600;
      text-decoration: none;
      transition: color 0.2s ease;
    }
    a.footer-contact-value:hover { color: var(--mos-primary); }
    .footer-icon {
      flex-shrink: 0;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.625rem;
      background: var(--mos-primary-08);
      border: 1px solid var(--mos-primary-18);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--mos-primary);
    }
    .mos-footer-bottom {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--mos-border);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    @media (min-width: 640px) {
      .mos-footer-bottom {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .mos-footer-copy {
      margin: 0;
      font-size: 0.875rem;
      color: var(--mos-text-secondary);
      order: 2;
    }
    @media (min-width: 640px) { .mos-footer-copy { order: 1; } }
    .mos-footer-legal {
      color: var(--mos-text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      transition: color 0.2s ease;
    }
    .mos-footer-legal:hover { color: var(--mos-primary); }
    @media (max-width: 639px) {
      .mos-footer-bottom > div { order: 1; }
    }
  `]
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;
  private timer?: ReturnType<typeof setInterval>;
  private mosqueService = inject(MosqueService);

  menuOpen = signal(false);
  navScrolled = signal(false);
  activeSection = signal('home');

  prayerTimes = signal<PrayerTimesDaily | null>(null);
  jumuah = signal<JumuahTime[]>([]);
  nextPrayerName = signal('—');
  nextJamaat = signal('—');
  countdown = signal('00:00:00');
  isFriday = signal(false);
  nextJumuah = signal<{ slotNumber: number; jamaatTime: string; countdown: string } | null>(null);
  showcaseSubtitle = signal('Next Prayer');
  showcasePrayerName = signal('—');
  showcaseCountdown = signal('00:00:00');
  todayDayLabel = signal('Today');
  todayDateStr = signal('');
  formatTime = formatTime12;
  nextEvent = signal<MosqueEvent | null>(null);
  eventCountdown = signal('—');

  private readonly fallbackPrayers: PrayerTimesDaily = {
    id: 0, mosqueId: 1, date: '',
    fajrStart: '04:15:00', fajrJamaat: '04:30:00',
    dhuhrStart: '13:00:00', dhuhrJamaat: '13:30:00',
    asrStart: '17:45:00', asrJamaat: '18:00:00',
    maghribStart: '21:15:00', maghribJamaat: '21:20:00',
    ishaStart: '22:30:00', ishaJamaat: '22:45:00',
  };

  readonly tagline = 'Manage the Mosque + Strengthen Worship';

  readonly benefits = [
    { icon: '🕌', title: 'Prayer Times', items: ['Daily timetable', 'Jumuah slots', 'Ramadan exceptions'] },
    { icon: '📚', title: 'Madrassah', items: ['Attendance', 'Progress tracking', 'Parent portal'] },
    { icon: '🤝', title: 'Community', items: ['Events', 'Announcements', 'Participation'] },
    { icon: '📿', title: 'Spiritual Life', items: ['Awrad', 'Adhkar', 'Duas', 'Quran plans'] },
  ];

  readonly todayFeatures = [
    { label: 'Next Prayer', desc: 'Live countdown to the next jamaah' },
    { label: 'Jamaah Times', desc: 'Today\'s full timetable at a glance' },
    { label: 'Recommended Wird', desc: 'Context-aware awrad for the time of day' },
    { label: 'Daily Quran Reading', desc: 'Para plans with gentle progress tracking' },
    { label: 'Friday Content', desc: 'Jumuah reminders and special duas' },
    { label: 'Special Events', desc: 'Mawlid, classes and community gatherings' },
  ];

  readonly featureGroups = [
    { title: 'Prayer Times', items: ['Daily timetable', 'Monthly timetable', 'Multiple Jumuah slots', 'Countdown'] },
    { title: 'Announcements', items: ['Publish mosque news', 'Featured notices'] },
    { title: 'Events', items: ['Mawlid', 'Classes', 'Gatherings'] },
    { title: 'Janaza', items: ['Funeral announcements', 'Reading campaigns'] },
    { title: 'Communities', items: ['Study circles', 'Youth groups', 'Tariqa circles'] },
    { title: 'Madrassah', items: ['Classes', 'Attendance', 'Fees', 'Parent access'] },
  ];

  readonly audiences = [
    { title: 'Mosque Administrators', desc: 'Manage all mosque operations from one trusted platform.', icon: '🏛️' },
    { title: 'Teachers', desc: 'Track attendance and student progress with clarity.', icon: '👨‍🏫' },
    { title: 'Parents', desc: 'View children\'s attendance, fees and progress reports.', icon: '👨‍👩‍👧' },
    { title: 'Community Members', desc: 'Stay connected to prayer, learning and events.', icon: '🌙' },
  ];

  readonly spiritual = [
    'Khulasa Wird', 'Awrad Collections', 'Daily Adhkar', 'Duas Library',
    'Quran Reading Plans', 'Wudu Guides', 'Umrah & Hajj Guides',
  ];

  readonly comparison = [
    { traditional: 'Static pages', mos: 'Live prayer times' },
    { traditional: 'No parent portal', mos: 'Madrassah management' },
    { traditional: 'No community tools', mos: 'Events & participation' },
    { traditional: 'No spiritual content', mos: 'Awrad & adhkar' },
  ];

  readonly bradfordMosques = [
    'Masjid Al-Noor Bradford', 'Markazi Jamia Masjid', 'Jamia Masjid Hanfia',
    'Al-Hikmah Centre', 'Masjid-e-Umar', 'Central Mosque Bradford',
  ];

  readonly footerLinks: { label: string; action?: string; route?: string }[] = [
    { label: 'About', action: 'home' },
    { label: 'Features', action: 'features' },
    { label: 'Find a Mosque', route: '/mosques' },
    { label: 'Demo Mosque', route: '/demo' },
    { label: 'Pricing', action: 'pricing' },
    { label: 'Privacy Policy', action: 'privacy' },
    { label: 'Terms of Service', action: 'terms' },
    { label: 'Contact', action: 'contact' },
  ];

  readonly privacySummary =
    'MOS collects only data needed to run your mosque account. Information is stored securely, never sold, and access is limited by role. Contact hello@mosqueos.uk for data requests.';

  readonly termsSummary =
    'Use MOS responsibly for mosque and community purposes. Admins are responsible for published content. Accounts are personal and governed by UK law. Contact hello@mosqueos.uk with questions.';

  constructor(private el: ElementRef<HTMLElement>) {}

  private authService = inject(AuthService);
  private router = inject(Router);

//  // Detect scroll for header styling
//   @HostListener('window:scroll')
//   onWindowScroll() {
//     this.navScrolled.set(window.scrollY > 20);
//   }
//
//   scrollTo(section: string): void {
//     const el = document.getElementById(section);
//     if (el) {
//       el.scrollIntoView({ behavior: 'smooth' });
//     }
//   }
//
//   isActive(section: string): boolean {
//     const el = document.getElementById(section);
//     if (!el) return false;
//     const top = el.offsetTop;
//     const height = el.offsetHeight;
//     const scroll = window.scrollY;
//     return scroll >= top && scroll < top + height;
//   }
//
//   browseAsGuest(): void {
//     this.authService.enterGuestMode();
//     this.router.navigate(['/dashboard/guest']);
//   }

  ngOnInit(): void {
    this.refreshDateLabel();
    const mosqueId = environment.defaultMosqueId;
    this.mosqueService.getDailyPrayerTimes(mosqueId).subscribe({
      next: res => {
        const times = res.times ?? this.fallbackPrayers;
        this.prayerTimes.set(times);
        this.tickPrayer(times);
      },
      error: () => {
        this.prayerTimes.set(this.fallbackPrayers);
        this.tickPrayer(this.fallbackPrayers);
      }
    });
    this.mosqueService.getJumuahTimes(mosqueId).subscribe({
      next: slots => {
        this.jumuah.set(slots);
        this.tickJumuah(slots);
      },
      error: () => this.tickJumuah([])
    });
    this.mosqueService.getEvents(mosqueId).subscribe({
      next: events => this.tickEvent(events),
      error: () => this.tickEvent([])
    });

    this.timer = setInterval(() => {
      this.refreshDateLabel();
      const pt = this.prayerTimes() ?? this.fallbackPrayers;
      this.tickPrayer(pt);
      this.tickJumuah(this.jumuah());
      this.tickEvent(this.eventsCache);
    }, 1000);
  }

  private eventsCache: MosqueEvent[] = [];

  heroPrayerSlots(): { name: string; jamaat: string; active: boolean }[] {
    const pt = this.prayerTimes();
    if (!pt) return [];
    const activeName = this.nextPrayerName().replace(' (tomorrow)', '');
    return getPrayerSlots(pt).map(p => ({
      name: p.name,
      jamaat: formatTime12(p.jamaat),
      active: p.name === activeName,
    }));
  }

  private refreshDateLabel(): void {
    const zoned = nowInTimezone(DEFAULT_PRAYER_TIMEZONE);
    const now = new Date();
    // Date label still from browser calendar day; weekday/Friday from London clock.
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = weekdayNames[zoned.dayOfWeek] ?? now.toLocaleDateString('en-GB', { weekday: 'long' });
    this.todayDayLabel.set(`Today · ${weekday}`);
    this.todayDateStr.set(now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: DEFAULT_PRAYER_TIMEZONE }));
    this.isFriday.set(zoned.dayOfWeek === 5);
  }

  private tickPrayer(times: PrayerTimesDaily): void {
    const next = resolveNextPrayer(times, DEFAULT_PRAYER_TIMEZONE);
    this.nextPrayerName.set(next.name);
    this.nextJamaat.set(formatTime12(next.jamaat));
    this.countdown.set(countdownToJamaat(next.jamaat, DEFAULT_PRAYER_TIMEZONE));
    this.updateShowcase();
  }

  private tickJumuah(slots: JumuahTime[]): void {
    this.nextJumuah.set(nextJumuahCountdown(slots, DEFAULT_PRAYER_TIMEZONE));
    this.updateShowcase();
  }

  private updateShowcase(): void {
    const jumuah = this.nextJumuah();
    if (this.isFriday() && jumuah) {
      this.showcaseSubtitle.set('Next Jumuah');
      this.showcasePrayerName.set(`Jumuah · Slot ${jumuah.slotNumber}`);
      this.showcaseCountdown.set(jumuah.countdown);
      return;
    }
    this.showcaseSubtitle.set('Next Prayer');
    this.showcasePrayerName.set(this.nextPrayerName());
    this.showcaseCountdown.set(this.countdown());
  }

  showcaseGreeting(): string {
    return this.isFriday() && this.nextJumuah() ? 'Jumuah Mubarak' : 'Assalamu Alaikum';
  }

  private tickEvent(events: MosqueEvent[]): void {
    this.eventsCache = events;
    const now = Date.now();
    const upcoming = events
      .map(e => ({ event: e, start: this.parseEventDateTime(e) }))
      .filter(x => x.start.getTime() > now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0];

    if (!upcoming) {
      this.nextEvent.set(null);
      this.eventCountdown.set('—');
      return;
    }
    this.nextEvent.set(upcoming.event);
    this.eventCountdown.set(this.countdownToDateTime(upcoming.start));
  }

  private parseEventDateTime(event: MosqueEvent): Date {
    const date = event.date.includes('T') ? event.date.slice(0, 10) : event.date;
    const time = event.startTime.length >= 5 ? event.startTime.slice(0, 8) : `${event.startTime}:00`;
    return new Date(`${date}T${time}`);
  }

  private countdownToDateTime(target: Date): string {
    const diff = Math.max(0, target.getTime() - Date.now());
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  browseAsGuest(): void {
    this.menuOpen.set(false);
    this.authService.enterGuestMode();
    this.router.navigate(['/dashboard/guest']);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.navScrolled.set(window.scrollY > 12);
    const sections = ['home', 'features', 'pricing', 'contact'];
    for (const id of [...sections].reverse()) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= 120) {
        this.activeSection.set(id);
        return;
      }
    }
    this.activeSection.set('home');
  }

  isActive(id: string): boolean {
    return this.activeSection() === id;
  }

  ngAfterViewInit(): void {
    const root = this.el.nativeElement;
    const reveals = root.querySelectorAll<HTMLElement>('.mos-reveal');

    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reveals.forEach(el => el.classList.add('mos-reveal-visible'));
      return;
    }

    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('mos-reveal-visible');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    reveals.forEach(el => this.observer!.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.timer) clearInterval(this.timer);
  }

  scrollTo(id: string): void {
    this.menuOpen.set(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
