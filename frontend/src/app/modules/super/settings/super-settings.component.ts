import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ContentService } from '../../../core/services/content.service';
import { environment } from '../../../../environments/environment';

interface SocialProviders {
  google?: boolean;
  facebook?: boolean;
  devMode?: boolean;
}

@Component({
  selector: 'app-super-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="set-page">
      <header class="set-header">
        <p class="set-badge">System</p>
        <h1 class="set-title">Platform settings</h1>
      </header>

      <article class="set-card">
        <h2 class="set-card-title">Default tariqa content mapping (new mosques)</h2>
        <div class="set-grid">
          <div class="set-field">
            <label>Ba'alawi default</label>
            <select class="set-input" [(ngModel)]="baAlawiDefault">
              <option value="">— Select collection —</option>
              <option *ngFor="let c of baAlawiCollections()" [value]="c.name">{{ c.name }}</option>
            </select>
          </div>
          <div class="set-field">
            <label>Shadhili default</label>
            <select class="set-input" [(ngModel)]="shadhiliDefault">
              <option value="">— Select collection —</option>
              <option *ngFor="let c of shadhiliCollections()" [value]="c.name">{{ c.name }}</option>
            </select>
          </div>
        </div>
        <button type="button" class="set-btn" (click)="saveTariqaMapping()">Save mapping</button>
      </article>

      <article class="set-card">
        <h2 class="set-card-title">Global banner / maintenance notice</h2>
        <textarea class="set-textarea" rows="3" placeholder="e.g. Scheduled maintenance on Sunday 2–4am"
          [(ngModel)]="bannerText"></textarea>
        <div class="set-actions">
          <button type="button" class="set-btn" (click)="saveBanner()">Save banner</button>
        </div>
      </article>

      <article class="set-card">
        <h2 class="set-card-title">API & integrations</h2>
        <dl class="set-dl">
          <div><dt>API URL</dt><dd>{{ apiUrl }}</dd></div>
          <div><dt>Default mosque ID</dt><dd>{{ defaultMosqueId }}</dd></div>
          <div><dt>Google login</dt><dd>{{ providers()?.google ? 'Configured' : 'Not configured' }}</dd></div>
          <div><dt>Facebook login</dt><dd>{{ providers()?.facebook ? 'Configured' : 'Not configured' }}</dd></div>
        </dl>
      </article>
    </div>
  `,
  styles: [`
    .set-page { display: flex; flex-direction: column; gap: 1rem; }
    .set-badge { margin: 0 0 0.25rem; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #fbbf24; }
    .set-title { margin: 0; font-size: 1.125rem; font-weight: 600; color: #fff; }
    .set-card { background: #064e3b; border: 1px solid #065f46; border-radius: 0.75rem; padding: 1rem 1.125rem; }
    .set-card-title { margin: 0 0 0.75rem; font-size: 0.9375rem; font-weight: 600; color: #fff; }
    .set-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
    @media (max-width: 640px) { .set-grid { grid-template-columns: 1fr; } }
    .set-field label { display: block; font-size: 0.75rem; color: #6ee7b7; margin-bottom: 0.25rem; }
    .set-input, .set-textarea {
      width: 100%; background: #022c22; border: 1px solid #065f46; border-radius: 0.5rem;
      padding: 0.5rem 0.75rem; color: #fff; font-size: 0.875rem;
    }
    .set-textarea { resize: vertical; min-height: 4rem; }
    .set-actions { display: flex; justify-content: flex-end; margin-top: 0.5rem; }
    .set-btn {
      background: #f59e0b; color: #022c22; font-weight: 700; font-size: 0.8125rem;
      padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; cursor: pointer;
    }
    .set-dl { margin: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.8125rem; }
    .set-dl div { display: flex; justify-content: space-between; gap: 1rem; }
    .set-dl dt { color: #6ee7b7; }
    .set-dl dd { margin: 0; color: #fff; text-align: right; word-break: break-all; }
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
  }

  saveBanner(): void {
    localStorage.setItem('mosqueos.platformBanner', this.bannerText);
  }
}
