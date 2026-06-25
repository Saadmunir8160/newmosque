import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

@Component({
  selector: 'app-mosque-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTabsModule, PageHeaderComponent],
  template: `
    <div class="mosque-shell">
      <app-page-header
        [useAuthRole]="true"
        title="My Mosque"
        subtitle="Manage your mosque profile and settings." />

      <nav mat-tab-nav-bar [tabPanel]="tabPanel" class="mosque-tabs">
        <a mat-tab-link routerLink="/dashboard/mosque" routerLinkActive #overview="routerLinkActive"
          [active]="overview.isActive">Overview</a>
        <a mat-tab-link routerLink="/dashboard/mosque/profile" routerLinkActive #profile="routerLinkActive"
          [active]="profile.isActive">Profile</a>
        <a mat-tab-link routerLink="/dashboard/mosque/settings" routerLinkActive #settings="routerLinkActive"
          [active]="settings.isActive">Settings</a>
      </nav>
      <mat-tab-nav-panel #tabPanel>
        <div class="mosque-shell__content">
          <router-outlet />
        </div>
      </mat-tab-nav-panel>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .mosque-shell { display: flex; flex-direction: column; gap: 0.5rem; }
    .mosque-tabs { margin-bottom: 0.25rem; }
    .mosque-shell__content { padding-top: 0.5rem; }
    ::ng-deep .mosque-tabs .mat-mdc-tab-link { font-weight: 600; font-size: 0.8125rem; }
  `]
})
export class MosqueShellComponent {}
