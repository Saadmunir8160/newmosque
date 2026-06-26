import { Component, OnInit, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';

import { MuqaddamService, MuqaddamDashboard } from '../../core/services/muqaddam.service';

import { MosqueContextService } from '../../core/services/mosque-context.service';

import { PageHeaderComponent } from '../../shared/ui/page-header.component';

import { CardComponent } from '../../shared/ui/card.component';



@Component({

  selector: 'app-muqaddam-dashboard',

  standalone: true,

  imports: [CommonModule, RouterModule, PageHeaderComponent, CardComponent],

  template: `

    <app-page-header [useAuthRole]="true" title="Muqaddam Dashboard"

      subtitle="Spiritual circles, murids, and tariqa community oversight" />



    <div class="mos-kpi-grid mb-6" *ngIf="dash() as d">

      <app-card><p class="text-stat-label">Communities</p><p class="mos-stat-value">{{ d.assignedCommunities }}</p></app-card>

      <app-card><p class="text-stat-label">Murids</p><p class="mos-stat-value">{{ d.totalMurids }}</p></app-card>

      <app-card><p class="text-stat-label">Upcoming Events</p><p class="mos-stat-value mos-stat-value--accent">{{ d.upcomingGatherings }}</p></app-card>

      <app-card><p class="text-stat-label">Follow-ups</p><p class="mos-stat-value mos-stat-value--danger">{{ d.pendingFollowUps }}</p></app-card>

      <app-card><p class="text-stat-label">Participation</p><p class="mos-stat-value mos-stat-value--success">{{ d.participationRate }}%</p></app-card>

    </div>



    <div class="mos-quick-grid mb-8">

      <a *ngFor="let link of links" [routerLink]="link.route" class="mos-quick-link">

        <h3 class="mos-quick-link__title">{{ link.title }}</h3>

        <p class="mos-quick-link__desc">{{ link.desc }}</p>

      </a>

    </div>



    <app-card *ngIf="dash()?.recentActivity?.length">

      <h3 class="mos-dash-panel__title">Recent Activity</h3>

      <div *ngFor="let a of dash()!.recentActivity" class="mos-activity-row">

        <span class="mos-activity-badge">{{ a.type }}</span>

        <div>

          <p class="mos-activity-title">{{ a.title }}</p>

          <p class="mos-activity-meta">{{ a.detail }} · {{ a.at | date:'short' }}</p>

        </div>

      </div>

    </app-card>

  `,

})

export class MuqaddamDashboardComponent implements OnInit {

  private muqaddam = inject(MuqaddamService);

  private mosqueCtx = inject(MosqueContextService);

  dash = signal<MuqaddamDashboard | null>(null);

  mosqueId = 1;



  links = [

    { route: '/dashboard/muqaddam/murids', title: 'Murid Management', desc: 'View murids, participation and attendance' },

    { route: '/dashboard/muqaddam/communities', title: 'Communities', desc: 'Create and manage tariqa circles' },

    { route: '/dashboard/muqaddam/guidance', title: 'Guidance Notes', desc: 'Notes, follow-ups, recommendations' },

    { route: '/dashboard/muqaddam/events', title: 'Events', desc: 'Dhikr gatherings and spiritual programs' },

    { route: '/dashboard/muqaddam/reports', title: 'Reports', desc: 'Participation and attendance reports' },

  ];



  ngOnInit(): void {

    this.mosqueCtx.resolve().then(id => {

      this.mosqueId = id;

      this.muqaddam.getDashboard(id).subscribe(d => this.dash.set(d));

    });

  }

}


