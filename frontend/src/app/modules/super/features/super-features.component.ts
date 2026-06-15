import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { Mosque, MosqueSetting } from '../../../core/models';

const MODULE_LABELS: Record<string, string> = {
  PrayerTimes: 'Prayer times',
  Announcements: 'Announcements',
  Events: 'Events',
  Madrassah: 'Madrassah',
  Communities: 'Communities',
  Awrad: 'Awrad & Wird',
  Adhkar: 'Daily adhkar',
  Duas: 'Duas library',
  Quran: 'Qur\'an plans',
  RitualGuides: 'Ritual guides',
  Janaza: 'Janaza',
  DeathReadings: 'Death readings',
  Participation: 'Community participation',
  JourneyGuides: 'Umrah & Hajj guides',
};

@Component({
  selector: 'app-super-features',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header
      badge="Super Admin"
      title="Module toggles"
      subtitle="Turn features on or off for each mosque. Disabled modules are hidden from that mosque's menu." />

    <app-card class="block mb-4">
      <label class="block text-xs text-emerald-400 mb-1">Select mosque</label>
      <select class="admin-input" [(ngModel)]="mosqueId" (ngModelChange)="loadSettings()">
        <option [ngValue]="0">Choose a mosque…</option>
        <option *ngFor="let m of mosques()" [ngValue]="m.id">{{ m.name }} ({{ m.city }})</option>
      </select>
    </app-card>

    <div *ngIf="mosqueId && !settings().length" class="admin-empty">
      <p class="admin-empty-title">No modules configured</p>
      <p class="admin-empty-desc">This mosque has no feature flags yet.</p>
    </div>

    <div *ngIf="!mosqueId" class="admin-empty">
      <p class="admin-empty-desc">Select a mosque above to manage its modules.</p>
    </div>

    <app-card *ngFor="let s of settings()" class="block mb-2" [interactive]="true">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <span class="text-white font-medium">{{ moduleLabel(s.moduleKey) }}</span>
          <p class="text-xs text-emerald-600 m-0 mt-0.5">{{ s.moduleKey }}</p>
        </div>
        <button type="button" class="admin-btn shrink-0" [class.admin-btn--ghost]="!s.isEnabled"
          [class.admin-btn--success]="s.isEnabled" (click)="toggle(s)">
          {{ s.isEnabled ? 'Enabled' : 'Disabled' }}
        </button>
      </div>
    </app-card>
  `
})
export class SuperFeaturesComponent implements OnInit {
  private admin = inject(AdminService);
  mosques = signal<Mosque[]>([]);
  settings = signal<MosqueSetting[]>([]);
  mosqueId = 0;

  ngOnInit(): void { this.admin.getAllMosques().subscribe(m => this.mosques.set(m)); }

  moduleLabel(key: string): string {
    return MODULE_LABELS[key] ?? key;
  }

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
