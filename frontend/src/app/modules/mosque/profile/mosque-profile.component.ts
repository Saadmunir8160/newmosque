import { Component } from '@angular/core';
import { AdminMosqueComponent } from '../../admin/mosque-profile/admin-mosque.component';

@Component({
  selector: 'app-mosque-profile',
  standalone: true,
  imports: [AdminMosqueComponent],
  template: `<app-admin-mosque [hideHeader]="true" mode="profile" />`
})
export class MosqueProfileComponent {}
