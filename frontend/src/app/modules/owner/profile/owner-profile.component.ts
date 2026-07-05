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
      title="My Mosque"
      subtitle="Edit allowed profile fields, upload logo and banner, and prepare your mosque for verification." />
    <app-owner-mosque-profile />
  `
})
export class OwnerProfileComponent {}
