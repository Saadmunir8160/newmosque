import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminRegistrationItem, RegistrationService } from '../../../core/services/registration.service';

@Component({
  selector: 'app-super-registrations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './super-registrations.component.html',
  styleUrls: ['./super-registrations.component.css'],
})
export class SuperRegistrationsComponent implements OnInit {
  private registrations = inject(RegistrationService);

  items = signal<AdminRegistrationItem[]>([]);
  loading = signal(false);
  error = signal('');
  toast = signal('');
  toastOk = signal(true);
  statusFilter = signal<'Pending' | 'All'>('Pending');
  selected = signal<AdminRegistrationItem | null>(null);
  rejectReason = '';
  acting = signal(false);

  filtered = computed(() => {
    const list = this.items();
    if (this.statusFilter() === 'All') return list;
    return list.filter(i => String(i.status).toLowerCase() === 'pending' || i.status === 0);
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.registrations.list().subscribe({
      next: (rows) => {
        this.items.set(rows ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load registrations.');
        this.loading.set(false);
      },
    });
  }

  statusLabel(status: string | number): string {
    if (typeof status === 'number') {
      return status === 0 ? 'Pending' : status === 1 ? 'Approved' : 'Rejected';
    }
    return status;
  }

  open(item: AdminRegistrationItem): void {
    this.selected.set(item);
    this.rejectReason = '';
    this.registrations.get(item.id).subscribe({
      next: (detail) => this.selected.set(detail),
      error: () => { /* keep list row */ },
    });
  }

  close(): void {
    if (this.acting()) return;
    this.selected.set(null);
  }

  approve(): void {
    const item = this.selected();
    if (!item || this.acting()) return;
    if (!confirm(`Approve registration for "${item.name}"? A CLAIMED mosque will be created for the submitter.`)) return;
    this.acting.set(true);
    this.registrations.approve(item.id).subscribe({
      next: (res) => {
        this.acting.set(false);
        this.toast.set(res.message || 'Approved.');
        this.toastOk.set(true);
        this.selected.set(null);
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.error?.message ?? 'Approve failed.');
      },
    });
  }

  reject(): void {
    const item = this.selected();
    const reason = this.rejectReason.trim();
    if (!item || this.acting()) return;
    if (!reason) {
      this.error.set('Rejection reason is required.');
      return;
    }
    this.acting.set(true);
    this.registrations.reject(item.id, reason).subscribe({
      next: (res) => {
        this.acting.set(false);
        this.toast.set(res.message || 'Rejected.');
        this.toastOk.set(true);
        this.selected.set(null);
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.error?.message ?? 'Reject failed.');
      },
    });
  }
}
