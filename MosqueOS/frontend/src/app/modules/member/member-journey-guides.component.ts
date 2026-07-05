import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { ContentService, JourneyGuide, JourneyGuideDetail } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-member-journey-guides',
  standalone: true,
  imports: [
    CommonModule, PageHeaderComponent,
    MatCardModule, MatExpansionModule, MatButtonModule, MatChipsModule,
  ],
  template: `
    <app-page-header badge="Member" title="Umrah & Hajj guides" subtitle="Step-by-step journey stages" />

    <mat-chip-set class="member-filters" style="border: none; padding-bottom: 0;">
      <mat-chip [highlighted]="!filterType()" (click)="setFilter(null)">All</mat-chip>
      <mat-chip [highlighted]="filterType() === 'Umrah'" (click)="setFilter('Umrah')">Umrah</mat-chip>
      <mat-chip [highlighted]="filterType() === 'Hajj'" (click)="setFilter('Hajj')">Hajj</mat-chip>
    </mat-chip-set>

    <p *ngIf="!guides().length" class="member-empty">No journey guides available yet.</p>

    <mat-accordion multi>
      <mat-expansion-panel *ngFor="let g of guides()" class="member-mat-panel" (opened)="loadDetail(g.id)">
        <mat-expansion-panel-header>
          <mat-panel-title>{{ g.title }}</mat-panel-title>
          <mat-panel-description>{{ g.type }}</mat-panel-description>
        </mat-expansion-panel-header>
        <p *ngIf="g.description" class="member-desc mb-3">{{ g.description }}</p>
        <div *ngIf="detail()?.id === g.id; else loadingTpl">
          <mat-card *ngFor="let s of detail()!.stages" class="member-step-card mb-2">
            <h4 class="member-title text-sm">{{ s.orderIndex }}. {{ s.title }}</h4>
            <p *ngIf="s.dayNumber" class="member-tag" style="margin-top: 0.25rem;">Day {{ s.dayNumber }}</p>
            <p class="member-desc mt-1">{{ s.description }}</p>
          </mat-card>
        </div>
        <ng-template #loadingTpl>
          <p *ngIf="loadingId() === g.id" class="member-meta">Loading stages…</p>
        </ng-template>
      </mat-expansion-panel>
    </mat-accordion>
  `,
})
export class MemberJourneyGuidesComponent implements OnInit {
  private content = inject(ContentService);
  guides = signal<JourneyGuide[]>([]);
  detail = signal<JourneyGuideDetail | null>(null);
  loadingId = signal<number | null>(null);
  filterType = signal<string | null>(null);

  ngOnInit(): void { this.load(); }

  setFilter(type: string | null): void {
    this.filterType.set(type);
    this.load();
  }

  loadDetail(id: number): void {
    if (this.detail()?.id === id) return;
    this.loadingId.set(id);
    this.content.getJourneyGuide(id).subscribe({
      next: d => { this.detail.set(d); this.loadingId.set(null); },
      error: () => this.loadingId.set(null),
    });
  }

  private load(): void {
    const type = this.filterType() ?? undefined;
    this.content.getJourneyGuides(type).subscribe(v => this.guides.set(v));
  }
}
