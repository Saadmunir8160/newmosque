import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService, RitualGuide } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-member-ritual-guides',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Member" title="Ritual guides" subtitle="Step-by-step wudu, ghusl, salah" />
    <app-card *ngFor="let g of guides()" class="block mb-3">
      <h4 class="text-white font-bold">{{ g.title }}</h4>
      <p class="text-emerald-300 text-sm">{{ g.type }}</p>
      <p class="text-emerald-100 text-sm mt-2">{{ g.description || 'Guide details available in next phase.' }}</p>
    </app-card>
  `
})
export class MemberRitualGuidesComponent implements OnInit {
  private content = inject(ContentService);
  guides = signal<RitualGuide[]>([]);

  ngOnInit(): void {
    this.content.getRitualGuides().subscribe(v => this.guides.set(v));
  }
}
