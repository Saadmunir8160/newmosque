import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { JourneyGuide, JourneyGuideDetail } from '../../core/services/content.service';

@Component({
  selector: 'app-guest-journey-guides',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header badge="" title="Umrah & Hajj Guides"
      subtitle="Journey stages for sacred travel — read only." />

    <div class="filters">
      <button type="button" class="chip" [class.chip--on]="!type()" (click)="setType(null)">All</button>
      <button type="button" class="chip" [class.chip--on]="type() === 'Umrah'" (click)="setType('Umrah')">Umrah</button>
      <button type="button" class="chip" [class.chip--on]="type() === 'Hajj'" (click)="setType('Hajj')">Hajj</button>
    </div>

    <article *ngFor="let g of guides()" class="card">
      <button type="button" class="card-head" (click)="toggle(g.id)">
        <span class="type">{{ g.type }}</span>
        <h2>{{ g.title }}</h2>
        <span class="chev">{{ openId() === g.id ? '▾' : '▸' }}</span>
      </button>
      <p *ngIf="g.description" class="desc">{{ g.description }}</p>
      <div *ngIf="openId() === g.id && detail()?.id === g.id" class="stages">
        <div *ngFor="let s of detail()!.stages" class="stage">
          <h3>{{ s.orderIndex }}. {{ s.title }}</h3>
          <p *ngIf="s.dayNumber" class="day">Day {{ s.dayNumber }}</p>
          <p>{{ s.description }}</p>
        </div>
      </div>
    </article>
  `,
  styles: [`
    .filters { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1rem; }
    .chip { font-size: 0.6875rem; padding: 0.3rem 0.55rem; border-radius: 9999px; border: 1px solid #d1d5db; background: #ffffff; color: #4b5563; cursor: pointer; }
    .chip--on { background: #e0e7ff; color: #4338ca; border-color: #c7d2fe; }
    .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.75rem 1rem; margin-bottom: 0.75rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
    .card-head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; width: 100%; background: none; border: none; padding: 0; cursor: pointer; text-align: left; }
    .type { font-size: 0.5625rem; text-transform: uppercase; color: #b45309; font-weight: 800; }
    h2 { margin: 0; flex: 1; font-size: 0.9375rem; color: #111827; }
    .chev { color: #6b7280; }
    .desc { margin: 0.35rem 0 0; font-size: 0.8125rem; color: #4b5563; }
    .stage { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e5e7eb; }
    .stage h3 { margin: 0; font-size: 0.8125rem; color: #111827; }
    .day { margin: 0.15rem 0; font-size: 0.6875rem; color: #d97706; }
    .stage p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: #4b5563; line-height: 1.5; }
  `]
})
export class GuestJourneyGuidesComponent implements OnInit {
  private guest = inject(GuestService);
  private seo = inject(SeoService);
  guides = signal<JourneyGuide[]>([]);
  detail = signal<JourneyGuideDetail | null>(null);
  openId = signal<number | null>(null);
  type = signal<string | null>(null);

  ngOnInit(): void {
    this.seo.setPage('Umrah & Hajj Guides', 'Step-by-step Umrah and Hajj journey guides.');
    this.load();
  }

  setType(t: string | null): void {
    this.type.set(t);
    this.openId.set(null);
    this.detail.set(null);
    this.load();
  }

  load(): void {
    this.guest.getJourneyGuides(this.type() || undefined).subscribe(v => {
      const uniqueGuides = v.filter((guide, index, self) => 
        index === self.findIndex((t) => t.title === guide.title)
      );
      this.guides.set(uniqueGuides);
    });
  }

  toggle(id: number): void {
    if (this.openId() === id) {
      this.openId.set(null);
      return;
    }
    this.openId.set(id);
    this.guest.getJourneyGuide(id).subscribe(d => this.detail.set(d));
  }
}
