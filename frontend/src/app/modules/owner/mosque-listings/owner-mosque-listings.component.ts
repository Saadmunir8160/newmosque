import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { Mosque } from '../../../core/models';
import { formatMosqueStatus, statusClass } from '../../../core/utils/mosque-status.util';

@Component({
  selector: 'app-owner-mosque-listings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './owner-mosque-listings.component.html',
  styleUrl: './owner-mosque-listings.component.css',
})
export class OwnerMosqueListingsComponent implements OnInit {
  private admin = inject(AdminService);
  listings = signal<Mosque[]>([]);
  loading = signal(false);
  error = signal('');
  cityFilter = '';
  readonly formatStatus = formatMosqueStatus;
  readonly statusClass = statusClass;

  ngOnInit(): void { this.load(); }

  mosqueInitial(name: string): string {
    const trimmed = (name ?? '').trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : '🕌';
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getDirectoryMosques(this.cityFilter.trim() || undefined).subscribe({
      next: (items) => {
        this.listings.set(items ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Could not load mosque listings.');
        this.loading.set(false);
      },
    });
  }
}
