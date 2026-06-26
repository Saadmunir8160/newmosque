import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { formatMosqueStatus } from '../../../core/utils/mosque-status.util';

@Component({
  selector: 'app-mosque-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="show()" class="mosque-switcher">
      <label class="mosque-switcher__label">
        <span>Mosque</span>
        <select
          class="mosque-switcher__select"
          [value]="ctx.mosqueId()"
          (change)="onChange($event)">
          <option *ngFor="let m of ctx.ownedMosques()" [value]="m.id">
            {{ m.name }} · {{ formatStatus(m.status) }}
          </option>
        </select>
      </label>
      <span *ngIf="activeSummary() as s" class="mosque-switcher__meta">
        {{ s.profileCompleteness }}% complete
      </span>
    </div>
  `,
  styles: [`
    .mosque-switcher {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem 1rem;
      padding: 0.625rem 1rem;
      margin-bottom: 0.75rem;
      border-radius: 12px;
      border: 1px solid var(--mos-border);
      background: var(--mos-surface);
    }
    .mosque-switcher__label {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--mos-text-secondary);
    }
    .mosque-switcher__select {
      min-width: 12rem;
      max-width: 100%;
      padding: 0.45rem 0.65rem;
      border-radius: 0.5rem;
      border: 1px solid var(--mos-border);
      background: #fff;
      font-size: 0.8125rem;
      color: var(--mos-text-primary);
    }
    .mosque-switcher__meta {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--mos-text-secondary);
    }
  `]
})
export class MosqueSwitcherComponent {
  ctx = inject(MosqueContextService);
  /** When true, show even with a single owned mosque. */
  alwaysShow = input(false);

  readonly formatStatus = formatMosqueStatus;

  show = computed(() => {
    const count = this.ctx.ownedMosques().length;
    return this.alwaysShow() ? count > 0 : count > 1;
  });

  activeSummary = computed(() =>
    this.ctx.ownedMosques().find(m => m.id === this.ctx.mosqueId()) ?? null
  );

  onChange(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    if (Number.isFinite(id) && id > 0) {
      void this.ctx.setActiveMosqueId(id);
    }
  }
}
