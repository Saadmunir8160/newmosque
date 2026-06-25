import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { Mosque } from '../../../core/models';

@Component({
  selector: 'app-admin-contact-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Settings" subtitle="Contact details, social links, and notifications" />

    <app-card *ngIf="mosque() as m">
      <h3 class="section">Mosque contact</h3>
      <div class="grid md:grid-cols-2 gap-3">
        <input class="input" [(ngModel)]="m.phone" placeholder="Phone">
        <input class="input" [(ngModel)]="m.email" placeholder="Email">
        <input class="input" [(ngModel)]="m.website" placeholder="Website">
        <input class="input" [(ngModel)]="m.postcode" placeholder="Postcode">
        <input class="input md:col-span-2" [(ngModel)]="m.address" placeholder="Address">
      </div>

      <h3 class="section mt-4">Social links</h3>
      <div class="grid md:grid-cols-2 gap-3">
        <input class="input" [(ngModel)]="m.facebookUrl" placeholder="Facebook URL">
        <input class="input" [(ngModel)]="m.instagramUrl" placeholder="Instagram URL">
      </div>

      <div class="actions mt-4">
        <button class="btn" (click)="save(m)">Save settings</button>
        <button class="btn-secondary" type="button" (click)="reset()">Reset</button>
      </div>
      <p *ngIf="msg()" class="msg">{{ msg() }}</p>
    </app-card>
  `,
  styles: [`
    .section { margin: 0 0 0.75rem; font-size: 0.875rem; font-weight: 600; color: #fcd34d; }
    .input { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }
    .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; }
    .btn-secondary { background: transparent; color: #a7f3d0; border: 1px solid #F8FAFC; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
    .msg { margin-top: 0.5rem; font-size: 0.8125rem; color: #6ee7b7; }
  `]
})
export class AdminContactSettingsComponent implements OnInit {
  private admin = inject(AdminService);
  private mosqueCtx = inject(MosqueContextService);

  mosque = signal<Mosque | null>(null);
  private snapshot: Mosque | null = null;
  msg = signal('');

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(async mosqueId => {
      if (this.mosqueCtx.mosque()) {
        const m = this.mosqueCtx.mosque()!;
        this.mosque.set({ ...m });
        this.snapshot = { ...m };
        return;
      }
      this.admin.getOwnerMosque().subscribe(res => {
        if (res.mosque) {
          this.mosque.set({ ...res.mosque });
          this.snapshot = { ...res.mosque };
        }
      });
    });
  }

  save(m: Mosque): void {
    this.admin.updateMosque(m.id, m).subscribe({
      next: updated => {
        this.mosque.set({ ...updated });
        this.snapshot = { ...updated };
        this.msg.set('Settings saved.');
      },
      error: () => this.msg.set('Save failed.'),
    });
  }

  reset(): void {
    if (this.snapshot) this.mosque.set({ ...this.snapshot });
    this.msg.set('Changes reset.');
  }
}
