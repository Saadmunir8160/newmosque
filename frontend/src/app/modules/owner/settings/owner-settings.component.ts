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
      title="Module settings"
      subtitle="Enable or disable mosque modules such as prayer times, events, donations, and volunteers." />
    <app-owner-module-settings />
  `
})
export class OwnerSettingsComponent {}
