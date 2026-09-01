import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { MosqueService } from '../../core/services/mosque.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { MosqueEvent } from '../../core/models';
import { formatTime12 } from '../../core/utils/prayer.utils';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Member" title="Events" subtitle="Mosque gatherings and programmes" />

    <div class="member-events-toolbar">
      <input class="member-events-search" type="search" [(ngModel)]="search"
        (ngModelChange)="onFilterChange()" placeholder="Search events…" />
      <select class="member-events-select" [(ngModel)]="eventType" (ngModelChange)="onFilterChange()">
        <option value="">All types</option>
        <option *ngFor="let t of eventTypes" [value]="t">{{ t }}</option>
      </select>
      <button type="button" class="member-chip" [class.member-chip--on]="upcomingOnly()"
        (click)="toggleUpcoming()">
        {{ upcomingOnly() ? 'Upcoming only' : 'All events' }}
      </button>
    </div>

    <div *ngIf="loading()" class="member-loading">Loading events…</div>

    <p *ngIf="!loading() && !items().length" class="member-events-empty">
      No events match your filters.
    </p>

    <article *ngFor="let e of items()" class="member-events-card">
      <div class="member-events-date">
        <p class="member-events-date__mon">{{ e.date | date:'MMM' }}</p>
        <p class="member-events-date__day">{{ e.date | date:'d' }}</p>
      </div>
      <div class="flex-1 min-w-0">
        <div class="member-chips" style="margin-bottom: 0.35rem;">
          <span class="member-tag">{{ e.eventType }}</span>
          <span *ngIf="isRegistered(e.id)" class="member-chip member-chip--on" style="cursor: default;">Registered</span>
        </div>
        <h3 class="member-title">{{ e.title }}</h3>
        <p class="member-meta">{{ formatTime(e.startTime) }} · {{ e.location }}</p>
        <p class="member-desc" style="margin-top: 0.5rem;">{{ e.description }}</p>
        <div class="member-actions" style="margin-top: 0.75rem;" *ngIf="auth.isAuthenticated()">
          <button *ngIf="!isRegistered(e.id)" type="button" class="member-btn-primary"
            [disabled]="busyId() === e.id" (click)="register(e.id)">
            {{ busyId() === e.id ? 'Saving…' : 'Register' }}
          </button>
          <button *ngIf="isRegistered(e.id)" type="button" class="member-btn-secondary"
            [disabled]="busyId() === e.id" (click)="cancel(e.id)">
            Cancel registration
          </button>
        </div>
        <p *ngIf="!auth.isAuthenticated()" class="member-hint" style="margin-top: 0.5rem;">
          Log in to register for this event.
        </p>
      </div>
    </article>
  `,
})
export class EventsComponent implements OnInit {
  private mosqueService = inject(MosqueService);
  private mosqueContext = inject(MosqueContextService);
  auth = inject(AuthService);

  items = signal<MosqueEvent[]>([]);
  registeredIds = signal<Set<number>>(new Set());
  loading = signal(true);
  busyId = signal<number | null>(null);
  search = '';
  eventType = '';
  upcomingOnly = signal(true);
  mosqueId = signal(0);

  eventTypes = ['General', 'Mawlid', 'Dhikr', 'Class', 'Jumuah', 'Other'];
  formatTime = formatTime12;

  ngOnInit(): void {
    this.mosqueContext.resolve().then(id => {
      this.mosqueId.set(id);
      this.load();
      if (this.auth.isAuthenticated()) this.loadRegistrations();
    });
  }

  isRegistered(eventId: number): boolean {
    return this.registeredIds().has(eventId);
  }

  onFilterChange(): void { this.load(); }

  toggleUpcoming(): void {
    this.upcomingOnly.update(v => !v);
    this.load();
  }

  register(eventId: number): void {
    this.busyId.set(eventId);
    this.mosqueService.registerForEvent(this.mosqueId(), eventId).subscribe({
      next: () => {
        this.busyId.set(null);
        this.registeredIds.update(s => new Set([...s, eventId]));
      },
      error: () => this.busyId.set(null),
    });
  }

  cancel(eventId: number): void {
    this.busyId.set(eventId);
    this.mosqueService.cancelEventRegistration(this.mosqueId(), eventId).subscribe({
      next: () => {
        this.busyId.set(null);
        this.registeredIds.update(s => {
          const next = new Set(s);
          next.delete(eventId);
          return next;
        });
      },
      error: () => this.busyId.set(null),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.mosqueService.getEvents(
      this.mosqueId(), this.search || undefined, this.eventType || undefined, this.upcomingOnly()
    ).subscribe({
      next: e => { this.items.set(e); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private loadRegistrations(): void {
    this.mosqueService.getMyEventRegistrations(this.mosqueId()).subscribe({
      next: ids => this.registeredIds.set(new Set(ids)),
      error: () => {},
    });
  }
}
