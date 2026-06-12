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
    <app-page-header badge="Super Admin" title="Mosque Listings" subtitle="Create and seed unclaimed mosque listings for rollout" />
    <app-card>
      <h3 class="text-white font-bold mb-4">Seed New Mosque Listing</h3>
      <div class="grid md:grid-cols-2 gap-3 mb-4">
        <input class="input" placeholder="Name" [(ngModel)]="form.name">
        <input class="input" placeholder="Slug" [(ngModel)]="form.slug">
        <input class="input" placeholder="City" [(ngModel)]="form.city">
        <input class="input" placeholder="Postcode" [(ngModel)]="form.postcode">
        <input class="input md:col-span-2" placeholder="Address" [(ngModel)]="form.address">
        <textarea class="input md:col-span-2" rows="2" placeholder="Description" [(ngModel)]="form.description"></textarea>
      </div>
      <button class="btn" (click)="seed()">Seed Listing (Unclaimed)</button>
      <p *ngIf="msg()" class="text-emerald-300 text-sm mt-2">{{ msg() }}</p>
    </app-card>
    <div class="mt-6 space-y-3">
      <app-card *ngFor="let m of mosques()">
        <div class="flex justify-between items-start">
          <div>
            <h4 class="text-white font-bold">{{ m.name }}</h4>
            <p class="text-emerald-300 text-sm">{{ m.city }} · <span [class.text-amber-400]="m.status==='Claimed'" [class.text-green-400]="m.status==='Active'">{{ m.status }}</span></p>
          </div>
        </div>
      </app-card>
    </div>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:10px 20px;border-radius:8px;border:none;cursor:pointer}`]
})
export class SuperMosquesComponent implements OnInit {
  private admin = inject(AdminService);
  private platform = inject(PlatformService);
  mosques = signal<Mosque[]>([]);
  msg = signal('');
  form = { name: '', slug: '', city: 'Bradford', postcode: '', address: '', description: '' };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.admin.getAllMosques().subscribe(m => this.mosques.set(m));
  }

  seed(): void {
    this.platform.seedMosque({ ...this.form, country: 'United Kingdom', timezone: 'Europe/London' }).subscribe({
      next: () => {
        this.msg.set('Mosque listing seeded as Unclaimed.');
        this.form = { name: '', slug: '', city: 'Bradford', postcode: '', address: '', description: '' };
        this.load();
      },
      error: () => this.msg.set('Failed — slug may already exist.')
    });
  }
}
