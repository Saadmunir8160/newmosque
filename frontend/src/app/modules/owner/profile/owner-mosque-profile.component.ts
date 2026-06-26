import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/auth/auth.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { Mosque } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-owner-mosque-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './owner-mosque-profile.component.html',
  styleUrls: ['./owner-mosque-profile.component.css'],
})
export class OwnerMosqueProfileComponent implements OnInit {
  private admin = inject(AdminService);
  private auth = inject(AuthService);
  private mosqueCtx = inject(MosqueContextService);

  mosque = signal<Mosque | null>(null);
  loading = signal(true);
  saving = signal(false);
  toast = signal('');
  toastOk = signal(true);
  fieldErrors = signal<Record<string, string>>({});

  logoFile: File | null = null;
  bannerFile: File | null = null;
  logoPreview = signal<string | null>(null);
  bannerPreview = signal<string | null>(null);

  private apiOrigin = environment.apiUrl.replace(/\/api\/v1\/?$/, '');

  readonly countries = ['United Kingdom', 'Ireland', 'United States', 'Canada', 'Pakistan', 'United Arab Emirates'];
  readonly timezones = ['Europe/London', 'Europe/Dublin', 'America/New_York', 'Asia/Dubai', 'Asia/Karachi'];

  canEdit = computed(() => {
    const m = this.mosque();
    if (!m) return false;
    if (m.status !== 'Active') return false;
    const uid = this.auth.user()?.id;
    return !!uid && (m.ownerId === uid || this.auth.isSuperAdmin());
  });

  lockMessage = computed(() => {
    const m = this.mosque();
    if (!m) return 'No mosque linked to your account.';
    if (m.status === 'ClaimPending') return 'Your claim is under review. Editing unlocks after approval.';
    if (m.status === 'Claimed') return 'Awaiting activation. Profile editing unlocks when status is Active.';
    if (m.status !== 'Active') return 'Profile editing is available only for active mosques.';
    return 'You do not have permission to edit this mosque.';
  });

  ngOnInit(): void {
    this.admin.getOwnerMosque().subscribe({
      next: (res) => {
        if (res.mosque) {
          this.mosque.set({ ...res.mosque });
          this.logoPreview.set(this.mediaUrl(res.mosque.logoUrl));
          this.bannerPreview.set(this.mediaUrl(res.mosque.bannerUrl));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  mediaUrl(path?: string | null): string | null {
    if (!path?.trim()) return null;
    if (path.startsWith('http')) return path;
    return `${this.apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.logoFile = file;
    this.logoPreview.set(URL.createObjectURL(file));
  }

  onBannerSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.bannerFile = file;
    this.bannerPreview.set(URL.createObjectURL(file));
  }

  cancel(): void {
    this.logoFile = null;
    this.bannerFile = null;
    this.fieldErrors.set({});
    this.toast.set('');
    this.loading.set(true);
    this.admin.getOwnerMosque().subscribe({
      next: (res) => {
        if (res.mosque) {
          this.mosque.set({ ...res.mosque });
          this.logoPreview.set(this.mediaUrl(res.mosque.logoUrl));
          this.bannerPreview.set(this.mediaUrl(res.mosque.bannerUrl));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  async save(): Promise<void> {
    const m = this.mosque();
    if (!m || !this.canEdit() || this.saving()) return;

    const errors: Record<string, string> = {};
    if (!m.name?.trim()) errors['name'] = 'Mosque name is required.';
    if (!m.city?.trim()) errors['city'] = 'City is required.';
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) return;

    this.saving.set(true);
    this.toast.set('');

    try {
      if (this.logoFile) {
        const res = await firstValueFrom(this.admin.uploadMosqueImage(m.id, this.logoFile, 'logo'));
        if (res?.url) m.logoUrl = res.url;
      }
      if (this.bannerFile) {
        const res = await firstValueFrom(this.admin.uploadMosqueImage(m.id, this.bannerFile, 'banner'));
        if (res?.url) m.bannerUrl = res.url;
      }

      const updated = await firstValueFrom(this.admin.updateMosque(m.id, {
        name: m.name.trim(),
        phone: m.phone,
        email: m.email,
        website: m.website,
        address: m.address,
        city: m.city.trim(),
        postcode: m.postcode,
        country: m.country,
        description: m.description,
        logoUrl: m.logoUrl,
        bannerUrl: m.bannerUrl,
        timezone: m.timezone || 'Europe/London',
      }));

      if (updated) {
        this.mosque.set(updated);
        await this.mosqueCtx.resolve(true);
      }

      this.logoFile = null;
      this.bannerFile = null;
      this.showToast('Mosque profile updated successfully.', true);
    } catch {
      this.showToast('Unable to save profile. Check phone, email, and website format.', false);
    } finally {
      this.saving.set(false);
    }
  }

  private showToast(msg: string, ok: boolean): void {
    this.toast.set(msg);
    this.toastOk.set(ok);
    setTimeout(() => this.toast.set(''), 4000);
  }
}
