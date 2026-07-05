import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth/auth.service';
import { ContentService } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-member-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, PageHeaderComponent,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule,
  ],
  template: `
    <app-page-header [useAuthRole]="true" title="Profile" subtitle="Manage your account details" />

    <mat-card *ngIf="auth.user() as u" class="member-profile-card">
      <form (ngSubmit)="save()" class="grid md:grid-cols-2 gap-4">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Full name</mat-label>
          <input matInput [(ngModel)]="fullName" name="fullName" />
        </mat-form-field>
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
        <div class="md:col-span-2 flex flex-wrap gap-3">
          <button mat-flat-button color="primary" type="submit" [disabled]="saving()">Save profile</button>
          <a mat-stroked-button routerLink="/dashboard/member/preferences">Edit preferences</a>
        </div>
      </form>
    </mat-card>
  `,
})
export class MemberProfileComponent implements OnInit {
  auth = inject(AuthService);
  private content = inject(ContentService);
  private snack = inject(MatSnackBar);

  fullName = '';
  saving = signal(false);

  ngOnInit(): void {
    const u = this.auth.user();
    if (u) this.fullName = u.fullName ?? '';
  }

  save(): void {
    this.saving.set(true);
    this.content.updatePreferences({ fullName: this.fullName.trim() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Profile updated', 'OK', { duration: 3000 });
        this.auth.refreshProfile();
      },
      error: () => {
        this.saving.set(false);
        this.snack.open('Could not save profile', 'OK', { duration: 4000 });
      },
    });
  }
}
