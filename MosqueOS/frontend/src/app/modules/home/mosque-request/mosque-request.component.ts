import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MosqueService } from '../../../core/services/mosque.service';

@Component({
  selector: 'app-mosque-request',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mosque-request.component.html',
  styleUrls: ['./mosque-request.component.css'],
})
export class MosqueRequestComponent {
  private mosqueService = inject(MosqueService);

  mosqueName = '';
  city = '';
  postcode = '';
  address = '';
  submitterName = '';
  email = '';
  notes = '';

  submitting = signal(false);
  success = signal(false);
  error = signal('');
  successMessage = signal('');

  submit(): void {
    this.error.set('');

    if (!this.mosqueName.trim() || this.mosqueName.trim().length < 3) {
      this.error.set('Mosque name is required (minimum 3 characters).');
      return;
    }
    if (!this.city.trim()) {
      this.error.set('City is required.');
      return;
    }

    this.submitting.set(true);
    this.mosqueService.submitDiscoveryRequest({
      mosqueName: this.mosqueName.trim(),
      city: this.city.trim(),
      postcode: this.postcode.trim() || undefined,
      address: this.address.trim() || undefined,
      submitterName: this.submitterName.trim() || undefined,
      email: this.email.trim() || undefined,
      notes: this.notes.trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.success.set(true);
        this.successMessage.set(res.message);
        this.submitting.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Something went wrong. Please try again.');
        this.submitting.set(false);
      },
    });
  }
}
