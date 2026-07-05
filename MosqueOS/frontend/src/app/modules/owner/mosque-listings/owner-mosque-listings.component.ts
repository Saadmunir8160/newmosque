import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  ownerMosque = signal<Mosque | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  registerMsg = signal('');
  registerOk = signal(true);
  showRegister = signal(false);
  cityFilter = '';

  registerForm = {
    name: '',
    city: '',
    postcode: '',
    address: '',
    phone: '',
    email: '',
    description: '',
  };

  readonly formatStatus = formatMosqueStatus;
  readonly statusClass = statusClass;

  /** Brief Task 5: allow register when no mosque, or when current mosque is Active. */
  canRegisterNew = computed(() => {
    const m = this.ownerMosque();
    if (!m) return true;
    return m.status === 'Active';
  });

  registerBlockMessage = computed(() => {
    const m = this.ownerMosque();
    if (!m || this.canRegisterNew()) return '';
    return 'Complete verification of your current mosque before registering another listing.';
  });

  ngOnInit(): void {
    this.load();
    this.admin.getOwnerMosque().subscribe({
      next: (res) => this.ownerMosque.set(res.mosque),
      error: () => this.ownerMosque.set(null),
    });
  }

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

  toggleRegister(): void {
    if (!this.canRegisterNew()) return;
    this.showRegister.update(v => !v);
    this.registerMsg.set('');
  }

  submitRegister(): void {
    if (!this.canRegisterNew() || this.saving()) return;
    if (!this.registerForm.name.trim() || !this.registerForm.city.trim()) {
      this.registerMsg.set('Mosque name and city are required.');
      this.registerOk.set(false);
      return;
    }
    this.saving.set(true);
    this.registerMsg.set('');
    this.admin.submitNewMosqueListing({
      name: this.registerForm.name.trim(),
      city: this.registerForm.city.trim(),
      postcode: this.registerForm.postcode.trim(),
      address: this.registerForm.address.trim(),
      phone: this.registerForm.phone.trim(),
      email: this.registerForm.email.trim(),
      description: this.registerForm.description.trim(),
      country: 'United Kingdom',
      timezone: 'Europe/London',
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.registerOk.set(true);
        this.registerMsg.set('Mosque listing submitted for review. Track progress under My claims.');
        this.showRegister.set(false);
        this.registerForm = { name: '', city: '', postcode: '', address: '', phone: '', email: '', description: '' };
      },
      error: (err) => {
        this.saving.set(false);
        this.registerOk.set(false);
        this.registerMsg.set(err?.error?.message ?? 'Unable to submit listing.');
      },
    });
  }
}
