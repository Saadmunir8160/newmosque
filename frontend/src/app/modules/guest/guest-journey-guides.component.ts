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
    <app-page-header badge="Guest" title="Umrah & Hajj Guides"
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
    .chip { font-size: 0.6875rem; padding: 0.3rem 0.55rem; border-radius: 9999px; border: 1px solid rgba(16,185,129,0.3); background: transparent; color: #a7f3d0; cursor: pointer; }
    .chip--on { background: rgba(212,175,55,0.2); color: #fcd34d; }
    .card { background: rgba(2,44,34,0.85); border: 1px solid rgba(16,185,129,0.2); border-radius: 0.75rem; padding: 0.75rem 1rem; margin-bottom: 0.75rem; }
    .card-head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; width: 100%; background: none; border: none; padding: 0; cursor: pointer; text-align: left; }
    .type { font-size: 0.5625rem; text-transform: uppercase; color: #fcd34d; }
    h2 { margin: 0; flex: 1; font-size: 0.9375rem; color: #fff; }
    .chev { color: #6ee7b7; }
    .desc { margin: 0.35rem 0 0; font-size: 0.8125rem; color: rgba(167,243,208,0.8); }
    .stage { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(16,185,129,0.15); }
    .stage h3 { margin: 0; font-size: 0.8125rem; color: #fff; }
    .day { margin: 0.15rem 0; font-size: 0.6875rem; color: #fcd34d; }
    .stage p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: rgba(167,243,208,0.85); line-height: 1.5; }
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
    this.guest.getJourneyGuides(this.type() || undefined).subscribe(v => this.guides.set(v));
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
