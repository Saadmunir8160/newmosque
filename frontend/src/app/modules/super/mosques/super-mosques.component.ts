import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PlatformService, MosqueListing } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import {
  MOSQUE_STATUSES,
  formatMosqueStatus,
  statusClass,
} from '../../../core/utils/mosque-status.util';

@Component({
  selector: 'app-super-mosques',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header
      badge="Super Admin"
      title="Mosque listings"
      subtitle="Manage platform mosques — search, filter, review duplicates, and assign owners." />

    <app-card class="block mb-5 add-form-card">
      <div class="add-form-header">
        <div class="add-form-header__main">
          <div class="add-form-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>
              <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>
            </svg>
          </div>
          <div>
            <div class="add-form-title-row">
              <h3 class="add-form-title">Add mosque listing</h3>
              <span class="pending-badge">Pending Review</span>
            </div>
            <p class="add-form-sub">Submit a new mosque for platform review. Required fields are marked with *</p>
          </div>
        </div>
        <button type="button" class="toggle-btn" (click)="showForm.set(!showForm())">
          <svg *ngIf="showForm()" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
          <svg *ngIf="!showForm()" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          {{ showForm() ? 'Hide form' : 'New listing' }}
        </button>
      </div>

      <div *ngIf="showForm()" class="add-form-body">
        <section class="form-section">
          <div class="form-section__head">
            <span class="form-section__num">01</span>
            <div>
              <h4 class="form-section__title">Basic details</h4>
              <p class="form-section__hint">Name and public URL slug for the mosque page</p>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-field">
              <label class="form-label">Mosque name <span class="req">*</span></label>
              <input class="form-input" placeholder="e.g. Masjid Al-Noor" [(ngModel)]="form.name" (blur)="autoSlug()">
            </div>
            <div class="form-field">
              <label class="form-label">URL slug <span class="req">*</span></label>
              <div class="input-prefix-wrap">
                <span class="input-prefix">/mosques/</span>
                <input class="form-input form-input--prefixed" placeholder="masjid-al-noor-bradford" [(ngModel)]="form.slug">
              </div>
              <p class="field-hint">Auto-generated from name if left empty</p>
            </div>
          </div>
        </section>

        <section class="form-section">
          <div class="form-section__head">
            <span class="form-section__num">02</span>
            <div>
              <h4 class="form-section__title">Location</h4>
              <p class="form-section__hint">Address shown on the public mosque profile</p>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-field">
              <label class="form-label">City</label>
              <input class="form-input" placeholder="Bradford" [(ngModel)]="form.city">
            </div>
            <div class="form-field">
              <label class="form-label">Postcode</label>
              <input class="form-input" placeholder="BD1 1AA" [(ngModel)]="form.postcode">
            </div>
            <div class="form-field form-field--full">
              <label class="form-label">Street address</label>
              <input class="form-input" placeholder="12 Manningham Lane" [(ngModel)]="form.address">
            </div>
          </div>
        </section>

        <section class="form-section">
          <div class="form-section__head">
            <span class="form-section__num">03</span>
            <div>
              <h4 class="form-section__title">Contact</h4>
              <p class="form-section__hint">Optional — helps users reach the mosque</p>
            </div>
          </div>
          <div class="form-grid form-grid--3">
            <div class="form-field">
              <label class="form-label">Phone</label>
              <input class="form-input" type="tel" placeholder="+44 1274 000000" [(ngModel)]="form.phone">
            </div>
            <div class="form-field">
              <label class="form-label">Email</label>
              <input class="form-input" type="email" placeholder="info@mosque.org.uk" [(ngModel)]="form.email">
            </div>
            <div class="form-field">
              <label class="form-label">Website</label>
              <input class="form-input" placeholder="https://mosque.org.uk" [(ngModel)]="form.website">
            </div>
          </div>
        </section>

        <section class="form-section">
          <div class="form-section__head">
            <span class="form-section__num">04</span>
            <div>
              <h4 class="form-section__title">Map &amp; coordinates</h4>
              <p class="form-section__hint">Link or GPS for map pin placement</p>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-field form-field--full">
              <label class="form-label">Map location</label>
              <input class="form-input" placeholder="Google Maps link or place name" [(ngModel)]="form.mapLocation">
            </div>
            <div class="form-field">
              <label class="form-label">Latitude</label>
              <input class="form-input" type="number" step="any" placeholder="53.7960" [(ngModel)]="form.latitude">
            </div>
            <div class="form-field">
              <label class="form-label">Longitude</label>
              <input class="form-input" type="number" step="any" placeholder="-1.7594" [(ngModel)]="form.longitude">
            </div>
          </div>
        </section>

        <section class="form-section form-section--last">
          <div class="form-section__head">
            <span class="form-section__num">05</span>
            <div>
              <h4 class="form-section__title">Description</h4>
              <p class="form-section__hint">Short overview for the listing page</p>
            </div>
          </div>
          <div class="form-field">
            <textarea class="form-input form-textarea" rows="3"
              placeholder="Brief description of the mosque, community, and services…"
              [(ngModel)]="form.description"></textarea>
          </div>
        </section>

        <div *ngIf="msg()" class="form-alert" [class.form-alert--ok]="msgOk()" [class.form-alert--err]="!msgOk()">
          <span class="form-alert__icon">{{ msgOk() ? '✓' : '!' }}</span>
          {{ msg() }}
        </div>

        <div class="form-footer">
          <button type="button" class="btn-ghost" (click)="resetForm()" [disabled]="saving()">Clear form</button>
          <button type="button" class="btn-create" (click)="seed()" [disabled]="saving()">
            <svg *ngIf="!saving()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            {{ saving() ? 'Creating listing…' : 'Create listing' }}
          </button>
        </div>
      </div>
    </app-card>

    <app-card class="block mb-4 listings-toolbar-card">
      <div class="listings-toolbar">
        <div class="search-wrap">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input class="list-search" placeholder="Search name, city, postcode…"
            [(ngModel)]="search" (ngModelChange)="onFilterChange()">
        </div>
        <div class="filter-group">
          <select class="list-filter" [(ngModel)]="statusFilter" (ngModelChange)="load()">
            <option value="">All statuses</option>
            <option *ngFor="let s of statuses" [value]="s">{{ formatStatus(s) }}</option>
          </select>
          <label class="dup-chip" [class.dup-chip--on]="duplicatesOnly">
            <input type="checkbox" [(ngModel)]="duplicatesOnly" (ngModelChange)="load()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Duplicates only
          </label>
        </div>
      </div>

      <div class="list-summary">
        <span class="summary-chip">
          <strong>{{ listings().length }}</strong> listing{{ listings().length === 1 ? '' : 's' }}
        </span>
        <span *ngIf="duplicateCount()" class="summary-chip summary-chip--warn">
          <strong>{{ duplicateCount() }}</strong> possible duplicate{{ duplicateCount() === 1 ? '' : 's' }}
        </span>
        <span *ngIf="loading()" class="summary-loading">Refreshing…</span>
      </div>

      <div class="bulk-bar" *ngIf="selectedIds().size">
        <span class="bulk-count">{{ selectedIds().size }} selected</span>
        <select class="list-filter bulk-select" [(ngModel)]="bulkStatus">
          <option value="">Bulk status…</option>
          <option *ngFor="let s of statuses" [value]="s">{{ formatStatus(s) }}</option>
        </select>
        <button type="button" class="bulk-apply" (click)="applyBulk()" [disabled]="!bulkStatus || bulkLoading()">
          {{ bulkLoading() ? 'Applying…' : 'Apply' }}
        </button>
        <button type="button" class="bulk-clear" (click)="clearSelection()">Clear</button>
      </div>
    </app-card>

    <div class="listings-stack">
      <article *ngFor="let m of listings()"
        class="listing-card"
        [class.listing-card--selected]="selectedIds().has(m.id)"
        [class.listing-card--dup]="m.isDuplicate">
        <label class="listing-check" [attr.aria-label]="'Select ' + m.name">
          <input type="checkbox" [checked]="selectedIds().has(m.id)" (change)="toggleSelect(m.id)">
        </label>

        <div class="listing-avatar" aria-hidden="true">{{ m.name.charAt(0) }}</div>

        <div class="listing-body">
          <div class="listing-top">
            <div class="listing-info">
              <h4 class="listing-name">
                <a [routerLink]="['/dashboard/super/mosques', m.id]">{{ m.name }}</a>
                <span *ngIf="m.isDuplicate" class="dup-badge" [title]="m.duplicateReason || 'Possible duplicate'">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                  Duplicate
                </span>
              </h4>
              <p class="listing-location">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ m.city }}<span *ngIf="m.postcode"> · {{ m.postcode }}</span>
                <span *ngIf="m.address" class="listing-addr"> · {{ m.address }}</span>
              </p>
            </div>
            <span class="status-pill" [ngClass]="statusClass(m.status)">{{ formatStatus(m.status) }}</span>
          </div>

          <div class="listing-meta">
            <div class="meta-item">
              <span class="meta-label">Owner</span>
              <span class="meta-value">{{ m.ownerName || '—' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Admins</span>
              <span class="meta-value meta-value--num">{{ m.adminCount }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Users</span>
              <span class="meta-value meta-value--num">{{ m.userCount }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Created</span>
              <span class="meta-value">{{ m.createdAt | date:'mediumDate' }}</span>
            </div>
          </div>
        </div>

        <div class="listing-actions">
          <a [routerLink]="['/dashboard/super/mosques', m.id]" class="action-btn action-btn--view">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View
          </a>
          <a [routerLink]="['/dashboard/super/mosques', m.id, 'edit']" class="action-btn action-btn--edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </a>
          <a *ngIf="m.status === 'Claimed'" routerLink="/dashboard/super/claims" class="action-btn action-btn--claim">
            Review claim
          </a>
        </div>
      </article>

      <div *ngIf="!listings().length && !loading()" class="list-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>
        </svg>
        <p class="list-empty__title">No mosques found</p>
        <p class="list-empty__sub">Try adjusting your search or filters</p>
      </div>
      <div *ngIf="loading() && !listings().length" class="list-empty">
        <p class="list-empty__sub">Loading listings…</p>
      </div>
    </div>
  `,
  styles: [`
    /* ── Add listing form ── */
    :host ::ng-deep .add-form-card .ui-card {
      background: linear-gradient(160deg, rgba(6,78,59,0.95) 0%, rgba(2,44,34,0.98) 100%);
      border: 1px solid rgba(212,175,55,0.22);
      box-shadow: 0 12px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04);
      padding: 0;
      overflow: hidden;
    }

    .add-form-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
      padding: 1.125rem 1.25rem;
      border-bottom: 1px solid rgba(212,175,55,0.12);
      background: rgba(0,0,0,0.12);
    }
    .add-form-header__main { display: flex; gap: 0.875rem; align-items: flex-start; min-width: 0; }
    .add-form-icon {
      flex-shrink: 0; width: 2.5rem; height: 2.5rem; border-radius: 0.625rem;
      background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.35);
      color: #D4AF37; display: flex; align-items: center; justify-content: center;
    }
    .add-form-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.25rem; }
    .add-form-title { margin: 0; font-size: 1.0625rem; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
    .add-form-sub { margin: 0; font-size: 0.75rem; color: rgba(167,243,208,0.75); line-height: 1.45; }
    .pending-badge {
      font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      color: #93c5fd; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.35);
      padding: 0.2rem 0.5rem; border-radius: 9999px;
    }
    .toggle-btn {
      flex-shrink: 0; display: inline-flex; align-items: center; gap: 0.375rem;
      font-size: 0.75rem; font-weight: 600; color: #D4AF37; background: rgba(212,175,55,0.08);
      border: 1px solid rgba(212,175,55,0.35); border-radius: 0.5rem; padding: 0.5rem 0.875rem; cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
    }
    .toggle-btn:hover { background: rgba(212,175,55,0.16); border-color: rgba(212,175,55,0.55); color: #fcd34d; }

    .add-form-body { padding: 1rem 1.25rem 1.25rem; }

    .form-section {
      margin-bottom: 1.125rem; padding: 1rem;
      background: rgba(2,44,34,0.55); border: 1px solid rgba(16,185,129,0.12);
      border-radius: 0.75rem;
    }
    .form-section--last { margin-bottom: 0.875rem; }
    .form-section__head {
      display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.875rem;
      padding-bottom: 0.75rem; border-bottom: 1px solid rgba(212,175,55,0.1);
    }
    .form-section__num {
      flex-shrink: 0; width: 1.75rem; height: 1.75rem; border-radius: 0.375rem;
      background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.3);
      color: #D4AF37; font-size: 0.6875rem; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
    }
    .form-section__title { margin: 0; font-size: 0.875rem; font-weight: 600; color: #fff; }
    .form-section__hint { margin: 0.15rem 0 0; font-size: 0.6875rem; color: rgba(110,231,183,0.65); }

    .form-grid { display: grid; gap: 0.75rem; grid-template-columns: 1fr; }
    @media (min-width: 640px) { .form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (min-width: 900px) { .form-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    .form-field--full { grid-column: 1 / -1; }

    .form-label {
      display: block; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.04em; color: rgba(212,175,55,0.85); margin-bottom: 0.375rem;
    }
    .req { color: #fca5a5; }
    .field-hint { margin: 0.3rem 0 0; font-size: 0.625rem; color: rgba(110,231,183,0.55); }

    .form-input {
      width: 100%; box-sizing: border-box;
      background: rgba(0,0,0,0.28); border: 1px solid rgba(16,185,129,0.25);
      border-radius: 0.5rem; padding: 0.625rem 0.75rem;
      font-size: 0.8125rem; color: #f0fdf4; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .form-input::placeholder { color: rgba(110,231,183,0.35); }
    .form-input:hover { border-color: rgba(212,175,55,0.35); background: rgba(0,0,0,0.35); }
    .form-input:focus {
      border-color: #D4AF37;
      box-shadow: 0 0 0 3px rgba(212,175,55,0.12);
      background: rgba(0,0,0,0.4);
    }
    .form-textarea { resize: vertical; min-height: 4.5rem; line-height: 1.5; }

    .input-prefix-wrap {
      display: flex; align-items: stretch;
      background: rgba(0,0,0,0.28); border: 1px solid rgba(16,185,129,0.25);
      border-radius: 0.5rem; overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .input-prefix-wrap:focus-within {
      border-color: #D4AF37;
      box-shadow: 0 0 0 3px rgba(212,175,55,0.12);
    }
    .input-prefix {
      display: flex; align-items: center; padding: 0 0.625rem;
      font-size: 0.75rem; color: rgba(212,175,55,0.7); background: rgba(212,175,55,0.06);
      border-right: 1px solid rgba(212,175,55,0.15); white-space: nowrap;
    }
    .form-input--prefixed {
      border: none; border-radius: 0; background: transparent; box-shadow: none;
    }
    .form-input--prefixed:focus { box-shadow: none; }

    .form-alert {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 0.875rem; border-radius: 0.5rem; font-size: 0.75rem; margin-bottom: 0.875rem;
    }
    .form-alert--ok { background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.35); color: #6ee7b7; }
    .form-alert--err { background: rgba(127,29,29,0.25); border: 1px solid rgba(239,68,68,0.4); color: #fecaca; }
    .form-alert__icon {
      flex-shrink: 0; width: 1.125rem; height: 1.125rem; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.625rem; font-weight: 800;
    }
    .form-alert--ok .form-alert__icon { background: rgba(16,185,129,0.3); color: #fff; }
    .form-alert--err .form-alert__icon { background: rgba(239,68,68,0.35); color: #fff; }

    .form-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem;
      padding-top: 0.875rem; border-top: 1px solid rgba(212,175,55,0.1);
    }
    .btn-ghost {
      font-size: 0.8125rem; font-weight: 600; color: rgba(167,243,208,0.85);
      background: transparent; border: 1px solid rgba(16,185,129,0.3);
      border-radius: 0.5rem; padding: 0.625rem 1rem; cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }
    .btn-ghost:hover:not(:disabled) { border-color: rgba(212,175,55,0.4); color: #fcd34d; }
    .btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-create {
      display: inline-flex; align-items: center; gap: 0.5rem;
      font-size: 0.8125rem; font-weight: 700; color: #022c22;
      background: linear-gradient(180deg, #fcd34d 0%, #D4AF37 100%);
      border: 1px solid rgba(212,175,55,0.6); border-radius: 0.5rem;
      padding: 0.625rem 1.25rem; cursor: pointer;
      box-shadow: 0 4px 14px rgba(212,175,55,0.2);
      transition: transform 0.15s, box-shadow 0.2s;
    }
    .btn-create:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(212,175,55,0.3); }
    .btn-create:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

    /* ── Listings toolbar ── */
    :host ::ng-deep .listings-toolbar-card .ui-card {
      background: rgba(2,44,34,0.85);
      border: 1px solid rgba(212,175,55,0.15);
      padding: 1rem 1.125rem;
    }

    .listings-toolbar {
      display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem;
    }
    .search-wrap {
      flex: 1; min-width: 14rem; position: relative;
    }
    .search-icon {
      position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%);
      color: rgba(212,175,55,0.6); pointer-events: none;
    }
    .list-search {
      width: 100%; box-sizing: border-box;
      background: rgba(0,0,0,0.3); border: 1px solid rgba(16,185,129,0.25);
      border-radius: 0.5rem; padding: 0.625rem 0.75rem 0.625rem 2.25rem;
      font-size: 0.8125rem; color: #f0fdf4; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .list-search::placeholder { color: rgba(110,231,183,0.35); }
    .list-search:focus {
      border-color: #D4AF37;
      box-shadow: 0 0 0 3px rgba(212,175,55,0.1);
    }

    .filter-group { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .list-filter {
      background: rgba(0,0,0,0.3); border: 1px solid rgba(16,185,129,0.25);
      border-radius: 0.5rem; padding: 0.625rem 0.75rem;
      font-size: 0.8125rem; color: #ecfdf5; outline: none; cursor: pointer;
      min-width: 9rem;
    }
    .list-filter:focus { border-color: #D4AF37; }

    .dup-chip {
      display: inline-flex; align-items: center; gap: 0.375rem;
      font-size: 0.75rem; font-weight: 600; color: rgba(167,243,208,0.8);
      background: rgba(0,0,0,0.2); border: 1px solid rgba(16,185,129,0.2);
      border-radius: 9999px; padding: 0.5rem 0.875rem; cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
    }
    .dup-chip input { display: none; }
    .dup-chip--on {
      color: #fcd34d; background: rgba(245,158,11,0.12);
      border-color: rgba(245,158,11,0.4);
    }

    .list-summary {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;
    }
    .summary-chip {
      font-size: 0.6875rem; color: rgba(167,243,208,0.75);
      background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2);
      border-radius: 9999px; padding: 0.25rem 0.625rem;
    }
    .summary-chip strong { color: #fff; font-weight: 700; }
    .summary-chip--warn {
      color: #fcd34d; background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3);
    }
    .summary-chip--warn strong { color: #fcd34d; }
    .summary-loading { font-size: 0.6875rem; color: rgba(110,231,183,0.55); font-style: italic; }

    .bulk-bar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;
      margin-top: 0.75rem; padding: 0.75rem;
      background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.25);
      border-radius: 0.5rem;
    }
    .bulk-count { font-size: 0.75rem; font-weight: 600; color: #D4AF37; margin-right: 0.25rem; }
    .bulk-select { min-width: 8rem; padding: 0.375rem 0.5rem; font-size: 0.75rem; }
    .bulk-apply {
      font-size: 0.75rem; font-weight: 700; color: #022c22;
      background: #D4AF37; border: none; border-radius: 0.375rem;
      padding: 0.375rem 0.75rem; cursor: pointer;
    }
    .bulk-apply:disabled { opacity: 0.5; cursor: not-allowed; }
    .bulk-clear {
      font-size: 0.75rem; color: rgba(167,243,208,0.8);
      background: none; border: none; cursor: pointer; text-decoration: underline;
    }

    /* ── Listing cards ── */
    .listings-stack { display: flex; flex-direction: column; gap: 0.625rem; }

    .listing-card {
      display: grid;
      grid-template-columns: auto auto 1fr auto;
      grid-template-rows: auto auto;
      gap: 0 0.75rem;
      align-items: start;
      padding: 0.875rem 1rem;
      background: linear-gradient(135deg, rgba(6,78,59,0.7) 0%, rgba(2,44,34,0.9) 100%);
      border: 1px solid rgba(16,185,129,0.15);
      border-radius: 0.75rem;
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
    }
    .listing-card:hover {
      border-color: rgba(212,175,55,0.3);
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    }
    .listing-card--selected {
      border-color: rgba(212,175,55,0.5);
      box-shadow: 0 0 0 1px rgba(212,175,55,0.2);
    }
    .listing-card--dup {
      border-left: 3px solid #f59e0b;
    }

    .listing-check {
      grid-row: 1 / 3; align-self: center; padding-top: 0.125rem; cursor: pointer;
    }
    .listing-check input { accent-color: #D4AF37; width: 1rem; height: 1rem; cursor: pointer; }

    .listing-avatar {
      grid-row: 1 / 3; align-self: center;
      width: 2.5rem; height: 2.5rem; border-radius: 0.625rem;
      background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.3);
      color: #D4AF37; font-size: 1rem; font-weight: 800;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }

    .listing-body { min-width: 0; grid-column: 3; }
    .listing-top {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 0.75rem; margin-bottom: 0.625rem;
    }
    .listing-info { min-width: 0; }
    .listing-name {
      margin: 0; font-size: 0.9375rem; font-weight: 700; line-height: 1.3;
      display: flex; align-items: center; flex-wrap: wrap; gap: 0.375rem;
    }
    .listing-name a { color: #fff; text-decoration: none; }
    .listing-name a:hover { color: #fcd34d; }

    .dup-badge {
      display: inline-flex; align-items: center; gap: 0.2rem;
      font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
      color: #fcd34d; background: rgba(245,158,11,0.15);
      border: 1px solid rgba(245,158,11,0.35);
      padding: 0.15rem 0.4rem; border-radius: 9999px;
    }

    .listing-location {
      margin: 0.25rem 0 0; font-size: 0.6875rem; color: rgba(110,231,183,0.7);
      display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; line-height: 1.4;
    }
    .listing-location svg { flex-shrink: 0; opacity: 0.7; }
    .listing-addr { opacity: 0.75; }

    .status-pill {
      flex-shrink: 0;
      font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 0.25rem 0.5rem; border-radius: 9999px; border: 1px solid; white-space: nowrap;
    }
    .status--active { color: #6ee7b7; border-color: #047857; background: rgba(16,185,129,0.12); }
    .status--claimed { color: #fcd34d; border-color: rgba(245,158,11,0.45); background: rgba(120,53,15,0.2); }
    .status--unclaimed { color: #94a3b8; border-color: #475569; background: rgba(71,85,105,0.15); }
    .status--pending { color: #93c5fd; border-color: rgba(59,130,246,0.45); background: rgba(59,130,246,0.1); }
    .status--suspended { color: #fca5a5; border-color: rgba(239,68,68,0.45); background: rgba(127,29,29,0.2); }
    .status--archived { color: #a8a29e; border-color: #57534e; background: rgba(41,37,36,0.3); }

    .listing-meta {
      display: flex; flex-wrap: wrap; gap: 0.375rem 0.75rem;
    }
    .meta-item {
      display: inline-flex; align-items: baseline; gap: 0.3rem;
      background: rgba(0,0,0,0.2); border: 1px solid rgba(16,185,129,0.12);
      border-radius: 0.375rem; padding: 0.2rem 0.5rem;
    }
    .meta-label {
      font-size: 0.5625rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.04em; color: rgba(212,175,55,0.7);
    }
    .meta-value {
      font-size: 0.75rem; color: #ecfdf5; font-weight: 500;
    }
    .meta-value--num { color: #D4AF37; font-weight: 700; }

    .listing-actions {
      grid-column: 4; grid-row: 1 / 3; align-self: center;
      display: flex; flex-direction: column; gap: 0.375rem;
    }
    .action-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem;
      font-size: 0.6875rem; font-weight: 600; text-decoration: none;
      border-radius: 0.375rem; padding: 0.375rem 0.625rem; white-space: nowrap;
      border: 1px solid; transition: background 0.2s, color 0.2s, border-color 0.2s;
    }
    .action-btn--view {
      color: #D4AF37; background: rgba(212,175,55,0.08); border-color: rgba(212,175,55,0.3);
    }
    .action-btn--view:hover { background: rgba(212,175,55,0.18); color: #fcd34d; }
    .action-btn--edit {
      color: rgba(167,243,208,0.9); background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.25);
    }
    .action-btn--edit:hover { background: rgba(16,185,129,0.15); color: #fff; }
    .action-btn--claim {
      color: #fca5a5; background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3);
    }
    .action-btn--claim:hover { background: rgba(239,68,68,0.15); }

    .list-empty {
      text-align: center; padding: 2.5rem 1rem;
      background: rgba(2,44,34,0.5); border: 1px dashed rgba(16,185,129,0.25);
      border-radius: 0.75rem; color: rgba(110,231,183,0.5);
    }
    .list-empty__title { margin: 0.75rem 0 0.25rem; font-size: 0.9375rem; font-weight: 600; color: #fff; }
    .list-empty__sub { margin: 0; font-size: 0.75rem; color: rgba(110,231,183,0.6); }

    @media (max-width: 768px) {
      .listing-card {
        grid-template-columns: auto 1fr;
        grid-template-rows: auto auto auto;
      }
      .listing-check { grid-row: 1; }
      .listing-avatar { display: none; }
      .listing-body { grid-column: 2; }
      .listing-actions {
        grid-column: 1 / -1; grid-row: 3;
        flex-direction: row; flex-wrap: wrap; margin-top: 0.5rem;
        padding-top: 0.625rem; border-top: 1px solid rgba(212,175,55,0.1);
      }
      .listing-top { flex-direction: column; gap: 0.5rem; }
    }
  `]
})
export class SuperMosquesComponent implements OnInit {
  private platform = inject(PlatformService);

  readonly statuses = MOSQUE_STATUSES;
  readonly formatStatus = formatMosqueStatus;
  readonly statusClass = statusClass;

  listings = signal<MosqueListing[]>([]);
  duplicateCount = signal(0);
  selectedIds = signal<Set<number>>(new Set());
  loading = signal(false);
  saving = signal(false);
  bulkLoading = signal(false);
  showForm = signal(true);
  msg = signal('');
  msgOk = signal(true);

  search = '';
  statusFilter = '';
  duplicatesOnly = false;
  bulkStatus = '';
  private searchTimer?: ReturnType<typeof setTimeout>;

  form = {
    name: '', slug: '', city: 'Bradford', postcode: '', address: '', description: '',
    phone: '', email: '', website: '', mapLocation: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  };

  ngOnInit(): void { this.load(); }

  onFilterChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 300);
  }

  load(): void {
    this.loading.set(true);
    this.platform.getMosqueListings({
      q: this.search.trim() || undefined,
      status: this.statusFilter || undefined,
      duplicatesOnly: this.duplicatesOnly,
    }).subscribe({
      next: res => {
        this.listings.set(res.items);
        this.duplicateCount.set(res.duplicateCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  autoSlug(): void {
    if (this.form.slug || !this.form.name) return;
    this.form.slug = this.form.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  resetForm(): void {
    this.form = {
      name: '', slug: '', city: 'Bradford', postcode: '', address: '', description: '',
      phone: '', email: '', website: '', mapLocation: '',
      latitude: undefined, longitude: undefined,
    };
    this.msg.set('');
  }

  seed(): void {
    if (!this.form.name || !this.form.slug) {
      this.msg.set('Name and slug are required.');
      this.msgOk.set(false);
      return;
    }
    this.saving.set(true);
    this.platform.seedMosque({
      ...this.form,
      country: 'United Kingdom',
      timezone: 'Europe/London',
      status: 'PendingReview',
    }).subscribe({
      next: () => {
        this.msg.set('Listing created — pending review.');
        this.msgOk.set(true);
        this.form = {
          name: '', slug: '', city: 'Bradford', postcode: '', address: '', description: '',
          phone: '', email: '', website: '', mapLocation: '',
          latitude: undefined, longitude: undefined,
        };
        this.saving.set(false);
        this.load();
      },
      error: () => {
        this.msg.set('Could not create listing — check the slug is unique.');
        this.msgOk.set(false);
        this.saving.set(false);
      },
    });
  }

  toggleSelect(id: number): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.selectedIds.set(next);
  }

  clearSelection(): void { this.selectedIds.set(new Set()); }

  applyBulk(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length || !this.bulkStatus) return;
    this.bulkLoading.set(true);
    this.platform.bulkMosqueStatus(ids, this.bulkStatus).subscribe({
      next: () => {
        this.bulkLoading.set(false);
        this.clearSelection();
        this.bulkStatus = '';
        this.load();
      },
      error: () => this.bulkLoading.set(false),
    });
  }
}
