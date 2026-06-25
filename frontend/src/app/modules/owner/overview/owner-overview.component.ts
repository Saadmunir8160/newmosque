import { Component } from '@angular/core';
import { OwnerDashboardComponent } from '../dashboard/owner-dashboard.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

@Component({
  selector: 'app-owner-overview',
  standalone: true,
  imports: [OwnerDashboardComponent, PageHeaderComponent],
  template: `
    <app-page-header
      badge="Mosque Owner"
      title="Dashboard"
      subtitle="Overview of your mosque claim status, profile completeness, and quick links to manage your listing." />
    <app-owner-dashboard />
  `
})
export class OwnerOverviewComponent {}
