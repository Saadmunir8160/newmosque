import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-member-profile',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header [useAuthRole]="true" title="Profile" subtitle="Your account details" />
    <app-card *ngIf="auth.user() as u">
      <div class="grid md:grid-cols-2 gap-4 text-sm">
        <div><p class="label">Full name</p><p class="val">{{ u.fullName || '-' }}</p></div>
        <div><p class="label">Username</p><p class="val">{{ u.userName || '-' }}</p></div>
        <div><p class="label">Email</p><p class="val">{{ u.email || '-' }}</p></div>
        <div><p class="label">Roles</p><p class="val">{{ u.roles.join(', ') || '-' }}</p></div>
        <div><p class="label">Tariqa</p><p class="val">{{ u.tariqa || '-' }}</p></div>
        <div><p class="label">Level</p><p class="val">{{ u.level || '-' }}</p></div>
      </div>
    </app-card>
  `,
  styles: [`
    .label { margin: 0; color: #6ee7b7; font-size: 0.75rem; text-transform: uppercase; }
    .val { margin: 0.25rem 0 0; color: #fff; font-size: 0.9rem; }
  `]
})
export class MemberProfileComponent {
  auth = inject(AuthService);
}
