import { Component, OnInit, inject, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { Mosque, MosqueSetting } from '../../../core/models';
import { MODULE_LABELS, resolveModuleKey } from '../../../core/constants/mosque-form.constants';
import { ROLES } from '../../../core/constants/roles';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header *ngIf="!hideHeader" badge="Mosque Admin" title="Module Settings" subtitle="Enable or disable modules per mosque" />

    <div *ngIf="isOwnerOnly() && !mosque()" class="admin-empty mb-4">
      <p class="admin-empty-title">No mosque linked yet</p>
      <p class="admin-empty-desc">Complete verification to configure module settings.</p>
      <a routerLink="/dashboard/owner/verification" class="preview-link">Go to verification →</a>
    </div>

    <div *ngIf="mosque() && !canToggle()" class="admin-empty mb-4">
      <p class="admin-empty-title">Module settings locked</p>
      <p class="admin-empty-desc">{{ lockMessage() }}</p>
    </div>

    <app-card *ngFor="let s of settings()" class="block mb-3">
      <div class="flex justify-between items-center gap-3">
        <span class="text-white font-bold">{{ moduleLabel(s.moduleKey) }}</span>
        <button class="btn" [class.off]="!s.isEnabled" [disabled]="!canToggle()" (click)="toggle(s)">
          {{ s.isEnabled ? 'Enabled' : 'Disabled' }}
        </button>
      </div>
    </app-card>
  `,
  styles: [`
    .btn{background:#10b981;color:#0F172A;font-weight:700;padding:6px 14px;border-radius:6px;border:none;cursor:pointer}
    .btn:disabled{opacity:0.5;cursor:not-allowed}
    .off{background:#64748b;color:#fff}
    .admin-empty{padding:1rem 1.25rem;border-radius:10px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.35)}
    .admin-empty-title{margin:0;font-weight:700;color:#fcd34d}
    .admin-empty-desc{margin:0.35rem 0 0;font-size:0.875rem;color:#94a3b8}
  `]
})
export class AdminSettingsComponent implements OnInit {
  @Input() hideHeader = false;
  private admin = inject(AdminService);
  private mosqueCtx = inject(MosqueContextService);
  private auth = inject(AuthService);
  settings = signal<MosqueSetting[]>([]);
  mosque = signal<Mosque | null>(null);
  mid = 1;

  isOwnerOnly = computed(() => this.auth.hasRole(ROLES.MosqueOwner) && !this.auth.isSuperAdmin());

  canToggle = computed(() => {
    if (this.auth.isSuperAdmin()) return true;
    if (!this.auth.hasRole(ROLES.MosqueOwner)) return false;
    const m = this.mosque();
    return m?.status === 'Active';
  });

  lockMessage = computed(() => {
    if (!this.auth.hasRole(ROLES.MosqueOwner) && !this.auth.isSuperAdmin()) {
      return 'Only the Mosque Owner can enable or disable modules. Contact your owner for changes.';
    }
    const m = this.mosque();
    if (!m) return 'Link a mosque to your account via verification to configure modules.';
    if (m.status === 'Claimed') {
      return 'Module settings unlock when your mosque is activated (Active status) by Super Admin.';
    }
    if (m.status === 'ClaimPending' || m.status === 'PendingReview') {
      return 'Complete claim approval before configuring modules.';
    }
    return 'Module settings are available once your mosque is Active.';
  });

  ngOnInit(): void {
    if (this.auth.hasRole(ROLES.MosqueOwner) && !this.auth.isSuperAdmin()) {
      this.admin.getOwnerMosque().subscribe(res => {
        if (res.mosque) {
          this.mosque.set(res.mosque);
          this.mid = res.mosque.id;
          this.loadSettings();
        }
      });
      return;
    }
    this.mosqueCtx.resolve().then(async id => {
      this.mid = id;
      this.admin.getOwnerMosque().subscribe(res => {
        if (res.mosque) this.mosque.set(res.mosque);
      });
      this.loadSettings();
    });
  }

  moduleLabel(key: string): string {
    const canonical = resolveModuleKey(key);
    return MODULE_LABELS[canonical] ?? MODULE_LABELS[key] ?? key;
  }

  private loadSettings(): void {
    const MVP_MODULES = new Set([
      'PrayerTimes', 'Announcements', 'Events', 'Janaza',
      'Donations', 'Courses', 'VolunteerManagement', 'CommunityServices'
    ]);
    this.admin.getSettings(this.mid).subscribe(s => {
      this.settings.set(s.filter(x => MVP_MODULES.has(x.moduleKey)));
    });
  }

  toggle(s: MosqueSetting): void {
    if (!this.canToggle()) return;
    this.admin.setModuleFlag(this.mid, s.moduleKey, !s.isEnabled).subscribe(updated => {
      this.settings.update(list => list.map(x => x.moduleKey === updated.moduleKey ? updated : x));
    });
  }
}
