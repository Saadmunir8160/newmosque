import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .ui-card { background: #064e3b; border: 1px solid rgba(6, 95, 70, 0.9); border-radius: 0.75rem; padding: 0.875rem 1rem; width: 100%; transition: border-color 0.2s, box-shadow 0.2s; }
    @media (min-width: 640px) { .ui-card { padding: 1rem 1.15rem; } }
    .ui-card--interactive:hover { border-color: rgba(245, 158, 11, 0.35); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18); }
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
