import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterModule],
  template: `
    <section class="unauth">
      <h1>Access denied</h1>
      <p>You do not have permission to manage this mosque profile.</p>
      <a routerLink="/">Return home</a>
    </section>
  `,
  styles: [`
    .unauth {
      max-width: 32rem;
      margin: 4rem auto;
      padding: 2rem;
      text-align: center;
      border: 1px solid var(--mos-border, #d1d5db);
      border-radius: 12px;
      background: var(--mos-surface, #fff);
    }
    h1 { margin: 0 0 0.75rem; font-size: 1.5rem; }
    p { margin: 0 0 1.25rem; color: var(--mos-text-secondary, #4b5563); }
    a { font-weight: 600; color: var(--mos-primary, #0f766e); }
  `]
})
export class UnauthorizedComponent {}
