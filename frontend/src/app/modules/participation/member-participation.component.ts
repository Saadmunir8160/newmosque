import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { MosqueService } from '../../core/services/mosque.service';
import { ParticipationOpportunity } from '../../core/models';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-member-participation',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header [useAuthRole]="true" title="Participation"
      subtitle="Browse and register for volunteering, classes, and mosque events." />

    <p *ngIf="msg()" class="toast" [class.toast--err]="msgErr()">{{ msg() }}</p>

    <div *ngIf="loading()" class="loading">Loading opportunities…</div>
    <div *ngIf="!loading() && !items().length" class="empty">No participation opportunities right now.</div>

    <article *ngFor="let p of items()" class="card">
      <div class="card__main">
        <div class="card__tags">
          <span class="type-tag">{{ p.type }}</span>
          <span *ngIf="p.date" class="date-tag">{{ p.date | date:'mediumDate' }}</span>
        </div>
        <h3 class="card__title">{{ p.title }}</h3>
        <p class="card__desc">{{ p.description || 'Details to be announced.' }}</p>
      </div>
      <button type="button" class="btn-register" [class.btn-register--done]="isRegistered(p.id)"
        [disabled]="busyId() === p.id || isRegistered(p.id)" (click)="register(p)">
        {{ isRegistered(p.id) ? '✓ Registered' : (busyId() === p.id ? 'Registering…' : 'Register') }}
      </button>
    </article>
  `,
  styles: [`
    .toast { margin-bottom: 0.75rem; font-size: 0.8125rem; color: #6ee7b7; }
    .toast--err { color: #fecaca; }
    .loading, .empty {
      padding: 1.5rem; text-align: center; color: rgba(167,243,208,0.7);
      border: 1px dashed rgba(212,175,55,0.25); border-radius: 0.75rem;
    }
    .card {
      display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: flex-start;
      margin-bottom: 0.875rem; padding: 1rem 1.125rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.95), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.22); border-radius: 0.75rem;
    }
    .card__tags { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.35rem; }
    .type-tag {
      font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      color: #fcd34d; background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.28);
      padding: 0.15rem 0.45rem; border-radius: 9999px;
    }
    .date-tag { font-size: 0.6875rem; color: rgba(167,243,208,0.75); }
    .card__title { margin: 0; font-size: 1rem; font-weight: 700; color: #fff; }
    .card__desc { margin: 0.4rem 0 0; font-size: 0.8125rem; line-height: 1.55; color: rgba(167,243,208,0.85); max-width: 36rem; }
    .btn-register {
      font-size: 0.8125rem; font-weight: 700; color: #0F172A;
      background: linear-gradient(180deg, #fcd34d, #D4AF37); border: none;
      border-radius: 0.5rem; padding: 0.5rem 1rem; cursor: pointer; white-space: nowrap;
    }
    .btn-register--done { background: rgba(110,231,183,0.2); color: #6ee7b7; border: 1px solid rgba(110,231,183,0.4); }
    .btn-register:disabled { opacity: 0.7; cursor: default; }
  `]
})
export class MemberParticipationComponent implements OnInit {
  private mosque = inject(MosqueService);
  items = signal<ParticipationOpportunity[]>([]);
  registered = signal<Set<number>>(new Set());
  loading = signal(true);
  busyId = signal<number | null>(null);
  msg = signal('');
  msgErr = signal(false);
  private mosqueId = environment.defaultMosqueId;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.mosque.getParticipation(this.mosqueId).subscribe({
      next: v => { this.items.set(v); this.loading.set(false); },
      error: () => { this.loading.set(false); this.showErr('Could not load opportunities.'); },
    });
    this.mosque.getMyParticipationIds(this.mosqueId).subscribe({
      next: ids => this.registered.set(new Set(ids)),
      error: () => { /* guest or not logged in */ },
    });
  }

  isRegistered(id: number): boolean {
    return this.registered().has(id);
  }

  register(p: ParticipationOpportunity): void {
    if (this.isRegistered(p.id)) return;
    this.busyId.set(p.id);
    this.msg.set('');
    this.mosque.registerParticipation(this.mosqueId, p.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.registered.update(s => new Set([...s, p.id]));
        this.msgErr.set(false);
        this.msg.set(`Registered for "${p.title}".`);
      },
      error: err => {
        this.busyId.set(null);
        if (err.status === 409) {
          this.registered.update(s => new Set([...s, p.id]));
          this.msgErr.set(false);
          this.msg.set('You are already registered.');
        } else {
          this.showErr('Could not register. Log in and try again.');
        }
      },
    });
  }

  private showErr(text: string): void {
    this.msgErr.set(true);
    this.msg.set(text);
  }
}
