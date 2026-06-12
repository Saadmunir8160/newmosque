import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { environment } from '../../../../environments/environment';
import { Mosque } from '../../../core/models';

@Component({
  selector: 'app-admin-mosque',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Mosque Profile" subtitle="Edit mosque details and public information" />
    <app-card *ngIf="mosque() as m">
      <div class="grid md:grid-cols-2 gap-3">
        <input class="input" [(ngModel)]="m.name" placeholder="Name">
        <input class="input" [(ngModel)]="m.phone" placeholder="Phone">
        <input class="input" [(ngModel)]="m.email" placeholder="Email">
        <input class="input" [(ngModel)]="m.website" placeholder="Website">
        <input class="input md:col-span-2" [(ngModel)]="m.address" placeholder="Address">
        <textarea class="input md:col-span-2" rows="3" [(ngModel)]="m.description" placeholder="Description"></textarea>
      </div>
      <button class="btn mt-4" (click)="save(m)">Save Changes</button>
      <p *ngIf="msg()" class="text-emerald-300 text-sm mt-2">{{ msg() }}</p>
    </app-card>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:10px 20px;border-radius:8px;border:none;cursor:pointer}`]
})
export class AdminMosqueComponent implements OnInit {
  private admin = inject(AdminService);
  private mosqueService = inject(MosqueService);
  mosque = signal<Mosque | null>(null);
  msg = signal('');

  ngOnInit(): void {
    this.mosqueService.getBySlug(environment.defaultMosqueSlug).subscribe(m => this.mosque.set(m));
  }

  save(m: Mosque): void {
    this.admin.updateMosque(m.id, m).subscribe({
      next: () => this.msg.set('Profile updated.'),
      error: () => this.msg.set('Update failed.')
    });
  }
}
