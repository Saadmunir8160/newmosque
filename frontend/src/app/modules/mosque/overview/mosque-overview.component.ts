import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { Mosque } from '../../../core/models';

@Component({
  selector: 'app-mosque-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="mos-dash">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <article class="mos-kpi">
          <p class="mos-kpi__label">Mosque status</p>
          <p class="mos-kpi__value mos-kpi__value--sm" [attr.data-status]="status()">{{ statusLabel() }}</p>
          <p class="mos-kpi__sub">{{ statusHint() }}</p>
        </article>
        <article class="mos-kpi">
          <p class="mos-kpi__label">Profile complete</p>
          <p class="mos-kpi__value">{{ completeness() }}%</p>
          <div class="h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
            <div class="h-full rounded-full bg-mos-primary" [style.width.%]="completeness()"></div>
          </div>
        </article>
      </div>

      <article *ngIf="mosque() as m" class="mos-dash-panel">
        <h2 class="mos-dash-panel__title">{{ m.name }}</h2>
        <p class="mos-dash-sub">{{ m.address }}, {{ m.city }} {{ m.postcode }}</p>
        <p *ngIf="missing().length" class="text-sm text-mos-accent mt-2">
          Missing: {{ missing().join(', ') }}
        </p>
        <a *ngIf="m.slug && isActive()" [routerLink]="['/mosque', m.slug]" target="_blank" class="mos-dash-panel__link inline-block mt-3">
          Preview public profile →
        </a>
      </article>

      <article *ngIf="!mosque()" class="admin-empty">
        <p class="admin-empty-title">No owned mosque</p>
        <p class="admin-empty-desc">Your mosque dashboard is available after a claim is approved.</p>
      </article>

      <div class="mos-quick-grid md:grid-cols-2">
        <a routerLink="/dashboard/mosque/profile" class="mos-quick-link">
          <span class="text-xl">⌂</span>
          <h3 class="mos-quick-link__title">Mosque profile</h3>
          <p class="mos-quick-link__desc">Edit name, contact, logo &amp; banner</p>
        </a>
        <a routerLink="/dashboard/mosque/settings" class="mos-quick-link">
          <span class="text-xl">⚙</span>
          <h3 class="mos-quick-link__title">Settings</h3>
          <p class="mos-quick-link__desc">Social links, timezone &amp; status</p>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .mos-kpi__value[data-status="Claimed"] { color: var(--mos-accent); }
    .mos-kpi__value[data-status="Active"] { color: var(--mos-success); }
    .mos-kpi__value[data-status="ClaimPending"] { color: var(--mos-gold); }
  `]
})
export class MosqueOverviewComponent implements OnInit {
  private admin = inject(AdminService);
  mosque = signal<Mosque | null>(null);
  completeness = signal(0);
  missing = signal<string[]>([]);
  status = signal('None');
  statusLabel = signal('—');
  statusHint = signal('');
  isActive = signal(false);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.admin.getOwnerMosque().subscribe(res => {
      this.mosque.set(res.mosque);
      this.completeness.set(res.profileCompleteness);
      this.missing.set(res.missingFields);
      const s = res.mosque?.status ?? 'None';
      this.status.set(s);
      this.isActive.set(s === 'Active');
      this.statusLabel.set(s === 'None' ? 'Not assigned' : s);
      this.statusHint.set(
        s === 'Active' ? 'Your mosque is live on the public directory.'
        : s === 'Claimed' ? 'Claim approved — awaiting super admin activation.'
        : s === 'ClaimPending' ? 'Claim pending super admin review.'
        : 'No mosque assigned to your account yet.'
      );
    });
  }
}
