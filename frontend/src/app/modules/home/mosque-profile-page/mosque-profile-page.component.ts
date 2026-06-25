import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PublicMosqueProfileComponent } from '../public-mosque-profile/public-mosque-profile.component';

@Component({
  selector: 'app-mosque-profile-page',
  standalone: true,
  imports: [PublicMosqueProfileComponent],
  template: `
    <app-public-mosque-profile [openClaimOnLoad]="openClaim" />
  `,
})
export class MosqueProfilePageComponent {
  private route = inject(ActivatedRoute);
  openClaim = !!this.route.snapshot.data['openClaim'];
}
