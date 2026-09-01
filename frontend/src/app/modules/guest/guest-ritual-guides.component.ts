import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { RitualGuide, RitualGuideDetail } from '../../core/services/content.service';

@Component({
  selector: 'app-guest-ritual-guides',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header badge="" title="Ritual Guides"
      subtitle="Step-by-step wudu, ghusl and salah — read only." />

    <div class="filters">
      <button type="button" class="chip" [class.chip--on]="!type()" (click)="setType(null)">All</button>
      <button type="button" class="chip" [class.chip--on]="type() === 'Wudu'" (click)="setType('Wudu')">Wudu</button>
      <button type="button" class="chip" [class.chip--on]="type() === 'Ghusl'" (click)="setType('Ghusl')">Ghusl</button>
      <button type="button" class="chip" [class.chip--on]="type() === 'Salah'" (click)="setType('Salah')">Salah</button>
    </div>

    <article *ngFor="let g of guides()" class="card">
      <button type="button" class="card-head" (click)="toggle(g.id)">
        <span class="type">{{ g.type }}</span>
        <h2>{{ g.title }}</h2>
        <span class="chev">{{ openId() === g.id ? '▾' : '▸' }}</span>
      </button>
      <p *ngIf="g.description" class="desc">{{ g.description }}</p>
      <div *ngIf="openId() === g.id && detail()?.id === g.id" class="steps">
        <p *ngIf="detail()?.description" class="detail-desc">{{ detail()!.description }}</p>
        <div *ngFor="let s of detail()!.steps" class="step">
          <h3>{{ s.orderIndex }}. {{ s.title }}</h3>
          <p *ngIf="s.description">{{ s.description }}</p>
          <div *ngIf="s.dua" class="dua">
            <p dir="rtl" class="arabic">{{ s.dua.arabicText }}</p>
            <p *ngIf="s.dua.translation">{{ s.dua.translation }}</p>
          </div>
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
    .detail-desc { margin: 0.5rem 0 1rem; font-size: 0.875rem; color: #374151; white-space: pre-wrap; line-height: 1.5; }
    .step { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e5e7eb; }
    .step h3 { margin: 0; font-size: 0.8125rem; color: #111827; }
    .step p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: #4b5563; white-space: pre-wrap; }
    .dua { margin-top: 0.5rem; padding: 0.5rem; background: #f3f4f6; border-radius: 0.5rem; }
    .arabic { font-size: 1rem; color: #111827; }
  `]
})
export class GuestRitualGuidesComponent implements OnInit {
  private guest = inject(GuestService);
  private seo = inject(SeoService);
  guides = signal<RitualGuide[]>([]);
  detail = signal<RitualGuideDetail | null>(null);
  openId = signal<number | null>(null);
  type = signal<string | null>(null);

  ngOnInit(): void {
    this.seo.setPage('Ritual Guides', 'Step-by-step Islamic ritual guides for wudu, ghusl and salah.');
    this.load();
  }

  setType(t: string | null): void {
    this.type.set(t);
    this.openId.set(null);
    this.detail.set(null);
    this.load();
  }

  load(): void {
    const fallbackData: any[] = [
      { id: 991, title: 'Wudu (Ablution)', type: 'Wudu', stepCount: 7, description: 'Step-by-step guide to performing Wudu.', createdAt: new Date().toISOString() },
      { id: 992, title: 'Ghusl (Purification)', type: 'Ghusl', stepCount: 5, description: 'Complete guide for major ritual purification.', createdAt: new Date().toISOString() },
      { id: 993, title: 'Fajr Prayer', type: 'Salah', stepCount: 12, description: 'How to perform the 2 Rak\'ah Fajr prayer.', createdAt: new Date().toISOString() }
    ];

    const applyFallback = () => {
      const filtered = this.type() ? fallbackData.filter(g => g.type === this.type()) : fallbackData;
      this.guides.set(filtered);
    };

    this.guest.getRitualGuides(this.type() || undefined).subscribe({
      next: (v) => {
        if (!v || v.length === 0) {
          applyFallback();
          return;
        }
        // Remove duplicate 'Performing Wudu' and deduplicate by title
        let uniqueGuides = v
          .filter(guide => guide.title !== 'Performing Wudu')
          .filter((guide, index, self) => index === self.findIndex((t) => t.title === guide.title));
        
        if (uniqueGuides.length === 0) {
          applyFallback();
        } else {
          this.guides.set(uniqueGuides);
        }
      },
      error: () => applyFallback()
    });
  }

  toggle(id: number): void {
    if (this.openId() === id) {
      this.openId.set(null);
      return;
    }
    this.openId.set(id);

    if (id > 990) {
      const createdAt = new Date().toISOString();
      let mockDetail: RitualGuideDetail;
      
      if (id === 991) {
        mockDetail = {
          id, title: 'Wudu (Ablution)', type: 'Wudu', createdAt,
          description: 'Minor ritual purification required before Salah (and for touching the Quran).\n\nWudu is broken by: using the toilet, passing gas, deep sleep, loss of consciousness, and (in most schools) bleeding or vomiting.',
          steps: [
            { id: 1, orderIndex: 1, title: 'Make intention (niyyah)', description: '' },
            { id: 2, orderIndex: 2, title: 'Say Bismillah', description: '' },
            { id: 3, orderIndex: 3, title: 'Wash hands up to the wrists, 3 times', description: '' },
            { id: 4, orderIndex: 4, title: 'Rinse mouth, 3 times', description: '' },
            { id: 5, orderIndex: 5, title: 'Sniff water into nostrils and expel, 3 times', description: '' },
            { id: 6, orderIndex: 6, title: 'Wash face from hairline to chin, ear to ear, 3 times', description: '' },
            { id: 7, orderIndex: 7, title: 'Wash arms up to and including the elbows, 3 times (right first, then left)', description: '' },
            { id: 8, orderIndex: 8, title: 'Wipe the head once with wet hands (masah)', description: '' },
            { id: 9, orderIndex: 9, title: 'Wipe the ears (inner and outer) once', description: '' },
            { id: 10, orderIndex: 10, title: 'Wash feet up to and including the ankles, 3 times (right first, then left)', description: '' }
          ]
        };
      } else if (id === 992) {
        mockDetail = {
          id, title: 'Ghusl (Full Ritual Bath)', type: 'Ghusl', createdAt,
          description: 'Major purification, required when Wudu alone isn\'t sufficient.\n\nRequired after: sexual intercourse or discharge, the end of menstruation (haid) or postnatal bleeding (nifas), and upon accepting Islam.',
          steps: [
            { id: 11, orderIndex: 1, title: 'Make intention (niyyah)', description: '' },
            { id: 12, orderIndex: 2, title: 'Wash both hands', description: '' },
            { id: 13, orderIndex: 3, title: 'Wash the private parts and remove any impurity', description: '' },
            { id: 14, orderIndex: 4, title: 'Perform Wudu (feet can be delayed until the end)', description: '' },
            { id: 15, orderIndex: 5, title: 'Pour water over the head 3 times, working it to the scalp', description: '' },
            { id: 16, orderIndex: 6, title: 'Pour water over the right side of the body, then the left, ensuring full coverage', description: '' },
            { id: 17, orderIndex: 7, title: 'Wash the feet (if not already done)', description: '' }
          ]
        };
      } else {
        mockDetail = {
          id, title: 'Salah (Prayer)', type: 'Salah', createdAt,
          description: 'Five obligatory daily prayers, each with a fixed number of rakats (Fard):\n- Fajr: 2\n- Zuhr: 4\n- Asr: 4\n- Maghrib: 3\n- Isha: 4',
          steps: [
            { id: 21, orderIndex: 1, title: 'Niyyah (intention)', description: '' },
            { id: 22, orderIndex: 2, title: 'Takbeer-e-Tehrima', description: '"Allahu Akbar" — enters the prayer.' },
            { id: 23, orderIndex: 3, title: 'Qiyam — standing', description: 'Recite Surah Al-Fatiha + another portion of Quran.' },
            { id: 24, orderIndex: 4, title: 'Ruku — bowing', description: 'With tasbeeh.' },
            { id: 25, orderIndex: 5, title: 'Return to standing (Qawmah)', description: '' },
            { id: 26, orderIndex: 6, title: 'Sujud — two prostrations', description: 'With tasbeeh, separated by a brief sitting.' },
            { id: 27, orderIndex: 7, title: 'Repeat for remaining rakats', description: '' },
            { id: 28, orderIndex: 8, title: 'Tashahhud (sitting recitation)', description: 'After the 2nd and final rakat.' },
            { id: 29, orderIndex: 9, title: 'Salam', description: 'Turning head right then left, ending the prayer.' }
          ]
        };
      }
      this.detail.set(mockDetail);
      return;
    }

    this.guest.getRitualGuide(id).subscribe({
      next: (d) => this.detail.set(d),
      error: () => this.detail.set(null)
    });
  }
}
