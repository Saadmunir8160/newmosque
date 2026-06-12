import { Component, Input } from '@angular/core';

import { CommonModule } from '@angular/common';



@Component({

  selector: 'app-page-header',

  standalone: true,

  imports: [CommonModule],

  template: `

    <header class="mb-6 sm:mb-8 border-b border-emerald-800 pb-4">

      <p *ngIf="badge" class="text-label text-amber-400 mb-1">{{ badge }}</p>

      <h2 class="heading-page">{{ title }}</h2>

      <p *ngIf="subtitle" class="text-body-muted mt-2">{{ subtitle }}</p>

    </header>

  `

})

export class PageHeaderComponent {

  @Input() title = '';

  @Input() subtitle = '';

  @Input() badge = '';

}

