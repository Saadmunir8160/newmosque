import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { Mosque } from '../../../core/models';

@Component({
  selector: 'app-super-claims',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header
      badge="Super Admin"
      title="Ownership claims"
      subtitle="Review mosque ownership requests. Approving activates the mosque and grants the owner admin access." />

    <div *ngIf="!pending().length" class="admin-empty">
      <p class="admin-empty-title">All clear</p>
      <p class="admin-empty-desc">There are no pending ownership claims at the moment.</p>
    </div>

    <app-card *ngFor="let m of pending()" class="block mb-3" [interactive]="true">
      <h4 class="text-white font-semibold text-base m-0">{{ m.name }}</h4>
      <p class="admin-meta mt-1">{{ m.address }}, {{ m.city }} {{ m.postcode }}</p>
      <p class="text-xs text-emerald-500 mt-2">Claimant user ID: {{ m.ownerId || 'Unknown' }}</p>
      <label class="block text-xs text-emerald-400 mt-4 mb-1">Rejection note (optional)</label>
      <input class="admin-input mb-3" placeholder="Reason shown in audit log only"
        [(ngModel)]="rejectReason[m.id]">
      <div class="flex flex-wrap gap-2">
        <button type="button" class="admin-btn admin-btn--success" (click)="approve(m.id)">Approve claim</button>
        <button type="button" class="admin-btn admin-btn--danger" (click)="reject(m.id)">Reject</button>
      </div>
    </app-card>
  `
})
export class SuperClaimsComponent implements OnInit {
  private platform = inject(PlatformService);
  pending = signal<Mosque[]>([]);
  rejectReason: Record<number, string> = {};

  ngOnInit(): void { this.load(); }
  load(): void { this.platform.getPendingClaims().subscribe(m => this.pending.set(m)); }

  approve(id: number): void {
    this.platform.approveClaim(id).subscribe(() => this.load());
  }

  reject(id: number): void {
    this.platform.rejectClaim(id, this.rejectReason[id]).subscribe(() => this.load());
  }
}
