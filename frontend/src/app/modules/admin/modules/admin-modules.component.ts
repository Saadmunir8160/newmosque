import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { OwnerModuleSettingsComponent } from '../../owner/settings/owner-module-settings.component';

@Component({
  selector: 'app-admin-modules',
  standalone: true,
  imports: [PageHeaderComponent, OwnerModuleSettingsComponent],
  template: `
    <app-page-header
      badge="Mosque Admin"
      title="Module settings"
      subtitle="View enabled mosque modules. Only the mosque owner can change feature flags." />
    <app-owner-module-settings />
  `,
})
export class AdminModulesComponent {}
