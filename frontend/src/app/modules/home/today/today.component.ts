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
      --today-surface: #FFFFFF;
      --today-border: rgba(15, 23, 42, 0.08);
      --today-gold: #C8A24A;
      --today-gold-soft: rgba(200, 162, 74, 0.14);
      --today-text: #0F172A;
      --today-muted: #64748B;
      --today-cream: #FAF9F6;
      --today-hero: #0A3D2F;
      background: var(--today-cream);
      margin: -0.5rem -0.75rem 0;
      padding: 1.25rem 1rem 3rem;
      min-height: 100%;
      border-radius: 0;
    }
    @media (min-width: 768px) {
      .today-page {
        margin: -0.75rem -1rem 0;
        padding: 1.75rem 1.5rem 3.5rem;
      }
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
      position: relative;
      margin-bottom: 1.75rem;
      padding-bottom: 0;
      border-bottom: none;
      overflow: hidden;
    }
    .today-header::after {
      content: '';
      position: absolute;
      right: -0.5rem;
      top: -0.5rem;
      width: min(48%, 320px);
      height: 160%;
      opacity: 0.09;
      pointer-events: none;
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 160' fill='none'%3E%3Cpath fill='%23C4A574' d='M40 150V85c0-12 9-22 21-22h12c6-18 18-32 34-32s28 14 34 32h14c12 0 21 10 21 22v65H40z'/%3E%3Cpath fill='%23C4A574' d='M155 28c0-14 11-25 25-25s25 11 25 25c-9 2-17 8-25 16-8-8-16-14-25-16z'/%3E%3Crect fill='%23C4A574' x='172' y='44' width='16' height='106' rx='2'/%3E%3Cpath fill='%23C4A574' d='M230 150V78c10-5 18-5 28 0v72h-28z'/%3E%3Ccircle fill='%23C4A574' cx='268' cy='36' r='2.2'/%3E%3Ccircle fill='%23C4A574' cx='282' cy='28' r='1.8'/%3E%3Ccircle fill='%23C4A574' cx='250' cy='22' r='1.6'/%3E%3Cpath stroke='%23C4A574' stroke-width='1.2' d='M248 24c6-4 14-6 22-5M266 38c8-3 16-2 24 2'/%3E%3C/svg%3E") no-repeat right center / contain;
    }
    .today-header-grid {
      position: relative;
      z-index: 1;
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
      padding: 0.28rem 0.7rem;
      border-radius: 9999px;
      color: #92400E;
      border: 1px solid rgba(200, 162, 74, 0.45);
      background: rgba(200, 162, 74, 0.16);
    }
    .today-title {
      font-family: Georgia, 'Times New Roman', ui-serif, serif;
      font-size: clamp(2rem, 4.5vw, 2.85rem);
      font-weight: 700;
      color: #0B1F33;
      line-height: 1.12;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .today-subtitle {
      margin: 0.55rem 0 0;
      color: var(--today-muted);
      font-size: 0.9375rem;
    }
    .today-quick-nav { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .today-quick-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 0.95rem;
      border-radius: 0.75rem;
      border: 1px solid rgba(15, 23, 42, 0.12);
      background: #fff;
      color: #0F4C3A;
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
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
      .today-layout {
        grid-template-columns: minmax(380px, 1fr) minmax(0, 1.15fr);
        gap: 1.75rem;
        align-items: stretch;
      }
    }
    .today-prayer-col {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-width: 0;
    }
    .today-prayer-col .today-hero {
      flex: 1;
      height: 100%;
      min-height: 28rem;
    }
    .today-main-col { display: flex; flex-direction: column; gap: 2rem; min-width: 0; }
    .today-section--full {
      grid-column: 1 / -1;
      width: 100%;
    }

    .today-panel {
      background: #FFFFFF;
      border: 1px solid rgba(15, 23, 42, 0.07);
      border-radius: 1.125rem;
      padding: 1.35rem 1.45rem;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
      color: var(--today-text);
    }
    .today-panel--admin {
      margin-bottom: 2rem;
      padding: 1.375rem 1.5rem;
    }
    .today-panel--empty {
      text-align: center;
      color: var(--today-muted);
      font-size: 0.9375rem;
      border-style: dashed;
      border-color: rgba(15, 23, 42, 0.14);
      background: rgba(255, 255, 255, 0.72);
      padding: 2rem 1.25rem;
      box-shadow: none;
    }
    .today-panel--empty-rich {
      padding: 2.75rem 1.25rem;
    }
    .today-empty-icon {
      width: 1.75rem;
      height: 1.75rem;
      margin: 0 auto 0.65rem;
      display: block;
      color: #94A3B8;
      opacity: 0.85;
    }
    .today-empty-hint {
      margin: 0.35rem 0 0;
      font-size: 0.8125rem;
      color: #94A3B8;
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
      font-family: Georgia, 'Times New Roman', ui-serif, serif;
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
      border-radius: 1.25rem;
      padding: 2rem 1.5rem 1.25rem;
      text-align: center;
      border: none;
      background: #0A3D2F;
      box-shadow: 0 18px 40px rgba(6, 40, 32, 0.32);
      color: #fff;
      min-height: 28rem;
      width: 100%;
      display: flex;
      flex-direction: column;
    }
    .today-hero-texture {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.35;
      background:
        radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255, 255, 255, 0.06), transparent 55%),
        url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E");
      mix-blend-mode: soft-light;
    }
    .today-hero-silhouette {
      position: absolute;
      left: 6%;
      right: 6%;
      bottom: 3.25rem;
      height: 9.5rem;
      color: rgba(18, 78, 60, 0.95);
      pointer-events: none;
      z-index: 0;
      opacity: 0.85;
    }
    .today-hero-silhouette svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .today-hero-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
    }
    .today-hero-label {
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.92);
      margin: 0 0 0.65rem;
    }
    .today-hero-ornament {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      width: 100%;
      max-width: 11rem;
      margin: 0 0 1.1rem;
      color: #C9A227;
    }
    .today-hero-ornament__line {
      flex: 1;
      height: 1.5px;
      background: #C9A227;
      border-radius: 9999px;
      opacity: 0.9;
    }
    .today-hero-ornament__jewel {
      width: 1.35rem;
      height: 1.35rem;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .today-hero-ornament__jewel svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .today-hero-prayer {
      font-family: Georgia, 'Times New Roman', ui-serif, serif;
      font-size: clamp(2rem, 4.2vw, 2.65rem);
      font-weight: 700;
      color: #fff;
      margin: 0 0 0.85rem;
      line-height: 1.05;
    }
    .today-hero-countdown {
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      font-size: clamp(2.85rem, 6.5vw, 3.75rem);
      font-weight: 700;
      color: #C9A227;
      margin: 0 0 0.55rem;
      letter-spacing: 0.06em;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .today-hero-until {
      margin: 0 0 1.75rem;
      font-size: 0.8125rem;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.82);
    }
    .today-hero-cta {
      margin-top: auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.8rem 1rem;
      border-radius: 0.75rem;
      border: 1.5px solid rgba(255, 255, 255, 0.7);
      background: transparent;
      color: #fff;
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.2s, border-color 0.2s;
    }
    .today-hero-cta svg { width: 1rem; height: 1rem; }
    .today-hero-cta:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: #fff;
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
      .today-cards-grid { grid-template-columns: 1fr; }
      .today-span-2 { grid-column: auto; }
    }

    .today-card-heading {
      font-family: Georgia, 'Times New Roman', ui-serif, serif;
      font-size: 1.2rem;
      font-weight: 700;
      color: #0B1F33;
      margin: 0.7rem 0 0.55rem;
      line-height: 1.25;
    }
    .today-card-text {
      font-size: 0.875rem;
      line-height: 1.55;
      color: var(--today-muted);
      margin: 0 0 1rem;
    }
    .today-strong { color: var(--mos-primary); font-weight: 800; }
    .today-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .today-card-mark {
      width: 1.15rem;
      height: 1.15rem;
      color: #94A3B8;
      flex-shrink: 0;
    }
    .today-label {
      display: inline-block;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0.28rem 0.65rem;
      border-radius: 9999px;
    }
    .today-label--gold {
      background: var(--today-gold-soft);
      color: #92400E;
      border: 1px solid rgba(200, 162, 74, 0.35);
    }
    .today-label--recommend {
      background: linear-gradient(135deg, #E2B84A, #C8A24A);
      color: #0B3D2E;
      border: none;
    }
    .today-label--gold-solid {
      background: linear-gradient(135deg, #E2B84A, #C8A24A);
      color: #0B3D2E;
      border: none;
      box-shadow: 0 2px 8px rgba(200, 162, 74, 0.28);
    }
    .today-label--muted {
      background: linear-gradient(135deg, #E2B84A, #C8A24A);
      color: #0B3D2E;
      border: none;
    }

    .today-dua-arabic {
      font-family: 'Amiri', Georgia, 'Traditional Arabic', serif;
      font-size: clamp(1.45rem, 3vw, 1.95rem);
      line-height: 1.85;
      color: #0B1F33;
      text-align: center;
      margin: 0.85rem 0 0.45rem;
    }
    .today-dua-translit {
      font-size: 0.875rem;
      color: #64748B;
      margin: 0 0 0.35rem;
      line-height: 1.5;
      text-align: left;
    }
    .today-dua-trans {
      font-family: Georgia, 'Times New Roman', ui-serif, serif;
      font-size: 0.95rem;
      font-style: italic;
      color: var(--today-muted);
      margin: 0 0 1rem;
      line-height: 1.55;
      text-align: left;
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
      gap: 0.45rem;
      padding: 0.8rem 1.125rem;
      border-radius: 0.85rem;
      background: linear-gradient(135deg, #D4AF5A, #C49A4B);
      color: #0B3D2E;
      font-size: 0.875rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      box-shadow: 0 6px 16px rgba(196, 154, 75, 0.28);
      transition: filter 0.2s, transform 0.2s, box-shadow 0.2s;
      text-decoration: none;
    }
    .today-btn-gold svg { width: 1.05rem; height: 1.05rem; }
    .today-btn-gold:hover {
      filter: brightness(1.03);
      transform: translateY(-1px);
      box-shadow: var(--mos-gold-shadow-hover);
    }
    .today-btn-gold--block { width: 100%; }
    .today-btn-ghost {
      display: inline-flex;
      align-items: center;
      padding: 0.55rem 1rem;
      border-radius: 0.75rem;
      border: 1px solid rgba(15, 23, 42, 0.12);
      background: #fff;
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
      gap: 0.35rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #0F4C3A;
      text-decoration: none;
      transition: color 0.2s;
    }
    .today-link:hover { color: #083328; text-decoration: underline; }
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

  /** Hide placeholder/seed names like "na" from the Recommended card. */
  recommendedWirdTitle(d: TodayResponse): string | null {
    const name = d.recommendedWird?.name?.trim() ?? '';
    if (!name || /^n\/?a$/i.test(name) || name.length < 2) return null;
    return name;
  }

  /** Prefer first name, title-cased for the greeting line. */
  greetingName = computed(() => {
    const full = this.authService.user()?.fullName?.trim() ?? '';
    if (!full) return null;
    const first = full.split(/\s+/)[0] ?? full;
    return first.charAt(0).toUpperCase() + first.slice(1);
  });

  nextPrayerLabel(d: TodayResponse): string {
    const raw = d.nextPrayer?.name?.trim();
    if (!raw) return d.isFriday ? 'Jumuah' : '—';
    const cleaned = raw.replace(/\s*\(tomorrow\)\s*/i, '').trim() || raw;
    if (/^jumua?h$/i.test(cleaned) || /^friday$/i.test(cleaned)) return 'Jumuah';
    return cleaned;
  }

  nextJamaatLabel(d: TodayResponse): string | null {
    const j = d.nextPrayer?.jamaat?.trim();
    if (!j) return null;
    return formatTime12(j);
  }

  countdownHint(d: TodayResponse): string {
    const name = this.nextPrayerLabel(d);
    if (!d.nextPrayer) return 'Prayer time will appear when available';
    if (this.countdown() === '00:00:00') return `It's time for ${name}`;
    return `Time until ${name}`;
  }

  /** Repair common UTF-8→Latin-1 mojibake so Arabic renders correctly. */
  displayArabic(raw: string | null | undefined): string | null {
    const text = (raw ?? '').trim();
    if (!text) return null;
    if (/[\u0600-\u06FF]/.test(text)) return text;
    if (/[ÃØÙÐ]/.test(text)) {
      try {
        const bytes = Uint8Array.from(text, c => c.charCodeAt(0) & 0xff);
        const fixed = new TextDecoder('utf-8').decode(bytes).trim();
        if (fixed && /[\u0600-\u06FF]/.test(fixed)) return fixed;
      } catch { /* keep original */ }
    }
    // Still looks broken — hide rather than show garbage glyphs
    if (/[ÃØÙÐ\uFFFD]/.test(text) && !/[\u0600-\u06FF]/.test(text)) return null;
    if (/[^\u0000-\u007F]/.test(text) && !/[\u0600-\u06FF]/.test(text)) return null;
    return text;
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
      const tz = this.mosqueContext.mosque()?.timezone || 'Europe/London';
      this.countdown.set(countdownToJamaat(d.nextPrayer.jamaat, tz));
    }
  }

  startQuran(): void {
    this.quranService.startPlan().subscribe(() => this.load());
  }

  markQuranDone(para: number): void {
    this.quranService.completePara(para).subscribe(() => this.load());
  }
}
