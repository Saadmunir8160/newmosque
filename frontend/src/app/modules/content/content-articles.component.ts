import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-content-articles',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Content Editor" title="Articles" subtitle="Spiritual and educational content" />
    <app-card>
      <p class="text-white font-semibold mb-2">Article module</p>
      <p class="text-emerald-300 text-sm">
        Phase 1 includes basic article module placeholder for sidebar parity.
        Next step: add CRUD endpoints and editor workflow for publishing.
      </p>
    </app-card>
  `
})
export class ContentArticlesComponent {}
