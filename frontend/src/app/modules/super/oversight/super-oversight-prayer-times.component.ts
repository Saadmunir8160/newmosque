import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlatformService, OversightPrayerRow } from '../../../core/services/platform.service';
import { formatMosqueStatus } from '../../../core/utils/mosque-status.util';
import { SuperAdminPageHeaderComponent } from '../../../shared/ui/super-admin-page-header.component';

@Component({
  selector: 'app-super-oversight-prayer-times',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SuperAdminPageHeaderComponent],
  templateUrl: './super-oversight-prayer-times.component.html',
  styleUrls: ['../claims/super-claims.component.css', './super-oversight.shared.css'],
})
export class SuperOversightPrayerTimesComponent implements OnInit {
  private platform = inject(PlatformService);

  items = signal<OversightPrayerRow[]>([]);
  loading = signal(false);
  error = signal('');
  search = signal('');
  coverageFilter = signal<'All' | 'Missing' | 'Published' | 'Draft'>('All');
  selectedDate = signal(new Date().toISOString().slice(0, 10));
  readonly formatStatus = formatMosqueStatus;

  filtered = computed(() => {
    let list = [...this.items()];
    const q = this.search().trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.mosqueName.toLowerCase().includes(q) || r.mosqueCity.toLowerCase().includes(q));
    }
    const cf = this.coverageFilter();
    if (cf === 'Missing') list = list.filter(r => !r.hasTimes || r.status === 'Missing');
    else if (cf === 'Published') list = list.filter(r => r.status === 'Published');
    else if (cf === 'Draft') list = list.filter(r => r.status === 'Draft');
    return list;
  });

  missingCount = computed(() => this.items().filter(i => !i.hasTimes || i.status === 'Missing').length);
  publishedCount = computed(() => this.items().filter(i => i.status === 'Published').length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.platform.getOversightPrayerTimes(this.selectedDate()).subscribe({
      next: rows => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Failed to load prayer times oversight.');
        this.loading.set(false);
      },
    });
  }

  onDateChange(value: string): void {
    this.selectedDate.set(value);
    this.load();
  }

  formatTime(value?: string | null): string {
    if (!value) return '—';
    return value.length >= 5 ? value.slice(0, 5) : value;
  }

  statusBadge(row: OversightPrayerRow): string {
    if (!row.hasTimes || row.status === 'Missing') return 'sc-badge sc-badge--warn';
    if (row.status === 'Published') return 'sc-badge sc-badge--ok';
    return 'sc-badge sc-badge--pending';
  }

  statusLabel(row: OversightPrayerRow): string {
    if (!row.hasTimes || row.status === 'Missing') return 'Missing';
    return row.status;
  }
}
