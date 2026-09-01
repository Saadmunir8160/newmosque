import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService, JourneyGuide, JourneyGuideDetail } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-member-journey-guides',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Member" title="Umrah & Hajj guides" subtitle="Step-by-step journey stages" />

    <div class="member-filters">
      <button type="button" class="member-chip" [class.member-chip--on]="!filterType()" (click)="setFilter(null)">All</button>
      <button type="button" class="member-chip" [class.member-chip--on]="filterType() === 'Umrah'" (click)="setFilter('Umrah')">Umrah</button>
      <button type="button" class="member-chip" [class.member-chip--on]="filterType() === 'Hajj'" (click)="setFilter('Hajj')">Hajj</button>
    </div>

    <p *ngIf="!guides().length" class="member-empty">No journey guides available yet.</p>

    <div class="member-guide-list">
      <article *ngFor="let g of guides()" class="member-guide-item" [class.member-guide-item--open]="openId() === g.id">
        <button type="button" class="member-guide-item__head" (click)="toggle(g.id)">
          <span class="member-guide-item__title">{{ g.title }}</span>
          <span class="member-guide-item__type">{{ g.type }}</span>
          <span class="member-guide-item__chev" aria-hidden="true">▾</span>
        </button>
        <div class="member-guide-item__body" *ngIf="openId() === g.id">
          <p *ngIf="g.description" class="member-desc">{{ g.description }}</p>
          <p *ngIf="loadingId() === g.id" class="member-meta">Loading stages…</p>
          <div *ngIf="detail()?.id === g.id" class="member-guide-steps">
            <div *ngFor="let s of detail()!.stages" class="member-step-card">
              <h4 class="member-title" style="font-size: 0.9rem;">{{ s.orderIndex }}. {{ s.title }}</h4>
              <p *ngIf="s.dayNumber" class="member-tag" style="margin-top: 0.35rem;">Day {{ s.dayNumber }}</p>
              <p class="member-desc" style="margin-top: 0.35rem;">{{ s.description }}</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  `,
})
export class MemberJourneyGuidesComponent implements OnInit {
  private content = inject(ContentService);
  guides = signal<JourneyGuide[]>([]);
  detail = signal<JourneyGuideDetail | null>(null);
  loadingId = signal<number | null>(null);
  openId = signal<number | null>(null);
  filterType = signal<string | null>(null);

  ngOnInit(): void { this.load(); }

  setFilter(type: string | null): void {
    this.filterType.set(type);
    this.openId.set(null);
    this.detail.set(null);
    this.load();
  }

  toggle(id: number): void {
    if (this.openId() === id) {
      this.openId.set(null);
      return;
    }
    this.openId.set(id);
    this.loadDetail(id);
  }

  private loadDetail(id: number): void {
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
