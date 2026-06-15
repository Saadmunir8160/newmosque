import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { PlatformService } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { Mosque } from '../../../core/models';

@Component({
  selector: 'app-super-mosques',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header
      badge="Super Admin"
      title="Mosque listings"
      subtitle="Add unclaimed mosques for rollout and monitor status across Bradford and beyond." />

    <app-card class="block mb-5">
      <h3 class="heading-section text-base mb-1">Add new listing</h3>
      <p class="text-sm text-emerald-300/80 mb-4">Creates an unclaimed mosque ready for an owner to claim later.</p>
      <div class="grid md:grid-cols-2 gap-3 mb-4">
        <div>
          <label class="block text-xs text-emerald-400 mb-1">Mosque name</label>
          <input class="admin-input" placeholder="Masjid Al-Noor" [(ngModel)]="form.name">
        </div>
        <div>
          <label class="block text-xs text-emerald-400 mb-1">URL slug</label>
          <input class="admin-input" placeholder="masjid-al-noor-bradford" [(ngModel)]="form.slug">
        </div>
        <div>
          <label class="block text-xs text-emerald-400 mb-1">City</label>
          <input class="admin-input" [(ngModel)]="form.city">
        </div>
        <div>
          <label class="block text-xs text-emerald-400 mb-1">Postcode</label>
          <input class="admin-input" placeholder="BD1 1AA" [(ngModel)]="form.postcode">
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs text-emerald-400 mb-1">Address</label>
          <input class="admin-input" [(ngModel)]="form.address">
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs text-emerald-400 mb-1">Short description</label>
          <textarea class="admin-input" rows="2" [(ngModel)]="form.description"></textarea>
        </div>
      </div>
      <button type="button" class="admin-btn" (click)="seed()">Create listing</button>
      <p *ngIf="msg()" class="text-sm mt-3" [class.text-emerald-300]="msgOk()" [class.text-red-300]="!msgOk()">{{ msg() }}</p>
    </app-card>

    <h3 class="heading-section text-base mb-3">All listings ({{ mosques().length }})</h3>
    <div class="space-y-3">
      <app-card *ngFor="let m of mosques()" [interactive]="true">
        <div class="flex justify-between items-start gap-3">
          <div>
            <h4 class="text-white font-semibold m-0">{{ m.name }}</h4>
            <p class="admin-meta mt-1">{{ m.city }} · {{ m.postcode || '—' }}</p>
          </div>
          <span class="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full border status-pill"
            [attr.data-status]="m.status">
            {{ m.status }}
          </span>
        </div>
      </app-card>
    </div>
  `,
  styles: [`
    .status-pill[data-status="Active"] { color: #6ee7b7; border-color: #047857; }
    .status-pill[data-status="Claimed"] { color: #fcd34d; border-color: rgba(245, 158, 11, 0.45); }
    .status-pill[data-status="Unclaimed"] { color: #94a3b8; border-color: #475569; }
  `]
})
export class SuperMosquesComponent implements OnInit {
  private admin = inject(AdminService);
  private platform = inject(PlatformService);
  mosques = signal<Mosque[]>([]);
  msg = signal('');
  msgOk = signal(true);
  form = { name: '', slug: '', city: 'Bradford', postcode: '', address: '', description: '' };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.admin.getAllMosques().subscribe(m => this.mosques.set(m));
  }

  seed(): void {
    this.platform.seedMosque({ ...this.form, country: 'United Kingdom', timezone: 'Europe/London' }).subscribe({
      next: () => {
        this.msg.set('Listing created successfully.');
        this.msgOk.set(true);
        this.form = { name: '', slug: '', city: 'Bradford', postcode: '', address: '', description: '' };
        this.load();
      },
      error: () => {
        this.msg.set('Could not create listing — check the slug is unique.');
        this.msgOk.set(false);
      }
    });
  }
}
