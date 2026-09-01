import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlatformService, OversightJanazaRow } from '../../../core/services/platform.service';
import { formatMosqueStatus, statusClass } from '../../../core/utils/mosque-status.util';
import { SuperAdminPageHeaderComponent } from '../../../shared/ui/super-admin-page-header.component';

@Component({
  selector: 'app-super-oversight-janaza',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SuperAdminPageHeaderComponent],
  templateUrl: './super-oversight-janaza.component.html',
  styleUrls: ['../claims/super-claims.component.css', './super-oversight.shared.css'],
})
export class SuperOversightJanazaComponent implements OnInit {
  private platform = inject(PlatformService);

  items = signal<OversightJanazaRow[]>([]);
  loading = signal(false);
  error = signal('');
  search = signal('');
  statusFilter = signal<'All' | 'Published' | 'Draft'>('All');
  readonly formatStatus = formatMosqueStatus;
  readonly statusClass = statusClass;

  filtered = computed(() => {
    let list = [...this.items()];
    const q = this.search().trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.name.toLowerCase().includes(q)
        || r.mosqueName.toLowerCase().includes(q)
        || r.mosqueCity.toLowerCase().includes(q)
        || r.location.toLowerCase().includes(q));
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
    this.platform.getOversightJanaza().subscribe({
      next: rows => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Failed to load janaza oversight.');
        this.loading.set(false);
      },
    });
  }

  formatDate(value: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
  }

  formatTime(value: string): string {
    if (!value) return '—';
    return value.length >= 5 ? value.slice(0, 5) : value;
  }

  statusBadge(status: string): string {
    return status === 'Published' ? 'sc-badge sc-badge--ok' : 'sc-badge sc-badge--pending';
  }
}
