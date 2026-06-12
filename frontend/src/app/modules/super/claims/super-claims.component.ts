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
    <app-page-header badge="Super Admin" title="Mosque Claims" subtitle="Approve or reject mosque owner claims" />
    <p *ngIf="!pending().length" class="text-emerald-300">No pending claims.</p>
    <app-card *ngFor="let m of pending()" class="block mb-4">
      <h4 class="text-white font-bold">{{ m.name }}</h4>
      <p class="text-emerald-300 text-sm mb-2">{{ m.address }}, {{ m.city }}</p>
      <p class="text-emerald-400 text-sm mb-4">Owner ID: {{ m.ownerId || '—' }}</p>
      <input class="input mb-3" placeholder="Rejection reason (optional)" [(ngModel)]="rejectReason[m.id]">
      <div class="flex gap-2">
        <button class="btn-approve" (click)="approve(m.id)">Approve</button>
        <button class="btn-reject" (click)="reject(m.id)">Reject</button>
      </div>
    </app-card>
  `,
  styles: [`
    .input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:8px;color:#fff;width:100%}
    .btn-approve{background:#10b981;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}
    .btn-reject{background:#ef4444;color:#fff;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}
  `]
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
