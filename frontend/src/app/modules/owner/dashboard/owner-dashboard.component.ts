import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { Mosque } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Owner" title="Your Mosque"
      subtitle="Step through each task below — every card opens a working screen for your mosque." />

    <app-card *ngIf="mosque() as m" class="mb-6">
      <h3 class="text-white font-bold text-xl">{{ m.name }}</h3>
      <p class="text-emerald-300 text-sm mt-1">{{ m.address }}, {{ m.city }} {{ m.postcode }}</p>
      <p class="text-amber-400 text-sm mt-2">Status: {{ m.status }}</p>
    </app-card>

    <div class="space-y-4">
      <a *ngFor="let link of links" [routerLink]="link.route"
        class="block bg-[#064e3b] border border-emerald-800 rounded-2xl p-5 sm:p-6 hover:border-amber-400 transition-all hover:-translate-y-0.5">
        <div class="flex items-start gap-3">
          <span class="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-400 font-bold text-sm flex items-center justify-center shrink-0">{{ link.step }}</span>
          <div class="flex-1 min-w-0">
            <h3 class="text-white font-bold mb-1">{{ link.title }}</h3>
            <p class="text-emerald-300 text-sm mb-3">{{ link.desc }}</p>
            <ol class="space-y-1">
              <li *ngFor="let s of link.steps; let i = index" class="text-emerald-100 text-sm flex gap-2">
                <span class="text-amber-400/70 font-mono text-xs">{{ link.step }}.{{ i + 1 }}</span>{{ s }}
              </li>
            </ol>
          </div>
          <span class="text-amber-400 text-sm font-bold shrink-0 hidden sm:inline">Open →</span>
        </div>
      </a>
    </div>
  `
})
export class OwnerDashboardComponent implements OnInit {
  private admin = inject(AdminService);
  mosque = signal<Mosque | null>(null);

  links = [
    {
      step: 1,
      route: '/dashboard/owner/claim',
      title: 'Claim Mosque',
      desc: 'Take ownership of your mosque listing on MOS.',
      steps: ['Find your mosque in the unclaimed list', 'Submit a claim request', 'Wait for Super Admin approval'],
    },
    {
      step: 2,
      route: '/dashboard/owner/staff',
      title: 'Appoint Staff',
      desc: 'Give trusted people admin or editor access.',
      steps: ['Open staff appointments', 'Add user by email or username', 'Assign Mosque Admin or Editor role'],
    },
    {
      step: 3,
      route: '/dashboard/admin/mosque',
      title: 'Mosque Profile',
      desc: 'Set your mosque public details.',
      steps: ['Update name, address, and postcode', 'Upload logo and contact info', 'Save profile changes'],
    },
    {
      step: 4,
      route: '/dashboard/admin/settings',
      title: 'Module Settings',
      desc: 'Enable features your mosque uses.',
      steps: ['Toggle madrassah, janaza, or communities', 'Save module preferences', 'Staff see only enabled modules'],
    },
    {
      step: 5,
      route: '/dashboard/admin/announcements',
      title: 'Announcements',
      desc: 'Publish news to your community.',
      steps: ['Create a new announcement', 'Write title and summary', 'Publish — appears on Today screen'],
    },
    {
      step: 6,
      route: '/dashboard/admin/madrassah',
      title: 'Madrassah',
      desc: 'Overview of classes and students.',
      steps: ['View class list and student counts', 'Open a class for details', 'Monitor attendance trends'],
    },
  ];

  ngOnInit(): void {
    this.admin.getAllMosques().subscribe(mosques => {
      const mine = mosques.find(m => m.id === environment.defaultMosqueId) || mosques[0];
      this.mosque.set(mine ?? null);
    });
  }
}
