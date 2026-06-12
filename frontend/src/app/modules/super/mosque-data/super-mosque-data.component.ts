import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { PlatformService, MosqueSnapshot } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { Mosque } from '../../../core/models';
import { PlatformUser } from '../../../core/services/platform.service';

@Component({
  selector: 'app-super-mosque-data',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Super Admin" title="Mosque Data" subtitle="View any mosque and assign admins" />

    <app-card class="mb-6">
      <label class="text-emerald-300 text-sm">Select mosque</label>
      <select class="input mt-1" [(ngModel)]="selectedId" (ngModelChange)="loadSnapshot()">
        <option [ngValue]="0">Choose...</option>
        <option *ngFor="let m of mosques()" [ngValue]="m.id">{{ m.name }} ({{ m.status }})</option>
      </select>
    </app-card>

    <div *ngIf="snapshot() as snap">
      <div class="grid md:grid-cols-4 gap-4 mb-6">
        <app-card><p class="text-stat-label">Announcements</p><p class="text-2xl font-bold text-white">{{ snap.announcementCount }}</p></app-card>
        <app-card><p class="text-stat-label">Events</p><p class="text-2xl font-bold text-white">{{ snap.eventCount }}</p></app-card>
        <app-card><p class="text-stat-label">Students</p><p class="text-2xl font-bold text-white">{{ snap.studentCount }}</p></app-card>
        <app-card><p class="text-stat-label">Communities</p><p class="text-2xl font-bold text-white">{{ snap.communityCount }}</p></app-card>
      </div>

      <app-card class="mb-6">
        <h3 class="text-white font-bold text-lg mb-2">{{ snap.mosque.name }}</h3>
        <p class="text-emerald-200 text-sm">{{ snap.mosque.address }}, {{ snap.mosque.city }} {{ snap.mosque.postcode }}</p>
        <p class="text-emerald-300 text-sm mt-2">Status: {{ snap.mosque.status }} · Slug: {{ snap.mosque.slug }}</p>
        <p class="text-emerald-100 text-sm mt-4">{{ snap.mosque.description }}</p>
      </app-card>

      <app-card>
        <h4 class="text-white font-bold mb-3">Assign Mosque Admin</h4>
        <select class="input mb-3" [(ngModel)]="assignUserId">
          <option value="">Select user...</option>
          <option *ngFor="let u of users()" [value]="u.id">{{ u.fullName }} ({{ u.userName }})</option>
        </select>
        <label class="text-emerald-300 text-sm flex items-center gap-2 mb-3">
          <input type="checkbox" [(ngModel)]="setAsOwner"> Also set as mosque owner
        </label>
        <button class="btn" (click)="assignAdmin()">Assign Admin</button>
        <p *ngIf="msg()" class="text-emerald-300 text-sm mt-2">{{ msg() }}</p>
      </app-card>
    </div>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}`]
})
export class SuperMosqueDataComponent implements OnInit {
  private admin = inject(AdminService);
  private platform = inject(PlatformService);
  mosques = signal<Mosque[]>([]);
  users = signal<PlatformUser[]>([]);
  snapshot = signal<MosqueSnapshot | null>(null);
  selectedId = 0;
  assignUserId = '';
  setAsOwner = false;
  msg = signal('');

  ngOnInit(): void {
    this.admin.getAllMosques().subscribe(m => this.mosques.set(m));
    this.platform.getUsers().subscribe(u => this.users.set(u));
  }

  loadSnapshot(): void {
    if (!this.selectedId) { this.snapshot.set(null); return; }
    this.platform.getMosqueSnapshot(this.selectedId).subscribe(s => this.snapshot.set(s));
  }

  assignAdmin(): void {
    if (!this.selectedId || !this.assignUserId) return;
    this.platform.assignMosqueAdmin(this.selectedId, this.assignUserId, this.setAsOwner).subscribe({
      next: () => { this.msg.set('Admin assigned.'); this.loadSnapshot(); },
      error: () => this.msg.set('Failed to assign.')
    });
  }
}
