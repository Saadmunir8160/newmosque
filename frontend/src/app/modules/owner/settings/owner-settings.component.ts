import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { OwnerModuleSettingsComponent } from './owner-module-settings.component';

@Component({
  selector: 'app-owner-settings',
  standalone: true,
  imports: [OwnerModuleSettingsComponent, PageHeaderComponent],
  template: `
    <app-page-header
      badge="Mosque Owner"
      title="Modules"
      subtitle="Enable or disable Prayer, Events, Donations, Education, Volunteers, and Announcements." />
    <app-owner-module-settings />
  `
})
export class OwnerSettingsComponent {}
