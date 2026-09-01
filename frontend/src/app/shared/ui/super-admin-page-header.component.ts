import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationBellComponent } from '../ui/notification-bell.component';

@Component({
  selector: 'app-super-admin-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationBellComponent],
  template: `
    <header class="sa-top">
      <div class="sa-top__left">
        <p class="sa-top__crumb" *ngIf="crumb">{{ crumb }}</p>
        <h1 class="sa-top__title">{{ title }}</h1>
        <p class="sa-top__sub" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="sa-top__right">
        <ng-content select="[actions]"></ng-content>
        <div class="sa-top__pill" *ngIf="showMeta">
          <span class="material-symbols-outlined" aria-hidden="true">public</span>
          <span>Europe/London</span>
          <strong>{{ londonTime() }}</strong>
        </div>
        <div class="sa-top__pill" *ngIf="showMeta">
          <span class="material-symbols-outlined" aria-hidden="true">calendar_month</span>
          <span>{{ londonDate() }}</span>
        </div>
        <div class="sa-top__bell" *ngIf="showMeta">
          <app-notification-bell />
        </div>
        <div class="sa-top__pill sa-top__pill--user" *ngIf="showMeta">
          <span class="sa-top__avatar" aria-hidden="true">{{ userInitials() }}</span>
          <span>{{ userName() }}</span>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; margin-bottom: 20px; }
    .sa-top {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
    }
    .sa-top__crumb {
      margin: 0 0 4px;
      font-size: 13px;
      font-weight: 500;
      color: #94a3b8;
    }
    .sa-top__title {
      margin: 0;
      font-size: clamp(1.5rem, 2.5vw, 2rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #0f172a;
      line-height: 1.15;
    }
    .sa-top__sub {
      margin: 6px 0 0;
      font-size: 15px;
      color: #64748b;
      max-width: 40rem;
      line-height: 1.45;
    }
    .sa-top__right {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .sa-top__pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      padding: 8px 12px;
      border-radius: 999px;
      background: #fff;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      font-size: 13px;
      color: #64748b;
    }
    .sa-top__pill .material-symbols-outlined {
      font-size: 18px;
      color: #0f4c3a;
    }
    .sa-top__pill strong {
      color: #0f172a;
      font-weight: 700;
    }
    .sa-top__pill--user { padding-right: 14px; }
    .sa-top__avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #0f4c3a;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
    }
    .sa-top__bell {
      display: inline-flex;
      align-items: center;
      min-height: 40px;
      padding: 4px 8px;
      border-radius: 999px;
      background: #fff;
      border: 1px solid #e5e7eb;
    }
    @media (max-width: 720px) {
      .sa-top__pill:not(.sa-top__pill--user) { display: none; }
      .sa-top__right { width: 100%; justify-content: flex-start; }
    }
    @media (max-width: 960px) {
      .sa-top { flex-direction: column; }
      .sa-top__right { width: 100%; }
    }
  `],
})
export class SuperAdminPageHeaderComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private timer?: ReturnType<typeof setInterval>;

  @Input() title = '';
  @Input() subtitle = '';
  @Input() crumb = '';
  @Input() showMeta = true;

  now = signal(new Date());

  userName = computed(() =>
    this.auth.user()?.fullName?.trim() || this.auth.user()?.userName || 'Super Admin');

  userInitials = computed(() => {
    const name = this.userName();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  londonTime = computed(() =>
    this.now().toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }));

  londonDate = computed(() =>
    this.now().toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }));

  ngOnInit(): void {
    this.timer = setInterval(() => this.now.set(new Date()), 30_000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
