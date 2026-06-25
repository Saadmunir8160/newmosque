import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { ContentService, RitualGuide, RitualGuideDetail } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-member-ritual-guides',
  standalone: true,
  imports: [
    CommonModule, PageHeaderComponent,
    MatCardModule, MatExpansionModule, MatChipsModule,
  ],
  template: `
    <app-page-header badge="Member" title="Ritual guides" subtitle="Step-by-step wudu, ghusl, salah" />

    <mat-chip-set class="member-filters" style="border: none; padding-bottom: 0;">
      <mat-chip [highlighted]="!filterType()" (click)="setFilter(null)">All</mat-chip>
      <mat-chip [highlighted]="filterType() === 'Wudu'" (click)="setFilter('Wudu')">Wudu</mat-chip>
      <mat-chip [highlighted]="filterType() === 'Ghusl'" (click)="setFilter('Ghusl')">Ghusl</mat-chip>
      <mat-chip [highlighted]="filterType() === 'Salah'" (click)="setFilter('Salah')">Salah</mat-chip>
    </mat-chip-set>

    <mat-accordion multi>
      <mat-expansion-panel *ngFor="let g of guides()" class="member-mat-panel" (opened)="loadDetail(g.id)">
        <mat-expansion-panel-header>
          <mat-panel-title>{{ g.title }}</mat-panel-title>
          <mat-panel-description>{{ g.type }}</mat-panel-description>
        </mat-expansion-panel-header>
        <p *ngIf="g.description" class="member-desc mb-3">{{ g.description }}</p>
        <div *ngIf="detail()?.id === g.id">
          <mat-card *ngFor="let s of detail()!.steps" class="member-step-card mb-2">
            <h4 class="member-title text-sm">{{ s.orderIndex }}. {{ s.title }}</h4>
            <p class="member-desc mt-1">{{ s.description }}</p>
            <div *ngIf="s.dua" class="member-dua-box">
              <p class="member-tag" style="margin-bottom: 0.35rem;">{{ s.dua.title }}</p>
              <p class="member-arabic text-right" dir="rtl">{{ s.dua.arabicText }}</p>
              <p *ngIf="s.dua.translation" class="member-translation mt-1">{{ s.dua.translation }}</p>
            </div>
          </mat-card>
        </div>
        <p *ngIf="loadingId() === g.id" class="member-meta">Loading steps…</p>
      </mat-expansion-panel>
    </mat-accordion>
  `,
})
export class MemberRitualGuidesComponent implements OnInit {
  private content = inject(ContentService);
  guides = signal<RitualGuide[]>([]);
  detail = signal<RitualGuideDetail | null>(null);
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
    this.content.getRitualGuide(id).subscribe({
      next: d => { this.detail.set(d); this.loadingId.set(null); },
      error: () => this.loadingId.set(null),
    });
  }

  private load(): void {
    const type = this.filterType() ?? undefined;
    this.content.getRitualGuides(type).subscribe(v => this.guides.set(v));
  }
}
