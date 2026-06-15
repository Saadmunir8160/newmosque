import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-member-journey-guides',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Member" title="Umrah & Hajj guides" subtitle="Step-by-step journey stages" />
    <app-card class="block mb-3">
      <h4 class="text-white font-bold">Umrah journey</h4>
      <p class="text-emerald-300 text-sm">Pre-departure, ihram, tawaf, sa'i, completion.</p>
    </app-card>
    <app-card class="block mb-3">
      <h4 class="text-white font-bold">Hajj journey</h4>
      <p class="text-emerald-300 text-sm">Day-based stages (8th-13th Dhul Hijjah) with reminders.</p>
    </app-card>
  `
})
export class MemberJourneyGuidesComponent {}
