import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { Mosque } from '../../../core/models';

@Component({
  selector: 'app-owner-claim',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Owner" title="Verification" subtitle="Submit or track your mosque ownership claim" />

    <app-card class="block mb-4">
      <p class="text-label text-emerald-300 mb-1">Current status</p>
      <p class="status-value" [attr.data-status]="status()">{{ statusLabel() }}</p>
      <p class="status-hint">{{ statusHint() }}</p>
      <p *ngIf="mosque() as m" class="text-emerald-300 text-sm mt-3">{{ m.name }} · {{ m.city }}</p>
    </app-card>

    <app-card *ngIf="showClaimList()" class="block mb-4">
      <h3 class="text-white font-bold mb-1">Unclaimed listings</h3>
      <p class="text-emerald-300 text-sm mb-4">Select a mosque to submit an ownership claim for super admin review.</p>
      <p *ngIf="msg()" class="text-amber-400 mb-4">{{ msg() }}</p>
      <div *ngFor="let m of unclaimed()" class="claim-row">
        <div>
          <h4 class="text-white font-bold">{{ m.name }}</h4>
          <p class="text-emerald-300 text-sm">{{ m.address }}, {{ m.postcode }}</p>
        </div>
        <button class="btn" (click)="claim(m.id)">Claim this mosque</button>
      </div>
      <p *ngIf="!unclaimed().length" class="text-emerald-300 text-sm">No unclaimed mosques available right now.</p>
    </app-card>

    <app-card *ngIf="status() === 'Claimed'" class="block mb-4">
      <p class="text-amber-300 font-semibold">Claim submitted — awaiting verification</p>
      <p class="text-emerald-300 text-sm mt-2">
        A super admin will review your ownership request. You can edit your mosque profile while pending.
      </p>
    </app-card>

    <app-card *ngIf="status() === 'Active'" class="block mb-4 verified-card">
      <p class="text-emerald-200 font-semibold">✓ Mosque verified</p>
      <p class="text-emerald-300 text-sm mt-2">
        Your mosque is active. You can manage your profile and assign mosque admins.
      </p>
    </app-card>
  `,
  styles: [`
    .status-value { margin: 0.25rem 0 0; font-size: 1.25rem; font-weight: 700; color: #fff; }
    .status-value[data-status="Unclaimed"] { color: #94a3b8; }
    .status-value[data-status="Claimed"] { color: #fbbf24; }
    .status-value[data-status="Active"] { color: #34d399; }
    .status-value[data-status="None"] { color: #6ee7b7; }
    .status-hint { margin: 0.25rem 0 0; font-size: 0.8125rem; color: #6ee7b7; opacity: 0.85; }
    .claim-row {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem;
      padding: 1rem 0; border-bottom: 1px solid #065f46;
    }
    .claim-row:last-child { border-bottom: none; padding-bottom: 0; }
    .verified-card { border-color: rgba(52, 211, 153, 0.45); }
    .btn { background: #f59e0b; color: #022c22; font-weight: 700; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; }
    .btn:hover { filter: brightness(1.05); }
  `]
})
export class OwnerClaimComponent implements OnInit {
  private admin = inject(AdminService);
  mosque = signal<Mosque | null>(null);
  unclaimed = signal<Mosque[]>([]);
  msg = signal('');
  status = signal('None');
  statusLabel = signal('Not started');
  statusHint = signal('Find an unclaimed mosque and submit a claim.');
  showClaimList = computed(() => {
    const s = this.status();
    return s === 'None' || s === 'Unclaimed';
  });

  ngOnInit(): void {
    this.loadStatus();
    this.admin.getAllMosques().subscribe(m => this.unclaimed.set(m.filter(x => x.status === 'Unclaimed')));
  }

  loadStatus(): void {
    this.admin.getOwnerMosque().subscribe(res => {
      this.mosque.set(res.mosque);
      const s = res.mosque?.status ?? 'None';
      this.status.set(s);
      if (!res.mosque) {
        this.statusLabel.set('Not started');
        this.statusHint.set('No claim submitted yet.');
      } else if (s === 'Unclaimed') {
        this.statusLabel.set('Unclaimed');
        this.statusHint.set('Listing exists but is not yet owned.');
      } else if (s === 'Claimed') {
        this.statusLabel.set('Claimed — pending');
        this.statusHint.set('Super Admin is reviewing your ownership request.');
      } else if (s === 'Active') {
        this.statusLabel.set('Active — verified');
        this.statusHint.set('Your mosque ownership has been verified.');
      }
    });
  }

  claim(id: number): void {
    this.admin.claimMosque(id).subscribe({
      next: () => {
        this.msg.set('Claim submitted. Awaiting super admin verification.');
        this.loadStatus();
      },
      error: (e) => this.msg.set(e.error?.message || 'Could not claim — you may already have a pending claim.')
    });
  }
}
