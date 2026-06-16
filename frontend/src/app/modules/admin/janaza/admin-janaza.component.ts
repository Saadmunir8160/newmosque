import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { environment } from '../../../../environments/environment';
import { JanazaAnnouncement } from '../../../core/models';

@Component({
  selector: 'app-admin-janaza',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Janaza Announcements"
      subtitle="Respectful death and funeral notices for the community." />

    <div class="janaza-layout">
      <aside class="aside">
        <section class="panel">
          <div class="panel__head">
            <span class="panel__icon">🕊️</span>
            <div>
              <h3 class="panel__title">Post announcement</h3>
              <p class="panel__sub">Share janaza details with the congregation</p>
            </div>
          </div>

          <div class="field">
            <label class="label" for="j-name">Name of deceased <span class="req">*</span></label>
            <input id="j-name" class="input" placeholder="Full name" [(ngModel)]="form.name">
          </div>
          <div class="field-row">
            <div class="field">
              <label class="label" for="j-date">Janaza date</label>
              <input id="j-date" class="input" type="date" [(ngModel)]="form.janazaDate">
            </div>
            <div class="field">
              <label class="label" for="j-time">Time</label>
              <input id="j-time" class="input" type="time" [(ngModel)]="form.janazaTime">
            </div>
          </div>
          <div class="field">
            <label class="label" for="j-loc">Location</label>
            <input id="j-loc" class="input" placeholder="Masjid or venue" [(ngModel)]="form.location">
          </div>
          <div class="field">
            <label class="label" for="j-burial">Burial location</label>
            <input id="j-burial" class="input" placeholder="Cemetery name" [(ngModel)]="form.burialLocation">
          </div>

          <button type="button" class="btn-post" (click)="create()" [disabled]="saving() || !form.name.trim()">
            {{ saving() ? 'Posting…' : 'Post janaza' }}
          </button>
          <p *ngIf="msg()" class="form-msg" [class.form-msg--err]="msgErr()">{{ msg() }}</p>
        </section>

        <div class="stat-box">
          <span class="stat-val">{{ items().length }}</span>
          <span class="stat-lbl">Announcements</span>
        </div>
      </aside>

      <main class="main">
        <h3 class="list-title">Recent notices ({{ items().length }})</h3>

        <div *ngIf="loading()" class="loading">Loading…</div>
        <div *ngIf="!loading() && !items().length" class="empty">
          <span class="empty__icon">🕊️</span>
          <p>No janaza announcements yet.</p>
        </div>

        <div *ngIf="!loading() && items().length" class="janaza-list">
          <article *ngFor="let j of items()" class="janaza-card">
            <div class="janaza-card__bar"></div>
            <div class="janaza-card__body">
              <h4 class="janaza-name">{{ j.name }}</h4>
              <div class="janaza-meta">
                <span class="meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {{ j.janazaDate }}
                </span>
                <span class="meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {{ formatTime(j.janazaTime) }}
                </span>
              </div>
              <p *ngIf="j.location" class="janaza-loc">{{ j.location }}</p>
              <p *ngIf="j.burialLocation" class="janaza-burial">Burial: {{ j.burialLocation }}</p>
            </div>
          </article>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .janaza-layout { display: grid; gap: 1rem; grid-template-columns: 1fr; }
    @media (min-width: 900px) { .janaza-layout { grid-template-columns: minmax(280px, 300px) 1fr; align-items: start; } }

    .panel {
      padding: 1rem; margin-bottom: 0.75rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.9), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.22); border-radius: 0.75rem;
    }
    .panel__head { display: flex; gap: 0.625rem; align-items: center; margin-bottom: 1rem;
      padding-bottom: 0.75rem; border-bottom: 1px solid rgba(212,175,55,0.1); }
    .panel__icon { font-size: 1.25rem; }
    .panel__title { margin: 0; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .panel__sub { margin: 0.1rem 0 0; font-size: 0.6875rem; color: rgba(167,243,208,0.6); }

    .field { margin-bottom: 0.75rem; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .label { display: block; margin-bottom: 0.35rem; font-size: 0.625rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.04em; color: rgba(212,175,55,0.85); }
    .req { color: #fca5a5; }
    .input { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.35);
      border: 1px solid rgba(16,185,129,0.22); border-radius: 0.5rem; padding: 0.55rem 0.65rem;
      font-size: 0.8125rem; color: #fff; outline: none; color-scheme: dark; }
    .input:focus { border-color: #D4AF37; }

    .btn-post {
      width: 100%; font-size: 0.8125rem; font-weight: 700; color: #022c22;
      background: linear-gradient(180deg, #fcd34d, #D4AF37); border: none;
      border-radius: 0.5rem; padding: 0.65rem; cursor: pointer;
    }
    .btn-post:disabled { opacity: 0.5; cursor: not-allowed; }
    .form-msg { margin: 0.5rem 0 0; font-size: 0.6875rem; color: #6ee7b7; }
    .form-msg--err { color: #fecaca; }

    .stat-box {
      text-align: center; padding: 0.75rem;
      background: rgba(2,44,34,0.8); border: 1px solid rgba(16,185,129,0.15); border-radius: 0.5rem;
    }
    .stat-val { display: block; font-size: 1.25rem; font-weight: 800; color: #fff; }
    .stat-lbl { font-size: 0.5625rem; text-transform: uppercase; color: rgba(167,243,208,0.6); }

    .list-title { margin: 0 0 0.875rem; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .loading, .empty { font-size: 0.8125rem; color: rgba(167,243,208,0.6); padding: 2rem; text-align: center;
      border: 1px dashed rgba(100,116,139,0.3); border-radius: 0.75rem; }
    .empty__icon { font-size: 1.75rem; display: block; margin-bottom: 0.5rem; }

    .janaza-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .janaza-card {
      display: flex; background: linear-gradient(135deg, rgba(30,41,59,0.4), rgba(2,44,34,0.9));
      border: 1px solid rgba(100,116,139,0.25); border-radius: 0.625rem; overflow: hidden;
    }
    .janaza-card__bar { width: 3px; background: linear-gradient(180deg, #94a3b8, #64748b); flex-shrink: 0; }
    .janaza-card__body { padding: 0.875rem 1rem; flex: 1; }
    .janaza-name { margin: 0 0 0.5rem; font-size: 0.9375rem; font-weight: 700; color: #f1f5f9; }
    .janaza-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.35rem; }
    .meta-item { display: inline-flex; align-items: center; gap: 0.3rem;
      font-size: 0.6875rem; color: rgba(203,213,225,0.8); }
    .janaza-loc { margin: 0; font-size: 0.75rem; color: rgba(167,243,208,0.75); }
    .janaza-burial { margin: 0.25rem 0 0; font-size: 0.6875rem; color: rgba(148,163,184,0.7); font-style: italic; }
  `]
})
export class AdminJanazaComponent implements OnInit {
  private admin = inject(AdminService);
  private mosque = inject(MosqueService);
  items = signal<JanazaAnnouncement[]>([]);
  loading = signal(true);
  saving = signal(false);
  msg = signal('');
  msgErr = signal(false);
  form = { name: '', janazaDate: '', janazaTime: '13:30', location: '', burialLocation: '', dateOfDeath: '' };
  mid = environment.defaultMosqueId;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.mosque.getJanaza(this.mid).subscribe({
      next: j => { this.items.set(j); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  formatTime(t: string): string {
    if (!t) return '—';
    const parts = t.split(':');
    if (parts.length < 2) return t;
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }

  create(): void {
    if (!this.form.name.trim()) return;
    this.saving.set(true);
    this.msg.set('');
    const data = { ...this.form, dateOfDeath: this.form.janazaDate, janazaTime: this.form.janazaTime + ':00' };
    this.admin.createJanaza(this.mid, data).subscribe({
      next: () => {
        this.form = { name: '', janazaDate: '', janazaTime: '13:30', location: '', burialLocation: '', dateOfDeath: '' };
        this.saving.set(false);
        this.msgErr.set(false);
        this.msg.set('Janaza posted.');
        this.load();
      },
      error: () => { this.saving.set(false); this.msgErr.set(true); this.msg.set('Could not post.'); },
    });
  }
}
