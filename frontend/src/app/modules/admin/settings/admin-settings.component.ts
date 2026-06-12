import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { environment } from '../../../../environments/environment';
import { MosqueSetting } from '../../../core/models';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Module Settings" subtitle="Enable or disable modules per mosque" />
    <app-card *ngFor="let s of settings()" class="block mb-3">
      <div class="flex justify-between items-center">
        <span class="text-white font-bold">{{ s.moduleKey }}</span>
        <button class="btn" [class.off]="!s.isEnabled" (click)="toggle(s)">{{ s.isEnabled ? 'Enabled' : 'Disabled' }}</button>
      </div>
    </app-card>
  `,
  styles: [`.btn{background:#10b981;color:#022c22;font-weight:700;padding:6px 14px;border-radius:6px;border:none;cursor:pointer}.off{background:#64748b;color:#fff}`]
})
export class AdminSettingsComponent implements OnInit {
  private admin = inject(AdminService);
  settings = signal<MosqueSetting[]>([]);
  mid = environment.defaultMosqueId;

  ngOnInit(): void { this.admin.getSettings(this.mid).subscribe(s => this.settings.set(s)); }

  toggle(s: MosqueSetting): void {
    this.admin.setModuleFlag(this.mid, s.moduleKey, !s.isEnabled).subscribe(updated => {
      this.settings.update(list => list.map(x => x.moduleKey === updated.moduleKey ? updated : x));
    });
  }
}
