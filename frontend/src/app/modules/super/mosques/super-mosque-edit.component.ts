import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PlatformService, PlatformUser } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { MOSQUE_STATUSES, formatMosqueStatus } from '../../../core/utils/mosque-status.util';

@Component({
  selector: 'app-super-mosque-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header
      badge="Super Admin"
      title="Edit mosque listing"
      [subtitle]="form.name || 'Update listing details and assignments'" />

    <a [routerLink]="['/dashboard/super/mosques', mosqueId]" class="back-link">← Back to details</a>

    <div *ngIf="loading()" class="loading-msg">Loading…</div>

    <app-card *ngIf="!loading()" class="block mt-4">
      <div class="grid md:grid-cols-2 gap-3 mb-4">
        <div>
          <label class="field-label">Mosque name</label>
          <input class="admin-input" [(ngModel)]="form.name">
        </div>
        <div>
          <label class="field-label">URL slug</label>
          <input class="admin-input" [(ngModel)]="form.slug">
        </div>
        <div>
          <label class="field-label">City</label>
          <input class="admin-input" [(ngModel)]="form.city">
        </div>
        <div>
          <label class="field-label">Postcode</label>
          <input class="admin-input" [(ngModel)]="form.postcode">
        </div>
        <div class="md:col-span-2">
          <label class="field-label">Address</label>
          <input class="admin-input" [(ngModel)]="form.address">
        </div>
        <div>
          <label class="field-label">Phone</label>
          <input class="admin-input" [(ngModel)]="form.phone">
        </div>
        <div>
          <label class="field-label">Email</label>
          <input class="admin-input" type="email" [(ngModel)]="form.email">
        </div>
        <div>
          <label class="field-label">Website</label>
          <input class="admin-input" [(ngModel)]="form.website">
        </div>
        <div>
          <label class="field-label">Status</label>
          <select class="admin-input" [(ngModel)]="form.status">
            <option *ngFor="let s of statuses" [value]="s">{{ formatStatus(s) }}</option>
          </select>
        </div>
        <div>
          <label class="field-label">Map location</label>
          <input class="admin-input" [(ngModel)]="form.mapLocation">
        </div>
        <div>
          <label class="field-label">Latitude</label>
          <input class="admin-input" type="number" step="any" [(ngModel)]="form.latitude">
        </div>
        <div>
          <label class="field-label">Longitude</label>
          <input class="admin-input" type="number" step="any" [(ngModel)]="form.longitude">
        </div>
        <div class="md:col-span-2">
          <label class="field-label">Description</label>
          <textarea class="admin-input" rows="3" [(ngModel)]="form.description"></textarea>
        </div>
      </div>

      <h3 class="section-title">Assignments</h3>
      <div class="grid md:grid-cols-2 gap-3 mb-4">
        <div>
          <label class="field-label">Owner</label>
          <select class="admin-input" [(ngModel)]="form.ownerId">
            <option value="">No owner</option>
            <option *ngFor="let u of users()" [value]="u.id">{{ u.fullName }} ({{ u.userName }})</option>
          </select>
        </div>
        <div>
          <label class="field-label">Assign admin</label>
          <div class="assign-row">
            <select class="admin-input" [(ngModel)]="assignUserId">
              <option value="">Select user…</option>
              <option *ngFor="let u of users()" [value]="u.id">{{ u.fullName }}</option>
            </select>
            <button type="button" class="admin-btn admin-btn--sm" (click)="assignAdmin()" [disabled]="!assignUserId">Assign</button>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="admin-btn" (click)="save()" [disabled]="saving()">
          {{ saving() ? 'Saving…' : 'Save changes' }}
        </button>
        <button type="button" class="cancel-btn" (click)="cancel()">Cancel</button>
      </div>
      <p *ngIf="msg()" class="msg" [class.msg--ok]="msgOk()" [class.msg--err]="!msgOk()">{{ msg() }}</p>
    </app-card>
  `,
  styles: [`
    .back-link { display: inline-block; font-size: 0.8125rem; color: #6ee7b7; text-decoration: none; margin-bottom: 0.5rem; }
    .back-link:hover { color: #fcd34d; }
    .loading-msg { color: #6ee7b7; font-size: 0.875rem; margin-top: 1rem; }
    .field-label { display: block; font-size: 0.75rem; color: #6ee7b7; margin-bottom: 0.25rem; }
    .section-title { margin: 0 0 0.75rem; font-size: 0.9375rem; font-weight: 600; color: #fff; }
    .assign-row { display: flex; gap: 0.5rem; }
    .assign-row .admin-input { flex: 1; }
    .admin-btn--sm { padding: 0.5rem 0.75rem; font-size: 0.75rem; white-space: nowrap; }
    .form-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .cancel-btn {
      background: transparent; border: 1px solid #065f46; color: #6ee7b7;
      padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.8125rem;
    }
    .msg { margin: 0.75rem 0 0; font-size: 0.8125rem; }
    .msg--ok { color: #6ee7b7; }
    .msg--err { color: #fca5a5; }
  `]
})
export class SuperMosqueEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platform = inject(PlatformService);

  readonly statuses = MOSQUE_STATUSES;
  readonly formatStatus = formatMosqueStatus;

  mosqueId = 0;
  users = signal<PlatformUser[]>([]);
  loading = signal(true);
  saving = signal(false);
  msg = signal('');
  msgOk = signal(true);
  assignUserId = '';

  form = {
    name: '', slug: '', address: '', city: '', postcode: '', country: 'United Kingdom',
    phone: '', email: '', website: '', description: '', mapLocation: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    timezone: 'Europe/London',
    status: 'Unclaimed',
    ownerId: '',
  };

  ngOnInit(): void {
    this.mosqueId = Number(this.route.snapshot.paramMap.get('id'));
    this.platform.getUsers().subscribe(u => this.users.set(u));
    this.platform.getMosqueDetail(this.mosqueId).subscribe({
      next: d => {
        const m = d.mosque;
        this.form = {
          name: m.name,
          slug: m.slug,
          address: m.address,
          city: m.city,
          postcode: m.postcode,
          country: m.country,
          phone: m.phone ?? '',
          email: m.email ?? '',
          website: m.website ?? '',
          description: m.description ?? '',
          mapLocation: m.mapLocation ?? '',
          latitude: m.latitude,
          longitude: m.longitude,
          timezone: m.timezone,
          status: m.status,
          ownerId: m.ownerId ?? '',
        };
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  assignAdmin(): void {
    if (!this.assignUserId) return;
    this.platform.assignMosqueAdmin(this.mosqueId, this.assignUserId, false).subscribe({
      next: () => {
        this.msg.set('Admin assigned successfully.');
        this.msgOk.set(true);
        this.assignUserId = '';
      },
      error: () => {
        this.msg.set('Could not assign admin.');
        this.msgOk.set(false);
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.platform.updateMosque(this.mosqueId, {
      ...this.form,
      ownerId: this.form.ownerId,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.msg.set('Mosque listing updated.');
        this.msgOk.set(true);
        setTimeout(() => this.router.navigate(['/dashboard/super/mosques', this.mosqueId]), 600);
      },
      error: () => {
        this.saving.set(false);
        this.msg.set('Save failed — check slug is unique.');
        this.msgOk.set(false);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/dashboard/super/mosques', this.mosqueId]);
  }
}
