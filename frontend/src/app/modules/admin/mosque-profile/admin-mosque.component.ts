import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { ROLES } from '../../../core/constants/roles';
import { environment } from '../../../../environments/environment';
import { Mosque } from '../../../core/models';

@Component({
  selector: 'app-admin-mosque',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header [useAuthRole]="true" title="Mosque Profile" subtitle="Edit mosque details and public information" />

    <div *ngIf="!canEdit()" class="admin-empty mb-4">
      <p class="admin-empty-title">Editing locked</p>
      <p class="admin-empty-desc">Submit a verification claim first. You can edit once your mosque is Claimed or Active.</p>
    </div>

    <app-card *ngIf="mosque() as m">
      <a *ngIf="m.slug" [routerLink]="['/mosque', m.slug]" target="_blank" class="preview-link">Preview public profile →</a>
      <div class="grid md:grid-cols-2 gap-3" [class.opacity-50]="!canEdit()" [class.pointer-events-none]="!canEdit()">
        <input class="input" [(ngModel)]="m.name" placeholder="Name">
        <input class="input" [(ngModel)]="m.phone" placeholder="Phone">
        <input class="input" [(ngModel)]="m.email" placeholder="Email">
        <input class="input" [(ngModel)]="m.website" placeholder="Website">
        <input class="input md:col-span-2" [(ngModel)]="m.address" placeholder="Address">
        <textarea class="input md:col-span-2" rows="3" [(ngModel)]="m.description" placeholder="Description"></textarea>
      </div>
      <button class="btn mt-4" [disabled]="!canEdit()" (click)="save(m)">Save Changes</button>
      <p *ngIf="msg()" class="text-emerald-300 text-sm mt-2">{{ msg() }}</p>
    </app-card>
  `,
  styles: [`
    .input { background: #022c22; border: 1px solid #065f46; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }
    .btn { background: #f59e0b; color: #022c22; font-weight: 700; padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .preview-link { display: inline-block; margin-bottom: 1rem; font-size: 0.8125rem; font-weight: 600; color: #fbbf24; text-decoration: none; }
    .preview-link:hover { text-decoration: underline; }
  `]
})
export class AdminMosqueComponent implements OnInit {
  private admin = inject(AdminService);
  private mosqueService = inject(MosqueService);
  private auth = inject(AuthService);
  mosque = signal<Mosque | null>(null);
  msg = signal('');
  isOwner = computed(() => this.auth.hasRole(ROLES.MosqueOwner) && !this.auth.hasRole(ROLES.SuperAdmin));
  canEdit = computed(() => {
    const m = this.mosque();
    if (!m) return false;
    if (!this.isOwner()) return true;
    return m.status === 'Claimed' || m.status === 'Active';
  });

  ngOnInit(): void {
    if (this.isOwner()) {
      this.admin.getOwnerMosque().subscribe(res => this.mosque.set(res.mosque));
    } else {
      this.mosqueService.getBySlug(environment.defaultMosqueSlug).subscribe(m => this.mosque.set(m));
    }
  }

  save(m: Mosque): void {
    if (!this.canEdit()) return;
    this.admin.updateMosque(m.id, m).subscribe({
      next: () => this.msg.set('Profile updated.'),
      error: () => this.msg.set('Update failed.')
    });
  }
}
