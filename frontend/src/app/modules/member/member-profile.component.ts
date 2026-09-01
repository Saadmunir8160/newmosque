import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ContentService } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-member-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <app-page-header [useAuthRole]="true" title="Profile" subtitle="Manage your account details" />

    <section *ngIf="auth.user() as u" class="member-card member-profile-card">
      <form (ngSubmit)="save()" class="grid md:grid-cols-2 gap-4">
        <div>
          <label class="member-profile-label" for="profile-full-name">Full name</label>
          <input id="profile-full-name" class="member-profile-input" name="fullName"
            [(ngModel)]="fullName" autocomplete="name" />
        </div>
        <div>
          <p class="member-profile-label">Username</p>
          <p class="member-profile-val">{{ u.userName || '-' }}</p>
        </div>
        <div>
          <p class="member-profile-label">Email</p>
          <p class="member-profile-val">{{ u.email || '-' }}</p>
        </div>
        <div>
          <p class="member-profile-label">Roles</p>
          <p class="member-profile-val">{{ u.roles.join(', ') || '-' }}</p>
        </div>
        <div>
          <p class="member-profile-label">Tariqa</p>
          <p class="member-profile-val">{{ u.tariqa || '-' }}</p>
        </div>
        <div>
          <p class="member-profile-label">Level</p>
          <p class="member-profile-val">{{ u.level || '-' }}</p>
        </div>
        <div class="md:col-span-2 flex flex-wrap gap-3" style="margin-top: 0.25rem;">
          <button type="submit" class="member-btn-primary" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save profile' }}
          </button>
          <a routerLink="/dashboard/member/preferences" class="member-btn-secondary">Edit preferences</a>
        </div>
        <p *ngIf="msg()" class="member-toast md:col-span-2" [class.member-toast--err]="msgErr()">{{ msg() }}</p>
      </form>
    </section>
  `,
})
export class MemberProfileComponent implements OnInit {
  auth = inject(AuthService);
  private content = inject(ContentService);

  fullName = '';
  saving = signal(false);
  msg = signal('');
  msgErr = signal(false);

  ngOnInit(): void {
    const u = this.auth.user();
    if (u) this.fullName = u.fullName ?? '';
  }

  save(): void {
    this.saving.set(true);
    this.msg.set('');
    this.content.updatePreferences({ fullName: this.fullName.trim() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.msgErr.set(false);
        this.msg.set('Profile updated');
        this.auth.refreshProfile();
      },
      error: () => {
        this.saving.set(false);
        this.msgErr.set(true);
        this.msg.set('Could not save profile');
      },
    });
  }
}
