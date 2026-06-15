import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-content-dashboard',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Content Editor" title="Dashboard" subtitle="Content overview and recent edits" />
    <div class="grid md:grid-cols-3 gap-4">
      <app-card><p class="text-stat-label">Awrad collections</p><p class="text-3xl font-bold text-white">{{ collectionsCount() }}</p></app-card>
      <app-card><p class="text-stat-label">Adhkar items</p><p class="text-3xl font-bold text-white">{{ adhkarCount() }}</p></app-card>
      <app-card><p class="text-stat-label">Duas</p><p class="text-3xl font-bold text-white">{{ duasCount() }}</p></app-card>
    </div>
  `
})
export class ContentDashboardComponent implements OnInit {
  private content = inject(ContentService);
  collectionsCount = signal(0);
  adhkarCount = signal(0);
  duasCount = signal(0);

  ngOnInit(): void {
    this.content.getCollections().subscribe(v => this.collectionsCount.set(v.length));
    this.content.getAdhkarItems().subscribe(v => this.adhkarCount.set(v.length));
    this.content.getDuas().subscribe(v => this.duasCount.set(v.length));
  }
}
