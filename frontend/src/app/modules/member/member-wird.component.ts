import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';
import { WirdCollection } from '../../core/models';

@Component({
  selector: 'app-member-wird',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Member" title="My Wird" subtitle="Recommended reading and guided collections" />
    <app-card *ngIf="recommended() as rec" class="mb-6">
      <span class="text-amber-400 text-sm font-bold uppercase">Recommended Now</span>
      <h3 class="text-xl font-bold text-white mt-2">{{ rec.collection.name }}</h3>
      <p class="text-emerald-300 text-sm">Slot: {{ rec.slot }}</p>
      <button class="btn mt-3" (click)="complete(rec.collection.id)">Mark Complete</button>
    </app-card>
    <app-card *ngFor="let c of collections()" class="block mb-3">
      <h4 class="text-white font-bold">{{ c.name }}</h4>
      <p class="text-emerald-300 text-sm">{{ c.tariqa }} · {{ c.type }}</p>
    </app-card>
  `,
  styles: [`.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}`]
})
export class MemberWirdComponent implements OnInit {
  private content = inject(ContentService);
  recommended = signal<{ slot: string; collection: WirdCollection } | null>(null);
  collections = signal<WirdCollection[]>([]);
  ngOnInit(): void {
    this.content.getRecommendedWird().subscribe((r: any) => this.recommended.set(r));
    this.content.getCollections().subscribe(c => this.collections.set(c));
  }
  complete(id: number): void { this.content.markWirdComplete(id).subscribe(); }
}
