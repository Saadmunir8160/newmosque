import { Component, OnInit, inject, signal } from '@angular/core';
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
    <app-page-header badge="Mosque Owner" title="Claim Your Mosque" subtitle="Claim an unclaimed listing — super admin verifies in MVP" />
    <p *ngIf="msg()" class="text-amber-400 mb-4">{{ msg() }}</p>
    <app-card *ngFor="let m of unclaimed()" class="block mb-4">
      <h4 class="text-white font-bold">{{ m.name }}</h4>
      <p class="text-emerald-300 text-sm mb-4">{{ m.address }}, {{ m.postcode }}</p>
      <button class="btn" (click)="claim(m.id)">Claim This Mosque</button>
    </app-card>
    <p *ngIf="!unclaimed().length" class="text-emerald-300">No unclaimed mosques available.</p>
  `,
  styles: [`.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}`]
})
export class OwnerClaimComponent implements OnInit {
  private admin = inject(AdminService);
  unclaimed = signal<Mosque[]>([]);
  msg = signal('');

  ngOnInit(): void {
    this.admin.getAllMosques().subscribe(m => this.unclaimed.set(m.filter(x => x.status === 'Unclaimed')));
  }

  claim(id: number): void {
    this.admin.claimMosque(id).subscribe({
      next: () => this.msg.set('Claim submitted. Awaiting super admin verification.'),
      error: () => this.msg.set('Could not claim — you may already have a pending claim.')
    });
  }
}
