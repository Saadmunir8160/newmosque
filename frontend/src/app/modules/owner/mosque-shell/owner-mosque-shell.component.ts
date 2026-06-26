import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

@Component({
  selector: 'app-owner-mosque-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTabsModule, PageHeaderComponent],
  template: `
    <div class="owner-shell">
      <app-page-header
        [useAuthRole]="true"
        title="My Mosque"
        subtitle="Manage your mosque profile, modules, and public listing." />

      <nav mat-tab-nav-bar [tabPanel]="tabPanel" class="owner-tabs">
        <a mat-tab-link routerLink="/dashboard/owner" routerLinkActive #overview="routerLinkActive"
          [active]="overview.isActive">Overview</a>
        <a mat-tab-link routerLink="/dashboard/owner/profile" routerLinkActive #profile="routerLinkActive"
          [active]="profile.isActive">Profile</a>
        <a mat-tab-link routerLink="/dashboard/owner/settings" routerLinkActive #settings="routerLinkActive"
          [active]="settings.isActive">Settings</a>
      </nav>
      <mat-tab-nav-panel #tabPanel>
        <div class="owner-shell__content">
          <router-outlet />
        </div>
      </mat-tab-nav-panel>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .owner-shell { display: flex; flex-direction: column; gap: 0.5rem; }
    .owner-tabs { margin-bottom: 0.25rem; }
    .owner-shell__content { padding-top: 0.5rem; }
    ::ng-deep .owner-tabs .mat-mdc-tab-link { font-weight: 600; font-size: 0.8125rem; }
  `]
})
export class OwnerMosqueShellComponent {}
