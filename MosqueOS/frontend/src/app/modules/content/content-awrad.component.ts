import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ContentEditorService } from '../../core/services/content-editor.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { WirdCollection } from '../../core/models';
import { getDemoDeletedIds, listDemoCollectionSummaries } from './content-awrad-demo-store';

const TARIQA_OPTIONS = [
  { value: 'General', label: 'General' },
  { value: 'BaAlawi', label: "Ba'Alawi" },
  { value: 'Shadhili', label: 'Shadhili' },
] as const;
const TYPE_OPTIONS = ['Daily', 'Weekly', 'Event'] as const;

type TypeFilter = '' | 'Daily' | 'Weekly' | 'Event';

@Component({
  selector: 'app-content-awrad',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="awrad-dash">
      <app-page-header
        badge="Content Editor"
        title="Awrad & Wird Collections"
        subtitle="Select a collection to open its management dashboard — metrics, items, members, and analytics." />

      <!-- Stats -->
      <div class="awrad-stats">
        <article class="stat-card">
          <span class="stat-card__icon" aria-hidden="true">📿</span>
          <div>
            <p class="stat-card__label">Total collections</p>
            <p class="stat-card__value">{{ collections().length }}</p>
          </div>
        </article>
        <article class="stat-card stat-card--daily">
          <span class="stat-card__icon" aria-hidden="true">☀️</span>
          <div>
            <p class="stat-card__label">Daily</p>
            <p class="stat-card__value">{{ dailyCount() }}</p>
          </div>
        </article>
        <article class="stat-card stat-card--weekly">
          <span class="stat-card__icon" aria-hidden="true">📅</span>
          <div>
            <p class="stat-card__label">Weekly</p>
            <p class="stat-card__value">{{ weeklyCount() }}</p>
          </div>
        </article>
        <article class="stat-card stat-card--event">
          <span class="stat-card__icon" aria-hidden="true">✨</span>
          <div>
            <p class="stat-card__label">Event</p>
            <p class="stat-card__value">{{ eventCount() }}</p>
          </div>
        </article>
        <article class="stat-card stat-card--gold">
          <span class="stat-card__icon" aria-hidden="true">✓</span>
          <div>
            <p class="stat-card__label">Published</p>
            <p class="stat-card__value">{{ publishedCount() }}</p>
          </div>
        </article>
      </div>

      <div class="awrad-workspace">
        <!-- Compact sidebar -->
        <aside class="sidebar">
          <section class="sidebar-card">
            <div class="sidebar-card__head">
              <div class="sidebar-card__icon" aria-hidden="true">📿</div>
              <div>
                <h3 class="sidebar-card__title">{{ editingId() ? 'Edit collection' : 'New collection' }}</h3>
                <p class="sidebar-card__sub">
                  {{ editingId() ? 'Update wird set details' : 'Build a wird set for members' }}
                </p>
              </div>
            </div>

            <div class="sidebar-field">
              <label class="sidebar-label" for="coll-name">Name <span class="req">*</span></label>
              <input id="coll-name" class="sidebar-input" placeholder="Khulasa Wird (Morning)"
                [(ngModel)]="form.name">
            </div>

            <div class="sidebar-field">
              <span class="sidebar-label">Tariqa</span>
              <div class="sidebar-chips">
                <button type="button" *ngFor="let t of tariqaOptions"
                  class="sidebar-chip" [class.sidebar-chip--on]="form.tariqa === t.value"
                  (click)="form.tariqa = t.value">{{ t.label }}</button>
              </div>
            </div>

            <div class="sidebar-field">
              <span class="sidebar-label">Schedule</span>
              <div class="sidebar-chips sidebar-chips--stack">
                <button type="button" *ngFor="let t of typeOptions"
                  class="sidebar-chip sidebar-chip--row" [class.sidebar-chip--on]="form.type === t"
                  [ngClass]="typeClass(t)" (click)="form.type = t">
                  <span>{{ typeIcon(t) }}</span> {{ t }}
                </button>
              </div>
            </div>

            <div class="sidebar-field">
              <label class="sidebar-label" for="coll-time">Recommended time</label>
              <input id="coll-time" class="sidebar-input" placeholder="After Fajr"
                [(ngModel)]="form.recommendedTime">
            </div>

            <div class="sidebar-field">
              <label class="sidebar-label" for="coll-desc">Description</label>
              <textarea id="coll-desc" class="sidebar-input sidebar-textarea" rows="2"
                placeholder="Brief summary for members…" [(ngModel)]="form.description"></textarea>
            </div>

            <div class="sidebar-actions">
              <button type="button" class="btn-gold" (click)="save()"
                [disabled]="saving() || !form.name.trim()">
                {{ saving() ? 'Saving…' : (editingId() ? 'Save changes' : 'Create collection') }}
              </button>
              <button *ngIf="editingId()" type="button" class="btn-ghost" (click)="cancelEdit()">Cancel</button>
            </div>
            <p *ngIf="msg()" class="sidebar-msg" [class.sidebar-msg--err]="!msgOk()">{{ msg() }}</p>
          </section>
        </aside>

        <!-- Main -->
        <div class="awrad-main">
          <section class="toolbar-card">
            <div class="search-field">
              <svg class="search-field__icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input class="search-field__input" type="search" placeholder="Search collection name or tariqa…"
                [(ngModel)]="query" (ngModelChange)="applyFilter()">
            </div>

            <div class="filter-chips" role="group" aria-label="Filter by schedule">
              <button type="button" class="filter-chip" [class.filter-chip--on]="typeFilter === ''"
                (click)="setTypeFilter('')">
                All <span class="filter-chip__count">{{ collections().length }}</span>
              </button>
              <button type="button" *ngFor="let t of typeOptions" class="filter-chip"
                [class.filter-chip--on]="typeFilter === t" [ngClass]="typeClass(t)"
                (click)="setTypeFilter(t)">
                {{ t }} <span class="filter-chip__count">{{ typeCount(t) }}</span>
              </button>
            </div>

            <p class="toolbar-meta">
              Showing <strong>{{ filteredCollections().length }}</strong> of {{ collections().length }} collections
            </p>
          </section>

          <div *ngIf="loading()" class="state-card">
            <span class="pulse-dot"></span> Loading collections…
          </div>

          <div *ngIf="!loading() && !filteredCollections().length" class="state-card state-card--empty">
            <div class="state-card__icon">📿</div>
            <h3>{{ collections().length ? 'No matches' : 'No collections yet' }}</h3>
            <p>{{ collections().length ? 'Try another search or filter.' : 'Create one using the sidebar form.' }}</p>
          </div>

          <div *ngIf="!loading() && filteredCollections().length" class="collections-grid">
            <article *ngFor="let c of filteredCollections()" class="collection-card"
              [ngClass]="typeClass(c.type)" (click)="openCollection(c)" role="button" tabindex="0"
              (keydown.enter)="openCollection(c)">
              <div class="collection-card__head">
                <div class="collection-card__type">
                  <span class="collection-card__icon" aria-hidden="true">{{ typeIcon(c.type) }}</span>
                  <span class="type-badge" [ngClass]="typeClass(c.type)">{{ c.type }}</span>
                </div>
                <span class="status-dot" [attr.data-status]="c.status || 'Published'">
                  {{ statusLabel(c.status) }}
                </span>
              </div>

              <h4 class="collection-card__title">{{ c.name }}</h4>

              <div class="collection-card__meta">
                <span class="meta-item">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  {{ tariqaLabel(c.tariqa) }}
                </span>
                <span *ngIf="c.recommendedTime" class="meta-item">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  {{ c.recommendedTime }}
                </span>
              </div>

              <p *ngIf="c.description" class="collection-card__desc">{{ c.description }}</p>

              <div class="collection-card__actions" (click)="$event.stopPropagation()">
                <button type="button" class="action-btn action-btn--manage" (click)="openCollection(c, $event)">Open Dashboard</button>
                <button type="button" class="action-btn action-btn--edit" (click)="startEdit(c); $event.stopPropagation()">Edit</button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --aw-primary: #0F4C3A;
      --aw-secondary: #1D6B57;
      --aw-dark: #08362A;
      --aw-gold: #D4AF37;
      --aw-bg: #F8FAF9;
      --aw-surface: #FFFFFF;
      --aw-text: #1F2937;
      --aw-muted: #6B7280;
      --aw-border: #E5E7EB;
      --aw-radius: 16px;
      --aw-shadow: 0 1px 3px rgba(8, 54, 42, 0.06), 0 4px 16px rgba(8, 54, 42, 0.05);
      --aw-shadow-hover: 0 8px 24px rgba(8, 54, 42, 0.1), 0 2px 8px rgba(8, 54, 42, 0.06);
      display: block;
    }

    .awrad-dash {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-bottom: 24px;
    }

    :host ::ng-deep app-page-header .text-mos-primary { color: var(--aw-primary) !important; }

    /* Stats */
    .awrad-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    @media (min-width: 768px) { .awrad-stats { grid-template-columns: repeat(5, 1fr); } }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: var(--aw-surface);
      border: 1px solid var(--aw-border);
      border-radius: var(--aw-radius);
      box-shadow: var(--aw-shadow);
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--aw-shadow-hover);
      border-color: rgba(15, 76, 58, 0.2);
    }
    .stat-card__icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9375rem;
      background: rgba(15, 76, 58, 0.08);
      color: var(--aw-primary);
      border: 1px solid rgba(15, 76, 58, 0.12);
      flex-shrink: 0;
    }
    .stat-card--daily .stat-card__icon { background: #ECFDF5; color: #047857; border-color: #A7F3D0; }
    .stat-card--weekly .stat-card__icon { background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }
    .stat-card--event .stat-card__icon { background: #FFFBEB; color: #B45309; border-color: #FDE68A; }
    .stat-card--gold .stat-card__icon { background: #FFFBEB; color: var(--aw-gold); border-color: rgba(212, 175, 55, 0.35); }
    .stat-card__label {
      margin: 0;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--aw-muted);
    }
    .stat-card__value {
      margin: 2px 0 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--aw-primary);
      line-height: 1.1;
      letter-spacing: -0.02em;
    }

    /* Workspace */
    .awrad-workspace {
      display: grid;
      gap: 20px;
      grid-template-columns: 1fr;
      align-items: start;
    }
    @media (min-width: 960px) {
      .awrad-workspace { grid-template-columns: minmax(240px, 272px) 1fr; }
    }

    /* Sidebar */
    .sidebar-card {
      padding: 14px;
      background: linear-gradient(165deg, #0F4C3A 0%, #08362A 100%);
      border: 1px solid rgba(212, 175, 55, 0.28);
      border-radius: var(--aw-radius);
      box-shadow: 0 8px 28px rgba(8, 54, 42, 0.22);
    }
    .sidebar-card__head {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(212, 175, 55, 0.15);
    }
    .sidebar-card__icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      flex-shrink: 0;
    }
    .sidebar-card__title { margin: 0; font-size: 0.8125rem; font-weight: 700; color: #fff; }
    .sidebar-card__sub { margin: 2px 0 0; font-size: 0.625rem; color: rgba(167, 243, 208, 0.65); }

    .sidebar-field { margin-bottom: 10px; }
    .sidebar-label {
      display: block;
      margin-bottom: 4px;
      font-size: 0.5625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(212, 175, 55, 0.9);
    }
    .req { color: #FCA5A5; }
    .sidebar-input {
      width: 100%;
      box-sizing: border-box;
      padding: 7px 10px;
      font-size: 0.75rem;
      color: #fff;
      background: rgba(0, 0, 0, 0.28);
      border: 1px solid rgba(212, 175, 55, 0.22);
      border-radius: 8px;
      outline: none;
      transition: border-color 0.18s, box-shadow 0.18s;
    }
    .sidebar-input:focus {
      border-color: var(--aw-gold);
      box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.12);
    }
    .sidebar-textarea { resize: vertical; min-height: 52px; line-height: 1.45; }

    .sidebar-chips { display: flex; flex-wrap: wrap; gap: 4px; }
    .sidebar-chips--stack { flex-direction: column; }
    .sidebar-chip {
      font-size: 0.625rem;
      font-weight: 600;
      color: rgba(167, 243, 208, 0.9);
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(16, 185, 129, 0.22);
      border-radius: 9999px;
      padding: 4px 8px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .sidebar-chip--row {
      display: flex;
      align-items: center;
      gap: 6px;
      border-radius: 8px;
      width: 100%;
      text-align: left;
      padding: 6px 10px;
    }
    .sidebar-chip:hover { border-color: rgba(212, 175, 55, 0.4); }
    .sidebar-chip--on {
      color: var(--aw-dark);
      background: linear-gradient(180deg, #F5E6A8, var(--aw-gold));
      border-color: var(--aw-gold);
    }
    .type--daily.sidebar-chip--on { background: linear-gradient(180deg, #A7F3D0, #059669); }
    .type--weekly.sidebar-chip--on { background: linear-gradient(180deg, #BFDBFE, #2563EB); color: #fff; }
    .type--event.sidebar-chip--on { background: linear-gradient(180deg, #FDE68A, #D97706); }

    .sidebar-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
    .btn-gold {
      width: 100%;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--aw-dark);
      background: linear-gradient(180deg, #F5E6A8, var(--aw-gold));
      border: 1px solid rgba(212, 175, 55, 0.5);
      border-radius: 10px;
      padding: 9px 12px;
      cursor: pointer;
      box-shadow: 0 3px 12px rgba(212, 175, 55, 0.22);
      transition: transform 0.18s, box-shadow 0.18s;
    }
    .btn-gold:hover:not(:disabled) { transform: translateY(-1px); }
    .btn-gold:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-ghost {
      width: 100%;
      font-size: 0.6875rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.85);
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 7px 12px;
      cursor: pointer;
    }
    .sidebar-msg { margin: 6px 0 0; font-size: 0.6875rem; font-weight: 600; color: #6EE7B7; }
    .sidebar-msg--err { color: #FECACA; }

    /* Toolbar */
    .toolbar-card {
      padding: 14px;
      margin-bottom: 14px;
      background: var(--aw-surface);
      border: 1px solid var(--aw-border);
      border-radius: var(--aw-radius);
      box-shadow: var(--aw-shadow);
    }
    .search-field { position: relative; margin-bottom: 12px; }
    .search-field__icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--aw-muted);
      pointer-events: none;
    }
    .search-field__input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px 10px 36px;
      font-size: 0.8125rem;
      color: var(--aw-text);
      background: var(--aw-bg);
      border: 1px solid var(--aw-border);
      border-radius: 12px;
      outline: none;
      transition: border-color 0.18s, box-shadow 0.18s;
    }
    .search-field__input:focus {
      border-color: var(--aw-primary);
      box-shadow: 0 0 0 3px rgba(15, 76, 58, 0.1);
      background: var(--aw-surface);
    }

    .filter-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 9999px;
      border: 1px solid var(--aw-border);
      background: var(--aw-bg);
      color: var(--aw-muted);
      cursor: pointer;
      transition: background 0.18s, color 0.18s, border-color 0.18s, transform 0.15s;
    }
    .filter-chip:hover {
      border-color: rgba(15, 76, 58, 0.25);
      color: var(--aw-primary);
      transform: translateY(-1px);
    }
    .filter-chip--on {
      background: var(--aw-primary);
      border-color: var(--aw-primary);
      color: #fff;
    }
    .filter-chip--on .filter-chip__count { background: rgba(255, 255, 255, 0.2); color: #fff; }
    .type--daily.filter-chip--on { background: #059669; border-color: #059669; }
    .type--weekly.filter-chip--on { background: #2563EB; border-color: #2563EB; }
    .type--event.filter-chip--on { background: #D97706; border-color: #D97706; }
    .filter-chip__count {
      font-size: 0.625rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 9999px;
      background: rgba(15, 76, 58, 0.08);
      color: var(--aw-primary);
    }
    .toolbar-meta { margin: 12px 0 0; font-size: 0.75rem; color: var(--aw-muted); }
    .toolbar-meta strong { color: var(--aw-primary); font-weight: 700; }

    /* States */
    .state-card {
      padding: 2rem 1rem;
      text-align: center;
      font-size: 0.8125rem;
      color: var(--aw-muted);
      background: var(--aw-surface);
      border: 1px dashed var(--aw-border);
      border-radius: var(--aw-radius);
    }
    .state-card--empty h3 { margin: 0 0 4px; font-size: 0.9375rem; color: var(--aw-text); }
    .state-card--empty p { margin: 0; font-size: 0.75rem; }
    .state-card__icon { font-size: 1.75rem; margin-bottom: 8px; }
    .pulse-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--aw-gold);
      animation: pulse 1s infinite;
      margin-right: 6px;
    }
    @keyframes pulse { 50% { opacity: 0.35; } }

    /* Collection grid */
    .collections-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }
    @media (min-width: 640px) { .collections-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1024px) { .collections-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 1400px) { .collections-grid { grid-template-columns: repeat(4, 1fr); } }

    .collection-card {
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
      background: var(--aw-surface);
      border: 1px solid var(--aw-border);
      border-radius: var(--aw-radius);
      box-shadow: var(--aw-shadow);
      border-left: 3px solid var(--aw-primary);
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      cursor: pointer;
    }
    .collection-card.type--daily { border-left-color: #10B981; }
    .collection-card.type--weekly { border-left-color: #3B82F6; }
    .collection-card.type--event { border-left-color: #F59E0B; }
    .collection-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--aw-shadow-hover);
      border-color: rgba(212, 175, 55, 0.35);
    }

    .collection-card__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .collection-card__type { display: flex; align-items: center; gap: 6px; }
    .collection-card__icon { font-size: 0.875rem; line-height: 1; }

    .type-badge {
      font-size: 0.5625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 7px;
      border-radius: 9999px;
      border: 1px solid;
    }
    .type--daily.type-badge { color: #047857; background: #ECFDF5; border-color: #A7F3D0; }
    .type--weekly.type-badge { color: #1D4ED8; background: #EFF6FF; border-color: #BFDBFE; }
    .type--event.type-badge { color: #B45309; background: #FFFBEB; border-color: #FDE68A; }

    .status-dot {
      font-size: 0.5625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 2px 7px;
      border-radius: 9999px;
      border: 1px solid var(--aw-border);
      color: var(--aw-muted);
      background: var(--aw-bg);
      white-space: nowrap;
    }
    .status-dot[data-status="Published"] { color: #047857; background: #ECFDF5; border-color: #A7F3D0; }
    .status-dot[data-status="Draft"] { color: #64748B; background: #F8FAFC; border-color: #E2E8F0; }
    .status-dot[data-status="InReview"] { color: #B45309; background: #FFFBEB; border-color: #FDE68A; }
    .status-dot[data-status="Approved"] { color: #1D4ED8; background: #EFF6FF; border-color: #BFDBFE; }
    .status-dot--lg { font-size: 0.625rem; padding: 3px 9px; }

    .collection-card__title {
      margin: 0 0 6px;
      font-size: 0.9375rem;
      font-weight: 800;
      color: var(--aw-text);
      line-height: 1.3;
      letter-spacing: -0.01em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .collection-card__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 4px;
    }
    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--aw-muted);
    }
    .meta-item svg { color: var(--aw-gold); flex-shrink: 0; }

    .collection-card__desc {
      margin: 0 0 8px;
      font-size: 0.6875rem;
      color: var(--aw-muted);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .collection-card__actions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid var(--aw-border);
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 5px 4px;
      border-radius: 8px;
      border: 1px solid var(--aw-border);
      cursor: pointer;
      transition: background 0.18s, border-color 0.18s, color 0.18s, box-shadow 0.18s;
      min-height: 26px;
    }
    .action-btn--view { color: #64748B; background: #FAFBFC; border-color: #E2E8F0; }
    .action-btn--view:hover { color: var(--aw-primary); background: #F0FDFA; border-color: rgba(15, 76, 58, 0.28); }
    .action-btn--edit {
      color: #fff;
      background: linear-gradient(180deg, var(--aw-secondary), var(--aw-primary));
      border-color: var(--aw-primary);
    }
    .action-btn--edit:hover { background: linear-gradient(180deg, var(--aw-primary), var(--aw-dark)); }
    .action-btn--manage {
      color: #92680A;
      background: linear-gradient(180deg, #FFFBEB, #FEF3C7);
      border-color: rgba(212, 175, 55, 0.4);
    }
    .action-btn--manage:hover { border-color: var(--aw-gold); background: #FFFBEB; }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(15, 23, 42, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal-card {
      position: relative;
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 20px;
      background: var(--aw-surface);
      border: 1px solid var(--aw-border);
      border-radius: var(--aw-radius);
      box-shadow: 0 20px 48px rgba(8, 54, 42, 0.18);
      animation: slideUp 0.22s ease;
    }
    @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .modal-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 8px;
      background: var(--aw-bg);
      color: var(--aw-muted);
      font-size: 1.125rem;
      cursor: pointer;
    }
    .modal-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .modal-badge {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 9px;
      border-radius: 9999px;
      border: 1px solid;
    }
    .modal-title {
      margin: 0 0 12px;
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--aw-text);
      letter-spacing: -0.02em;
      line-height: 1.3;
    }
    .modal-details {
      margin: 0 0 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .modal-details div {
      display: grid;
      grid-template-columns: 5rem 1fr;
      gap: 8px;
      font-size: 0.8125rem;
    }
    .modal-details dt { margin: 0; font-weight: 600; color: var(--aw-muted); }
    .modal-details dd { margin: 0; color: var(--aw-text); }
    .modal-desc {
      margin: 0 0 16px;
      padding: 10px 12px;
      font-size: 0.8125rem;
      line-height: 1.55;
      color: var(--aw-text);
      background: var(--aw-bg);
      border-radius: 10px;
      border: 1px solid var(--aw-border);
    }
    .modal-footer { display: flex; flex-wrap: wrap; gap: 6px; }

    /* Drawer */
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(15, 23, 42, 0.4);
      animation: fadeIn 0.2s ease;
    }
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(400px, 100vw);
      display: flex;
      flex-direction: column;
      background: var(--aw-surface);
      border-left: 1px solid var(--aw-border);
      box-shadow: -8px 0 32px rgba(8, 54, 42, 0.12);
      animation: slideIn 0.25s ease;
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .drawer__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 16px 18px;
      border-bottom: 1px solid var(--aw-border);
      background: linear-gradient(180deg, #F0FDFA 0%, var(--aw-surface) 100%);
    }
    .drawer__eyebrow {
      margin: 0;
      font-size: 0.5625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--aw-primary);
    }
    .drawer__title {
      margin: 4px 0 0;
      font-size: 1rem;
      font-weight: 800;
      color: var(--aw-text);
      line-height: 1.3;
    }
    .drawer__close {
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 8px;
      background: var(--aw-bg);
      color: var(--aw-muted);
      font-size: 1.125rem;
      cursor: pointer;
      flex-shrink: 0;
    }
    .drawer__body { flex: 1; overflow-y: auto; padding: 16px 18px; }
    .drawer__foot {
      display: flex;
      gap: 8px;
      padding: 14px 18px;
      border-top: 1px solid var(--aw-border);
      background: var(--aw-bg);
    }
    .drawer-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .drawer-meta__tariqa { font-size: 0.75rem; font-weight: 600; color: var(--aw-gold); }
    .drawer-meta__time { margin: 0 0 8px; font-size: 0.75rem; color: var(--aw-muted); }
    .drawer-desc {
      margin: 0 0 16px;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--aw-text);
      padding: 10px;
      background: var(--aw-bg);
      border-radius: 10px;
      border: 1px solid var(--aw-border);
    }
    .drawer-section {
      margin: 0 0 10px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--aw-muted);
    }

    :host ::ng-deep .drawer-workflow .workflow-bar { margin-top: 0; }
    :host ::ng-deep .drawer-workflow .status-pill {
      font-size: 0.625rem;
      color: #047857;
      background: #ECFDF5;
      border-color: #A7F3D0;
    }
    :host ::ng-deep .drawer-workflow .status-pill[data-status="Draft"] { color: #64748B; background: #F8FAFC; border-color: #E2E8F0; }
    :host ::ng-deep .drawer-workflow .status-pill[data-status="InReview"] { color: #B45309; background: #FFFBEB; border-color: #FDE68A; }
    :host ::ng-deep .drawer-workflow .wf-btn {
      font-size: 0.6875rem;
      color: var(--aw-primary);
      background: var(--aw-bg);
      border-color: var(--aw-border);
    }
    :host ::ng-deep .drawer-workflow .wf-btn:hover { background: #F0FDFA; border-color: rgba(15, 76, 58, 0.3); }
    :host ::ng-deep .drawer-workflow .wf-msg { color: var(--aw-primary); font-size: 0.6875rem; }
    :host ::ng-deep .drawer-workflow .wf-msg--err { color: #B91C1C; }
  `]
})
export class ContentAwradComponent implements OnInit {
  private editor = inject(ContentEditorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly tariqaOptions = TARIQA_OPTIONS;
  readonly typeOptions = TYPE_OPTIONS;

  collections = signal<WirdCollection[]>([]);
  filteredCollections = signal<WirdCollection[]>([]);
  loading = signal(true);
  saving = signal(false);
  msg = signal('');
  msgOk = signal(true);
  typeFilter: TypeFilter = '';
  query = '';
  editingId = signal<number | null>(null);

  dailyCount = computed(() => this.collections().filter(c => c.type === 'Daily').length);
  weeklyCount = computed(() => this.collections().filter(c => c.type === 'Weekly').length);
  eventCount = computed(() => this.collections().filter(c => c.type === 'Event').length);
  publishedCount = computed(() => this.collections().filter(c => (c.status || 'Published') === 'Published').length);

  form = {
    name: '',
    tariqa: 'General' as string,
    type: 'Daily' as string,
    recommendedTime: '',
    description: '',
  };

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('list') === '1') {
      this.load();
      return;
    }
    this.editor.getAwradCollections().subscribe({
      next: cols => {
        const deleted = getDemoDeletedIds();
        const available = cols.filter(c => !deleted.has(c.id));
        const target = available.find(c => c.name.toLowerCase().includes('khulasa')) ?? available[0];
        if (target) {
          void this.router.navigate(['/dashboard/content/awrad', target.id], { replaceUrl: true });
          return;
        }
        const demo = listDemoCollectionSummaries([
          { id: 1, name: 'Khulasa Wird (Morning)', tariqa: 'BaAlawi', type: 'Daily' },
        ]);
        if (demo.length) {
          void this.router.navigate(['/dashboard/content/awrad', demo[0].id], { replaceUrl: true });
        } else {
          void this.router.navigate(['/dashboard/content/awrad'], { queryParams: { list: 1 }, replaceUrl: true });
        }
      },
      error: () => {
        const demo = listDemoCollectionSummaries([
          { id: 1, name: 'Khulasa Wird (Morning)', tariqa: 'BaAlawi', type: 'Daily' },
        ]);
        if (demo.length) {
          void this.router.navigate(['/dashboard/content/awrad', demo[0].id], { replaceUrl: true });
        } else {
          void this.router.navigate(['/dashboard/content/awrad'], { queryParams: { list: 1 }, replaceUrl: true });
        }
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.editor.getAwradCollections().subscribe({
      next: c => {
        this.collections.set(c);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  typeCount(type: string): number {
    return this.collections().filter(c => c.type === type).length;
  }

  setTypeFilter(t: TypeFilter): void {
    this.typeFilter = this.typeFilter === t && t !== '' ? '' : t;
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.query.trim().toLowerCase();
    const f = this.typeFilter;
    let list = this.collections();
    if (f) list = list.filter(c => c.type === f);
    if (q) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.tariqa.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q)) ||
        (c.recommendedTime?.toLowerCase().includes(q))
      );
    }
    this.filteredCollections.set(list);
  }

  typeClass(type: string): string {
    const t = type.toLowerCase();
    if (t === 'weekly') return 'type--weekly';
    if (t === 'event') return 'type--event';
    return 'type--daily';
  }

  typeIcon(type: string): string {
    const t = type.toLowerCase();
    if (t === 'weekly') return '📅';
    if (t === 'event') return '✨';
    return '☀️';
  }

  tariqaLabel(tariqa: string): string {
    return TARIQA_OPTIONS.find(t => t.value === tariqa)?.label ?? tariqa;
  }

  statusLabel(status?: string): string {
    if (status === 'InReview') return 'In Review';
    return status || 'Published';
  }

  openCollection(c: WirdCollection, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/dashboard/content/awrad', c.id]);
  }

  startEdit(c: WirdCollection): void {
    this.editingId.set(c.id);
    this.form = {
      name: c.name,
      tariqa: c.tariqa,
      type: c.type,
      recommendedTime: c.recommendedTime ?? '',
      description: c.description ?? '',
    };
    this.msg.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.resetForm();
    this.msg.set('');
  }

  save(): void {
    const name = this.form.name.trim();
    if (!name) return;
    this.saving.set(true);
    this.msg.set('');

    const payload = {
      ...this.form,
      name,
      recommendedTime: this.form.recommendedTime.trim() || undefined,
      description: this.form.description.trim() || undefined,
    };

    const id = this.editingId();
    const req = id
      ? this.editor.updateAwradCollection(id, payload)
      : this.editor.createAwradCollection(payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.msgOk.set(true);
        this.msg.set(id ? 'Collection updated.' : 'Collection created.');
        this.editingId.set(null);
        this.resetForm();
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.msgOk.set(false);
        this.msg.set(id ? 'Could not update collection.' : 'Could not create collection.');
      },
    });
  }

  private resetForm(): void {
    this.form = { name: '', tariqa: 'General', type: 'Daily', recommendedTime: '', description: '' };
  }
}
