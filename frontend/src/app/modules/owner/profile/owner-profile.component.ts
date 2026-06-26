import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { OwnerMosqueProfileComponent } from './owner-mosque-profile.component';

@Component({
  selector: 'app-owner-profile',
  standalone: true,
  imports: [OwnerMosqueProfileComponent, PageHeaderComponent],
  template: `
    <app-page-header
      badge="Mosque Owner"
      title="Mosque profile"
      subtitle="Edit your mosque name, contact details, logo, banner, and public listing information." />
    <app-owner-mosque-profile />
  `
})
export class OwnerProfileComponent {}
