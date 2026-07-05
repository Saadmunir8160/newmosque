import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { Mosque, MosqueSetting } from '../../../core/models';
import { ROLES } from '../../../core/constants/roles';

const OWNER_MODULES = [
  { key: 'PrayerTimes', label: 'Prayer' },
  { key: 'Events', label: 'Events' },
  { key: 'Donations', label: 'Donations' },
  { key: 'Courses', label: 'Education' },
  { key: 'VolunteerManagement', label: 'Volunteers' },
  { key: 'Announcements', label: 'Announcements' },
];

@Component({
  selector: 'app-owner-module-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './owner-module-settings.component.html',
  styleUrls: ['./owner-module-settings.component.css'],
})
export class OwnerModuleSettingsComponent implements OnInit {
  private admin = inject(AdminService);
  private auth = inject(AuthService);
  private navigation = inject(NavigationService);

  mosque = signal<Mosque | null>(null);
  modules = signal<MosqueSetting[]>([]);
  loading = signal(true);
  saving = signal(false);
  toast = signal('');
  toastOk = signal(true);
  mosqueId = 0;

  canEdit = computed(() => {
    const m = this.mosque();
    if (!m || m.status !== 'Active') return false;
    return this.auth.hasRole(ROLES.MosqueOwner) || this.auth.isSuperAdmin();
  });

  lockMessage = computed(() => {
    const m = this.mosque();
    if (!m) return 'Link a mosque to configure modules.';
    if (m.status !== 'Active') return 'Modules unlock when your mosque is Active.';
    if (!this.auth.hasRole(ROLES.MosqueOwner) && !this.auth.isSuperAdmin()) {
      return 'Only the mosque owner can change module settings. You can view the current configuration below.';
    }
    return '';
  });

  ngOnInit(): void {
    this.admin.getOwnerMosque().subscribe({
      next: (res) => {
        if (res.mosque) {
          this.mosque.set(res.mosque);
          this.mosqueId = res.mosque.id;
          this.loadModules();
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  moduleLabel(key: string): string {
    return OWNER_MODULES.find(m => m.key === key)?.label ?? key;
  }

  sortedModules(): MosqueSetting[] {
    const list = this.modules();
    return OWNER_MODULES.map(item => {
      const existing = list.find(m => m.moduleKey === item.key);
      return existing ?? { id: 0, mosqueId: this.mosqueId, moduleKey: item.key, isEnabled: false };
    });
  }

  toggle(mod: MosqueSetting): void {
    if (!this.canEdit()) return;
    this.modules.update(list => {
      const exists = list.some(m => m.moduleKey === mod.moduleKey);
      if (!exists) return [...list, { ...mod, isEnabled: !mod.isEnabled }];
      return list.map(m => m.moduleKey === mod.moduleKey ? { ...m, isEnabled: !m.isEnabled } : m);
    });
  }

  async saveAll(): Promise<void> {
    if (!this.canEdit() || this.saving() || !this.mosqueId) return;
    this.saving.set(true);
    this.toast.set('');
    try {
      const visibleKeys = new Set(OWNER_MODULES.map(m => m.key));
      const visible = this.sortedModules();
      const hidden = this.modules().filter(m => !visibleKeys.has(m.moduleKey));
      const payload = [...visible, ...hidden].map(m => ({ moduleKey: m.moduleKey, isEnabled: m.isEnabled }));
      const updated = await firstValueFrom(this.admin.updateMosqueModules(this.mosqueId, payload));
      this.modules.set(updated);
      await this.navigation.load();
      this.showToast('Modules saved successfully.', true);
    } catch {
      this.showToast('Unable to save module settings. Please try again.', false);
    } finally {
      this.saving.set(false);
    }
  }

  private loadModules(): void {
    this.admin.getMosqueModules(this.mosqueId).subscribe({
      next: (mods) => {
        this.modules.set(mods);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private showToast(msg: string, ok: boolean): void {
    this.toast.set(msg);
    this.toastOk.set(ok);
    setTimeout(() => this.toast.set(''), 4000);
  }
}
