import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { currentDayName } from '../../core/utils/date.utils';

@Component({
  selector: 'app-dashboard-badges',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dash-badges">
      <span class="dash-badge dash-badge--day">{{ dayLabel() }}</span>
      <span *ngIf="resolvedRole()" class="dash-badge dash-badge--role">{{ resolvedRole() }}</span>
    </div>
  `,
  styles: [`
    .dash-badges {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.375rem;
    }
    .dash-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .dash-badge--day {
      color: #1D4ED8;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.22);
    }
    .dash-badge--role {
      color: #C2410C;
      background: rgba(234, 88, 12, 0.1);
      border: 1px solid rgba(234, 88, 12, 0.25);
    }
  `]
})
export class DashboardBadgesComponent {
  private auth = inject(AuthService);

  @Input() role = '';
  @Input() useAuthRole = false;
  @Input() showRole = true;

  dayLabel = computed(() => currentDayName());

  resolvedRole = computed(() => {
    if (!this.showRole) return '';
    if (this.useAuthRole) return this.auth.primaryRoleName().toUpperCase();
    return this.role ? this.role.toUpperCase() : '';
  });
}
