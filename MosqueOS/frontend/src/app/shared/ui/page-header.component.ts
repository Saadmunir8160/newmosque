import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardBadgesComponent } from './dashboard-badges.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, DashboardBadgesComponent],
  template: `
    <header class="mb-4 sm:mb-5 border-b border-mos-border pb-3 sm:pb-4">
      <app-dashboard-badges *ngIf="useAuthRole" [useAuthRole]="true" />
      <p *ngIf="badge" class="text-[0.625rem] sm:text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-mos-primary mb-1">{{ badge }}</p>
      <h2 class="heading-page">{{ title }}</h2>
      <p *ngIf="subtitle" class="text-xs sm:text-sm text-mos-muted mt-1 max-w-2xl leading-relaxed">{{ subtitle }}</p>
    </header>
  `
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() badge = '';
  @Input() useAuthRole = false;
}
