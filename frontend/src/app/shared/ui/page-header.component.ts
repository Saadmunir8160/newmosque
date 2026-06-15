import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardBadgesComponent } from './dashboard-badges.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, DashboardBadgesComponent],
  template: `
    <header class="mb-6 sm:mb-8 border-b border-emerald-800 pb-4">
      <app-dashboard-badges *ngIf="showBadges()" [useAuthRole]="useAuthRole" [role]="badge" [showRole]="!!resolvedBadge()" />
      <p *ngIf="!showBadges() && resolvedBadge()" class="text-label text-amber-400 mb-1">{{ resolvedBadge() }}</p>
      <h2 class="heading-page">{{ title }}</h2>
      <p *ngIf="subtitle" class="text-body-muted mt-2">{{ subtitle }}</p>
    </header>
  `
})
export class PageHeaderComponent {
  private auth = inject(AuthService);

  @Input() title = '';
  @Input() subtitle = '';
  @Input() badge = '';
  @Input() useAuthRole = false;
  @Input() showDayBadge = true;

  resolvedBadge = computed(() =>
    this.useAuthRole ? this.auth.primaryRoleName() : this.badge
  );

  showBadges = computed(() =>
    this.showDayBadge && (this.useAuthRole || !!this.badge)
  );
}
