import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .ui-card {
      background: var(--mos-surface);
      border: 1px solid var(--mos-border);
      border-radius: var(--mos-radius-card);
      box-shadow: var(--mos-shadow-card);
      padding: 0.875rem 1rem;
      width: 100%;
      transition: border-color 0.2s, box-shadow 0.2s;
      color: var(--mos-text-primary);
    }
    @media (min-width: 640px) { .ui-card { padding: 1rem 1.25rem; } }
    .ui-card--interactive:hover {
      border-color: rgba(15, 118, 110, 0.28);
      box-shadow: var(--mos-shadow-card-hover);
    }
  `],
  template: `
    <div class="ui-card" [class.ui-card--interactive]="interactive">
      <ng-content></ng-content>
    </div>
  `
})
export class CardComponent {
  @Input() interactive = false;
}
