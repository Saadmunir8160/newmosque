import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { Mosque, MosqueSetting } from '../../../core/models';

const MODULE_LABELS: Record<string, string> = {
  PrayerTimes: 'Prayer times',
  Announcements: 'Announcements',
  Events: 'Events',
  Janaza: 'Janaza',
  Donations: 'Donations',
  Courses: 'Courses',
  VolunteerManagement: 'Volunteer Management',
  CommunityServices: 'Community Services',
};

const MODULE_ORDER = [
  'PrayerTimes', 'Announcements', 'Events', 'Janaza', 
  'Donations', 'Courses', 'VolunteerManagement', 'CommunityServices'
];

@Component({
  selector: 'app-super-features',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './super-features.component.html',
  styleUrl: './super-features.component.css',
})
export class SuperFeaturesComponent implements OnInit {
  private admin = inject(AdminService);

  mosques = signal<Mosque[]>([]);
  settings = signal<MosqueSetting[]>([]);
  loading = signal(false);
  togglingKey = signal<string | null>(null);
  showDisabledOnly = signal(false);
  toast = signal('');
  toastOk = signal(true);

  mosqueId = 0;

  enabledCount = computed(() => this.settings().filter(s => s.isEnabled).length);
  disabledCount = computed(() => this.settings().filter(s => !s.isEnabled).length);

  selectedMosqueName = computed(() => {
    const m = this.mosques().find(x => x.id === this.mosqueId);
    return m ? `${m.name} (${m.city})` : '—';
  });

  filteredSettings = computed(() => {
    const list = this.sortSettings(this.settings());
    if (!this.showDisabledOnly()) return list;
    return list.filter(s => !s.isEnabled);
  });

  ngOnInit(): void {
    this.admin.getAllMosques().subscribe({
      next: m => this.mosques.set(m),
      error: () => this.showToast('Could not load mosques.', false),
    });
  }

  moduleLabel(key: string): string {
    return MODULE_LABELS[key] ?? key;
  }

  loadSettings(): void {
    if (!this.mosqueId) {
      this.settings.set([]);
      this.showDisabledOnly.set(false);
      return;
    }
    this.loading.set(true);
    this.admin.getSettings(this.mosqueId).subscribe({
      next: s => {
        this.settings.set(this.sortSettings(s));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showToast('Could not load module settings.', false);
      },
    });
  }

  toggle(s: MosqueSetting): void {
    if (this.togglingKey()) return;
    const next = !s.isEnabled;
    this.togglingKey.set(s.moduleKey);
    this.admin.setModuleFlag(this.mosqueId, s.moduleKey, next).subscribe({
      next: updated => {
        this.settings.update(list => list.map(x => x.moduleKey === updated.moduleKey ? updated : x));
        this.togglingKey.set(null);
        this.showToast(`${this.moduleLabel(updated.moduleKey)} ${updated.isEnabled ? 'enabled' : 'disabled'}.`, true);
      },
      error: () => {
        this.togglingKey.set(null);
        this.showToast('Could not update module.', false);
      },
    });
  }

  enableAll(): void {
    const disabled = this.settings().filter(s => !s.isEnabled);
    if (!disabled.length) {
      this.showToast('All modules are already enabled.', true);
      return;
    }
    let done = 0;
    disabled.forEach(s => {
      this.admin.setModuleFlag(this.mosqueId, s.moduleKey, true).subscribe({
        next: updated => {
          this.settings.update(list => list.map(x => x.moduleKey === updated.moduleKey ? updated : x));
          done++;
          if (done === disabled.length) this.showToast('All modules enabled.', true);
        },
        error: () => this.showToast(`Could not enable ${this.moduleLabel(s.moduleKey)}.`, false),
      });
    });
  }

  toggleDisabledFilter(): void {
    this.showDisabledOnly.update(v => !v);
  }

  private sortSettings(list: MosqueSetting[]): MosqueSetting[] {
    const allowed = new Set(MODULE_ORDER);
    return list
      .filter(s => allowed.has(s.moduleKey))
      .sort((a, b) => {
        const ai = MODULE_ORDER.indexOf(a.moduleKey);
        const bi = MODULE_ORDER.indexOf(b.moduleKey);
        return ai - bi;
      });
  }

  private showToast(msg: string, ok: boolean): void {
    this.toastOk.set(ok);
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3200);
  }
}
