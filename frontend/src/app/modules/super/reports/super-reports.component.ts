import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { PlatformService, PlatformStats } from '../../../core/services/platform.service';
import { Mosque } from '../../../core/models';
import { formatMosqueStatus, statusClass } from '../../../core/utils/mosque-status.util';

@Component({
  selector: 'app-super-reports',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './super-reports.component.html',
  styleUrl: './super-reports.component.css',
})
export class SuperReportsComponent implements OnInit {
  private platform = inject(PlatformService);
  private admin = inject(AdminService);

  stats = signal<PlatformStats | null>(null);
  mosques = signal<Mosque[]>([]);
  loading = signal(true);
  toast = signal('');
  toastOk = signal(true);

  statusRows = computed(() => {
    const list = this.mosques();
    const tally = (s: string) => list.filter(m => m.status === s).length;
    return [
      { label: 'Active', count: tally('Active'), tone: 'active' },
      { label: 'Pending review', count: tally('PendingReview'), tone: 'pending' },
      { label: 'Claim pending', count: tally('ClaimPending') + tally('Claimed'), tone: 'claimed' },
      { label: 'Unclaimed', count: tally('Unclaimed'), tone: 'unclaimed' },
    ];
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    forkJoin({
      stats: this.platform.getStats(),
      mosques: this.admin.getAllMosques(),
    }).subscribe({
      next: ({ stats, mosques }) => {
        this.stats.set(stats);
        this.mosques.set(mosques);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showToast('Could not load platform analytics.', false);
      },
    });
  }

  formatStatus = formatMosqueStatus;
  statusClass = statusClass;

  private showToast(msg: string, ok: boolean): void {
    this.toastOk.set(ok);
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3200);
  }
}
