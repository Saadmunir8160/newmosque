import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { Mosque, MosqueSetting } from '../../../core/models';
import { MODULE_LABELS, resolveModuleKey } from '../../../core/constants/mosque-form.constants';
import { ROLES } from '../../../core/constants/roles';

/** Owner-facing module keys shown in Step 7 UI (subset + all seeded modules). */
const DISPLAY_ORDER = [
  'PrayerTimes', 'Events', 'Donations', 'Courses', 'Madrassah',
  'Participation', 'Announcements', 'Janaza', 'Duas', 'Quran', 'Awrad',
  'VolunteerManagement', 'Fundraising', 'Communities',
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
    if (m.status !== 'Active') return 'Module settings unlock when your mosque is Active.';
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
    const canonical = resolveModuleKey(key);
    const label = MODULE_LABELS[canonical] ?? MODULE_LABELS[key];
    if (label) return label;
    if (key === 'Janaza') return 'Funeral';
    if (key === 'VolunteerManagement') return 'Volunteers';
    if (key === 'Madrassah') return 'Courses';
    if (key === 'Quran') return 'Library';
    return key;
  }

  sortedModules(): MosqueSetting[] {
    const list = this.modules();
    return [...list].sort((a, b) => {
      const ai = DISPLAY_ORDER.indexOf(a.moduleKey);
      const bi = DISPLAY_ORDER.indexOf(b.moduleKey);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }

  toggle(mod: MosqueSetting): void {
    if (!this.canEdit()) return;
    this.modules.update(list =>
      list.map(m => m.moduleKey === mod.moduleKey ? { ...m, isEnabled: !m.isEnabled } : m),
    );
  }

  async saveAll(): Promise<void> {
    if (!this.canEdit() || this.saving() || !this.mosqueId) return;
    this.saving.set(true);
    this.toast.set('');
    try {
      const payload = this.modules().map(m => ({ moduleKey: m.moduleKey, isEnabled: m.isEnabled }));
      const updated = await firstValueFrom(this.admin.updateMosqueModules(this.mosqueId, payload));
      this.modules.set(updated);
      await this.navigation.load();
      this.showToast('Module settings saved successfully.', true);
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
