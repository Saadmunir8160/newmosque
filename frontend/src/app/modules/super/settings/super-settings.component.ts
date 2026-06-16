import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ContentService } from '../../../core/services/content.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { environment } from '../../../../environments/environment';

interface SocialProviders {
  google?: boolean;
  facebook?: boolean;
  devMode?: boolean;
}

@Component({
  selector: 'app-super-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header badge="System" title="Platform settings"
      subtitle="Configure tariqa defaults, maintenance banner, and view integrations." />

    <div class="settings-grid">
      <article class="set-card">
        <div class="set-card__head">
          <span class="set-icon">📿</span>
          <div>
            <h2 class="set-card__title">Default tariqa content mapping</h2>
            <p class="set-card__sub">Default wird collections for new mosques</p>
          </div>
        </div>
        <div class="set-grid-fields">
          <div class="set-field">
            <label class="set-label">Ba'Alawi default</label>
            <select class="set-select" [(ngModel)]="baAlawiDefault">
              <option value="">— Select collection —</option>
              <option *ngFor="let c of baAlawiCollections()" [value]="c.name">{{ c.name }}</option>
            </select>
          </div>
          <div class="set-field">
            <label class="set-label">Shadhili default</label>
            <select class="set-select" [(ngModel)]="shadhiliDefault">
              <option value="">— Select collection —</option>
              <option *ngFor="let c of shadhiliCollections()" [value]="c.name">{{ c.name }}</option>
            </select>
          </div>
        </div>
        <div class="set-actions">
          <span *ngIf="mapMsg()" class="set-toast">{{ mapMsg() }}</span>
          <button type="button" class="btn-gold" (click)="saveTariqaMapping()">Save mapping</button>
        </div>
      </article>

      <article class="set-card">
        <div class="set-card__head">
          <span class="set-icon">📢</span>
          <div>
            <h2 class="set-card__title">Global banner</h2>
            <p class="set-card__sub">Maintenance or platform-wide notice</p>
          </div>
        </div>
        <textarea class="set-textarea" rows="3" placeholder="e.g. Scheduled maintenance on Sunday 2–4am"
          [(ngModel)]="bannerText"></textarea>
        <div class="set-actions">
          <span *ngIf="bannerMsg()" class="set-toast">{{ bannerMsg() }}</span>
          <button type="button" class="btn-gold" (click)="saveBanner()">Save banner</button>
        </div>
      </article>

      <article class="set-card set-card--wide">
        <div class="set-card__head">
          <span class="set-icon">🔌</span>
          <div>
            <h2 class="set-card__title">API & integrations</h2>
            <p class="set-card__sub">Read-only platform configuration</p>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">API URL</span>
            <span class="info-value info-value--mono">{{ apiUrl }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Default mosque ID</span>
            <span class="info-value">{{ defaultMosqueId }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Google login</span>
            <span class="info-value">
              <span class="status-dot" [class.status-dot--ok]="providers()?.google"></span>
              {{ providers()?.google ? 'Configured' : 'Not configured' }}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Facebook login</span>
            <span class="info-value">
              <span class="status-dot" [class.status-dot--ok]="providers()?.facebook"></span>
              {{ providers()?.facebook ? 'Configured' : 'Not configured' }}
            </span>
          </div>
        </div>
      </article>
    </div>
  `,
  styles: [`
    .settings-grid { display: grid; gap: 0.875rem; grid-template-columns: 1fr; }
    @media (min-width: 768px) { .settings-grid { grid-template-columns: repeat(2, 1fr); } }
    .set-card--wide { grid-column: 1 / -1; }

    .set-card {
      padding: 1rem 1.125rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.9), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.22); border-radius: 0.75rem;
      box-shadow: 0 6px 24px rgba(0,0,0,0.15);
    }
    .set-card__head {
      display: flex; gap: 0.75rem; align-items: flex-start; margin-bottom: 1rem;
      padding-bottom: 0.75rem; border-bottom: 1px solid rgba(212,175,55,0.1);
    }
    .set-icon { font-size: 1.25rem; line-height: 1; flex-shrink: 0; }
    .set-card__title { margin: 0; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .set-card__sub { margin: 0.15rem 0 0; font-size: 0.6875rem; color: rgba(167,243,208,0.65); }

    .set-grid-fields { display: grid; gap: 0.75rem; grid-template-columns: 1fr; }
    @media (min-width: 480px) { .set-grid-fields { grid-template-columns: 1fr 1fr; } }
    .set-label {
      display: block; margin-bottom: 0.35rem; font-size: 0.625rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.04em; color: rgba(212,175,55,0.85);
    }
    .set-select, .set-textarea {
      width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.35);
      border: 1px solid rgba(212,175,55,0.25); border-radius: 0.5rem;
      padding: 0.55rem 0.65rem; font-size: 0.8125rem; color: #fff; outline: none;
      color-scheme: dark;
    }
    .set-select:focus, .set-textarea:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
    .set-textarea { resize: vertical; min-height: 4.5rem; margin-bottom: 0.5rem; }

    .set-actions {
      display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; margin-top: 0.75rem;
    }
    .set-toast { font-size: 0.6875rem; color: #6ee7b7; margin-right: auto; }
    .btn-gold {
      font-size: 0.75rem; font-weight: 700; color: #022c22;
      background: linear-gradient(180deg, #fcd34d, #D4AF37);
      border: 1px solid rgba(212,175,55,0.55); border-radius: 0.5rem;
      padding: 0.5rem 1rem; cursor: pointer; white-space: nowrap;
    }

    .info-grid { display: grid; gap: 0.5rem; }
    @media (min-width: 640px) { .info-grid { grid-template-columns: repeat(2, 1fr); } }
    .info-item {
      display: flex; flex-direction: column; gap: 0.2rem;
      padding: 0.625rem 0.75rem; background: rgba(0,0,0,0.25);
      border: 1px solid rgba(16,185,129,0.12); border-radius: 0.5rem;
    }
    .info-label { font-size: 0.5625rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.04em; color: rgba(212,175,55,0.7); }
    .info-value { font-size: 0.8125rem; color: #ecfdf5; font-weight: 500;
      display: flex; align-items: center; gap: 0.4rem; }
    .info-value--mono { font-family: ui-monospace, monospace; font-size: 0.75rem; word-break: break-all; }
    .status-dot {
      width: 0.5rem; height: 0.5rem; border-radius: 50%; background: rgba(239,68,68,0.6); flex-shrink: 0;
    }
    .status-dot--ok { background: #10b981; }
  `]
})
export class SuperSettingsComponent {
  private http = inject(HttpClient);
  private content = inject(ContentService);

  apiUrl = environment.apiUrl;
  defaultMosqueId = environment.defaultMosqueId;
  providers = signal<SocialProviders | null>(null);
  baAlawiCollections = signal<{ name: string }[]>([]);
  shadhiliCollections = signal<{ name: string }[]>([]);
  baAlawiDefault = localStorage.getItem('mosqueos.tariqa.baalawi') ?? '';
  shadhiliDefault = localStorage.getItem('mosqueos.tariqa.shadhili') ?? '';
  bannerText = localStorage.getItem('mosqueos.platformBanner') ?? '';
  mapMsg = signal('');
  bannerMsg = signal('');

  constructor() {
    this.content.getCollections().subscribe(list => {
      this.baAlawiCollections.set(list.filter(c => c.tariqa === 'BaAlawi'));
      this.shadhiliCollections.set(list.filter(c => c.tariqa === 'Shadhili'));
    });
    this.http.get<SocialProviders>(`${environment.apiUrl}/auth/external/providers`).subscribe({
      next: p => this.providers.set(p),
      error: () => this.providers.set({ google: false, facebook: false, devMode: false }),
    });
  }

  saveTariqaMapping(): void {
    localStorage.setItem('mosqueos.tariqa.baalawi', this.baAlawiDefault);
    localStorage.setItem('mosqueos.tariqa.shadhili', this.shadhiliDefault);
    this.mapMsg.set('Mapping saved.');
    setTimeout(() => this.mapMsg.set(''), 2500);
  }

  saveBanner(): void {
    localStorage.setItem('mosqueos.platformBanner', this.bannerText);
    this.bannerMsg.set('Banner saved.');
    setTimeout(() => this.bannerMsg.set(''), 2500);
  }
}
