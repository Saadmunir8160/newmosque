import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { MosqueService } from '../../core/services/mosque.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { MosqueEvent } from '../../core/models';
import { formatTime12 } from '../../core/utils/prayer.utils';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatCardModule, MatChipsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="w-full max-w-4xl mx-auto">
      <h2 class="heading-page mb-4 sm:mb-6">Events</h2>

      <div class="flex flex-wrap gap-3 mb-6 items-end">
        <mat-form-field appearance="outline" class="flex-1 min-w-[200px] events-field">
          <mat-label>Search events</mat-label>
          <input matInput [(ngModel)]="search" (ngModelChange)="onFilterChange()" placeholder="Title, location…" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-40 events-field">
          <mat-label>Type</mat-label>
          <mat-select [(ngModel)]="eventType" (ngModelChange)="onFilterChange()">
            <mat-option value="">All types</mat-option>
            <mat-option *ngFor="let t of eventTypes" [value]="t">{{ t }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-chip-set>
          <mat-chip [highlighted]="upcomingOnly()" (click)="toggleUpcoming()">
            {{ upcomingOnly() ? 'Upcoming only' : 'All events' }}
          </mat-chip>
        </mat-chip-set>
      </div>

      <div *ngIf="loading()" class="flex justify-center py-12">
        <mat-spinner diameter="40" />
      </div>

      <p *ngIf="!loading() && !items().length" class="text-mos-muted/80 text-center py-8">
        No events match your filters.
      </p>

      <div class="space-y-4" *ngIf="!loading()">
        <mat-card *ngFor="let e of items()" class="events-card">
          <div class="flex gap-3 sm:gap-4 flex-col sm:flex-row">
            <div class="bg-slate-100 rounded-xl p-3 sm:p-4 text-center min-w-[64px] sm:min-w-[80px] h-fit shrink-0 self-start">
              <p class="text-mos-accent text-xs sm:text-sm font-bold">{{ e.date | date:'MMM' }}</p>
              <p class="text-2xl sm:text-4xl font-bold text-white">{{ e.date | date:'d' }}</p>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm bg-amber-400/20 text-mos-accent px-2 py-0.5 rounded uppercase">{{ e.eventType }}</span>
                <mat-chip *ngIf="isRegistered(e.id)" class="!text-xs">Registered</mat-chip>
              </div>
              <h3 class="text-xl sm:text-2xl font-bold text-white mt-2">{{ e.title }}</h3>
              <p class="text-mos-muted text-base">{{ formatTime(e.startTime) }} · {{ e.location }}</p>
              <p class="text-mos-text mt-3 text-base">{{ e.description }}</p>
              <div class="mt-4" *ngIf="auth.isAuthenticated()">
                <button *ngIf="!isRegistered(e.id)" mat-flat-button color="primary"
                  [disabled]="busyId() === e.id" (click)="register(e.id)">
                  Register
                </button>
                <button *ngIf="isRegistered(e.id)" mat-stroked-button
                  [disabled]="busyId() === e.id" (click)="cancel(e.id)">
                  Cancel registration
                </button>
              </div>
              <p *ngIf="!auth.isAuthenticated()" class="text-mos-muted/70 text-sm mt-3">
                Log in to register for this event.
              </p>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .events-card {
      background: #FFFFFF !important;
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #ecfdf5;
    }
    ::ng-deep .events-field .mat-mdc-text-field-wrapper {
      background: rgba(6, 78, 59, 0.5);
    }
    ::ng-deep .events-field .mdc-floating-label,
    ::ng-deep .events-field .mat-mdc-input-element {
      color: #ecfdf5 !important;
    }
  `]
})
export class EventsComponent implements OnInit {
  private mosqueService = inject(MosqueService);
  private mosqueContext = inject(MosqueContextService);
  private snack = inject(MatSnackBar);
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
        this.snack.open('Registered successfully', 'OK', { duration: 3000 });
      },
      error: () => {
        this.busyId.set(null);
        this.snack.open('Could not register — you may already be registered', 'OK', { duration: 4000 });
      },
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
        this.snack.open('Registration cancelled', 'OK', { duration: 3000 });
      },
      error: () => {
        this.busyId.set(null);
        this.snack.open('Could not cancel registration', 'OK', { duration: 4000 });
      },
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
