import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { Mosque, MosqueSetting } from '../../../core/models';

@Component({
  selector: 'app-super-features',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Super Admin" title="Feature Flags" subtitle="Enable or disable modules for any mosque" />

    <app-card class="mb-6">
      <select class="input" [(ngModel)]="mosqueId" (ngModelChange)="loadSettings()">
        <option [ngValue]="0">Select mosque...</option>
        <option *ngFor="let m of mosques()" [ngValue]="m.id">{{ m.name }}</option>
      </select>
    </app-card>

    <app-card *ngFor="let s of settings()" class="block mb-3">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <span class="text-white font-bold min-w-0 break-anywhere">{{ s.moduleKey }}</span>
        <button class="btn shrink-0 self-start sm:self-center" [class.off]="!s.isEnabled" (click)="toggle(s)">{{ s.isEnabled ? 'Enabled' : 'Disabled' }}</button>
      </div>
    </app-card>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#10b981;color:#022c22;font-weight:700;padding:6px 14px;border-radius:6px;border:none;cursor:pointer}.off{background:#64748b;color:#fff}`]
})
export class SuperFeaturesComponent implements OnInit {
  private admin = inject(AdminService);
  mosques = signal<Mosque[]>([]);
  settings = signal<MosqueSetting[]>([]);
  mosqueId = 0;

  ngOnInit(): void { this.admin.getAllMosques().subscribe(m => this.mosques.set(m)); }

  loadSettings(): void {
    if (!this.mosqueId) { this.settings.set([]); return; }
    this.admin.getSettings(this.mosqueId).subscribe(s => this.settings.set(s));
  }

  toggle(s: MosqueSetting): void {
    this.admin.setModuleFlag(this.mosqueId, s.moduleKey, !s.isEnabled).subscribe(updated => {
      this.settings.update(list => list.map(x => x.moduleKey === updated.moduleKey ? updated : x));
    });
  }
}
