import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlatformService, OversightAnnouncementRow } from '../../../core/services/platform.service';
import { formatMosqueStatus } from '../../../core/utils/mosque-status.util';

@Component({
  selector: 'app-super-oversight-announcements',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './super-oversight-announcements.component.html',
  styleUrls: ['../claims/super-claims.component.css', './super-oversight.shared.css'],
})
export class SuperOversightAnnouncementsComponent implements OnInit {
  private platform = inject(PlatformService);

  items = signal<OversightAnnouncementRow[]>([]);
  loading = signal(false);
  error = signal('');
  search = signal('');
  statusFilter = signal<'All' | 'Published' | 'Draft' | 'Unpublished'>('All');
  readonly formatStatus = formatMosqueStatus;

  filtered = computed(() => {
    let list = [...this.items()];
    const q = this.search().trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.title.toLowerCase().includes(q)
        || r.mosqueName.toLowerCase().includes(q)
        || r.summary.toLowerCase().includes(q));
    }
    const sf = this.statusFilter();
    if (sf !== 'All') list = list.filter(r => r.status === sf);
    return list;
  });

  publishedCount = computed(() => this.items().filter(i => i.status === 'Published').length);
  draftCount = computed(() => this.items().filter(i => i.status === 'Draft').length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.platform.getOversightAnnouncements().subscribe({
      next: rows => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Failed to load announcements oversight.');
        this.loading.set(false);
      },
    });
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  }

  statusBadge(status: string): string {
    if (status === 'Published') return 'sc-badge sc-badge--ok';
    if (status === 'Draft') return 'sc-badge sc-badge--pending';
    return 'sc-badge sc-badge--muted';
  }
}
