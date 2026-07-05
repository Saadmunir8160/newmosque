import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { JanazaAnnouncement, JanazaStatus } from '../../../core/models';

type SortKey = 'name' | 'janazaDate' | 'burialLocation' | 'posted';

@Component({
  selector: 'app-admin-janaza',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-janaza.component.html',
  styleUrl: './admin-janaza.component.css',
})
export class AdminJanazaComponent implements OnInit {
  private admin = inject(AdminService);
  private mosque = inject(MosqueService);
  private mosqueCtx = inject(MosqueContextService);

  items = signal<JanazaAnnouncement[]>([]);
  loading = signal(true);
  saving = signal(false);
  drawerOpen = signal(false);
  editingId = signal<number | null>(null);
  openMenuId = signal<number | null>(null);
  toast = signal('');
  toastOk = signal(true);

  search = '';
  sortKey: SortKey = 'janazaDate';
  sortAsc = false;
  page = signal(1);
  pageSize = 10;
  mid = 1;

  form = {
    name: '',
    dateOfDeath: '',
    janazaDate: '',
    janazaTime: '13:30',
    location: '',
    burialLocation: '',
    notes: '',
    status: 'Draft' as JanazaStatus,
  };

  filtered = computed(() => {
    const term = this.search.trim().toLowerCase();
    let list = [...this.items()];
    if (term) {
      list = list.filter(j =>
        j.name.toLowerCase().includes(term) ||
        j.location?.toLowerCase().includes(term) ||
        j.burialLocation?.toLowerCase().includes(term));
    }
    list.sort((a, b) => this.compare(a, b, this.sortKey));
    if (this.sortAsc) list.reverse();
    return list;
  });

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => { this.mid = id; this.load(); });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawerOpen()) this.closeDrawer();
  }

  @HostListener('document:click')
  closeMenus(): void {
    this.openMenuId.set(null);
  }

  onSearchChange(): void {
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.mosque.getJanaza(this.mid, this.search.trim() || undefined).subscribe({
      next: j => { this.items.set(j); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setSort(key: SortKey): void {
    if (this.sortKey === key) this.sortAsc = !this.sortAsc;
    else { this.sortKey = key; this.sortAsc = false; }
  }

  toggleSort(): void {
    this.sortAsc = !this.sortAsc;
  }

  setPage(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form = {
      name: '', dateOfDeath: '', janazaDate: '', janazaTime: '13:30',
      location: '', burialLocation: '', notes: '', status: 'Draft',
    };
    this.drawerOpen.set(true);
  }

  openEdit(j: JanazaAnnouncement): void {
    this.openMenuId.set(null);
    this.editingId.set(j.id);
    this.form = {
      name: j.name,
      dateOfDeath: j.dateOfDeath?.slice(0, 10) ?? '',
      janazaDate: j.janazaDate?.slice(0, 10) ?? '',
      janazaTime: j.janazaTime?.slice(0, 5) ?? '13:30',
      location: j.location ?? '',
      burialLocation: j.burialLocation ?? '',
      notes: j.notes ?? '',
      status: (j.status as JanazaStatus) ?? 'Draft',
    };
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.editingId.set(null);
  }

  save(): void {
    if (!this.form.name.trim()) return;
    this.saving.set(true);
    const payload = {
      name: this.form.name.trim(),
      dateOfDeath: this.form.dateOfDeath || this.form.janazaDate,
      janazaDate: this.form.janazaDate,
      janazaTime: this.form.janazaTime.length === 5 ? `${this.form.janazaTime}:00` : this.form.janazaTime,
      location: this.form.location,
      burialLocation: this.form.burialLocation || undefined,
      notes: this.form.notes || undefined,
      status: this.form.status,
    };

    const id = this.editingId();
    const req = id
      ? this.admin.updateJanaza(this.mid, id, payload)
      : this.admin.createJanaza(this.mid, payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDrawer();
        this.showToast(id ? 'Janaza updated.' : 'Janaza posted.', true);
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.showToast('Could not save janaza.', false);
      },
    });
  }

  publish(j: JanazaAnnouncement): void {
    this.openMenuId.set(null);
    this.admin.publishJanaza(this.mid, j.id).subscribe({
      next: () => { this.showToast('Janaza published.', true); this.load(); },
      error: () => this.showToast('Publish failed.', false),
    });
  }

  del(j: JanazaAnnouncement): void {
    this.openMenuId.set(null);
    if (!confirm(`Remove janaza announcement for ${j.name}?`)) return;
    this.admin.deleteJanaza(this.mid, j.id).subscribe({
      next: () => { this.showToast('Janaza removed.', true); this.load(); },
      error: () => this.showToast('Delete failed.', false),
    });
  }

  copyLink(j: JanazaAnnouncement): void {
    const url = `${window.location.origin}/dashboard/guest/janaza?mosque=${this.mid}&id=${j.id}`;
    navigator.clipboard.writeText(url).then(
      () => this.showToast('Link copied to clipboard.', true),
      () => this.showToast('Could not copy link.', false),
    );
  }

  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update(cur => cur === id ? null : id);
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatJanazaDateTime(j: JanazaAnnouncement): string {
    const date = this.formatDate(j.janazaDate);
    const time = this.formatTime(j.janazaTime);
    return `${date} | ${time}`;
  }

  formatTime(t: string): string {
    if (!t) return '—';
    const parts = t.split(':');
    if (parts.length < 2) return t;
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }

  postedAgo(j: JanazaAnnouncement): string {
    const raw = j.publishedAt ?? j.createdAt;
    if (!raw) return '';
    const days = Math.floor((Date.now() - new Date(raw).getTime()) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  private compare(a: JanazaAnnouncement, b: JanazaAnnouncement, key: SortKey): number {
    switch (key) {
      case 'name': return a.name.localeCompare(b.name);
      case 'burialLocation': return (a.burialLocation ?? '').localeCompare(b.burialLocation ?? '');
      case 'posted': {
        const ta = new Date(a.publishedAt ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.publishedAt ?? b.createdAt ?? 0).getTime();
        return ta - tb;
      }
      default: {
        const da = new Date(a.janazaDate).getTime();
        const db = new Date(b.janazaDate).getTime();
        return da - db;
      }
    }
  }

  private showToast(msg: string, ok: boolean): void {
    this.toastOk.set(ok);
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3200);
  }
}
