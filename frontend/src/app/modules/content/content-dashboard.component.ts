import { Component, OnInit, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';

import { ContentEditorService } from '../../core/services/content-editor.service';

import { PageHeaderComponent } from '../../shared/ui/page-header.component';

import { CardComponent } from '../../shared/ui/card.component';



@Component({

  selector: 'app-content-dashboard',

  standalone: true,

  imports: [CommonModule, RouterModule, PageHeaderComponent, CardComponent],

  template: `

    <app-page-header badge="Content Editor" title="Dashboard"

      subtitle="Islamic content overview — awrad, duas, adhkar, library, and media." />



    <div class="mos-kpi-grid mb-4">

      <app-card><p class="text-stat-label">Awrad collections</p><p class="mos-stat-value">{{ d()?.awradCollections ?? 0 }}</p></app-card>

      <app-card><p class="text-stat-label">Duas</p><p class="mos-stat-value">{{ d()?.duas ?? 0 }}</p></app-card>

      <app-card><p class="text-stat-label">Adhkar items</p><p class="mos-stat-value">{{ d()?.adhkarItems ?? 0 }}</p></app-card>

      <app-card><p class="text-stat-label">Library items</p><p class="mos-stat-value">{{ d()?.libraryItems ?? 0 }}</p></app-card>

      <app-card><p class="text-stat-label">Media assets</p><p class="mos-stat-value">{{ d()?.mediaAssets ?? 0 }}</p></app-card>

      <app-card><p class="text-stat-label">In review</p><p class="mos-stat-value mos-stat-value--accent">{{ d()?.inReviewCount ?? 0 }}</p></app-card>

    </div>



    <div class="grid gap-4 md:grid-cols-2">

      <app-card>

        <p class="text-stat-label">Workflow</p>

        <ul class="mos-wf-list">

          <li><span>Draft</span><strong>{{ d()?.draftCount ?? 0 }}</strong></li>

          <li><span>In review</span><strong>{{ d()?.inReviewCount ?? 0 }}</strong></li>

          <li><span>Approved</span><strong>{{ d()?.approvedCount ?? 0 }}</strong></li>

          <li><span>Published</span><strong>{{ d()?.publishedCount ?? 0 }}</strong></li>

        </ul>

        <a routerLink="/dashboard/content/reviews" class="mos-dash-panel__link inline-block mt-3">Open review queue →</a>

      </app-card>



      <app-card>

        <p class="text-stat-label mb-2">Recent activity</p>

        <ul class="mos-wf-list" *ngIf="d()?.recentActivity?.length; else noAct">

          <li *ngFor="let a of d()!.recentActivity">

            <span>{{ a.title }} <span class="text-mos-muted text-xs">({{ a.fromStatus }} → {{ a.toStatus }})</span></span>

          </li>

        </ul>

        <ng-template #noAct><p class="text-sm text-mos-muted">No workflow activity yet.</p></ng-template>

      </app-card>

    </div>

  `,

})

export class ContentDashboardComponent implements OnInit {

  private editor = inject(ContentEditorService);

  d = signal<import('../../core/services/content-editor.service').ContentEditorDashboard | null>(null);



  ngOnInit(): void {

    this.editor.getDashboard().subscribe(v => this.d.set(v));

  }

}


