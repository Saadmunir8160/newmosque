import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
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
  private route = inject(ActivatedRoute);

  mosque = signal<Mosque | null>(null);
  loading = signal(true);
  saving = signal(false);
  toast = signal('');
  toastOk = signal(true);
  fieldErrors = signal<Record<string, string>>({});

  logoFile: File | null = null;
  bannerFile: File | null = null;
  logoRemoved = false;
  bannerRemoved = false;
  logoPreview = signal<string | null>(null);
  bannerPreview = signal<string | null>(null);
  activeTab = signal<'basic' | 'address' | 'social' | 'location' | 'about' | 'media'>('basic');

  private apiOrigin = environment.apiUrl.replace(/\/api\/v1\/?$/, '');

  readonly countries = ['United Kingdom', 'Ireland', 'United States', 'Canada', 'Pakistan', 'United Arab Emirates'];
  readonly timezones = ['Europe/London', 'Europe/Dublin', 'America/New_York', 'Asia/Dubai', 'Asia/Karachi'];
  readonly currentYear = new Date().getFullYear();
  readonly maxImageBytes = 5 * 1024 * 1024;
  readonly defaultLogo = 'assets/mosque-default-logo.svg';
  readonly defaultBanner = 'assets/mosque-default-banner.svg';

  canEdit = computed(() => {
    const m = this.mosque();
    if (!m) return false;
    // Gap 15 fix: PRD says Claimed + Active both allow editing. Was incorrectly blocking Claimed status.
    if (m.status !== 'Active' && m.status !== 'Claimed') return false;
    const uid = this.auth.user()?.id;
    return !!uid && (m.ownerId === uid || this.auth.isSuperAdmin());
  });

  lockMessage = computed(() => {
    const m = this.mosque();
    if (!m) return 'No mosque linked to your account.';
    if (m.status === 'ClaimPending') return 'Your claim is under review. Editing unlocks after approval.';
    if (m.status !== 'Active' && m.status !== 'Claimed')
      return 'Profile editing is available only for claimed or active mosques.';
    return 'You do not have permission to edit this mosque.';
  });

  ngOnInit(): void {
    const tab = this.route.snapshot.data['profileTab'];
    if (tab === 'media' || tab === 'basic') this.activeTab.set(tab);
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
    if (!this.validateImage(file, 'logo')) {
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.logoFile = file;
    this.logoRemoved = false;
    this.logoPreview.set(URL.createObjectURL(file));
  }

  onBannerSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!this.validateImage(file, 'banner')) {
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.bannerFile = file;
    this.bannerRemoved = false;
    this.bannerPreview.set(URL.createObjectURL(file));
  }

  removeLogo(): void {
    const m = this.mosque();
    if (!m || !this.canEdit()) return;
    this.logoFile = null;
    this.logoRemoved = true;
    m.logoUrl = undefined;
    this.logoPreview.set(null);
  }

  removeBanner(): void {
    const m = this.mosque();
    if (!m || !this.canEdit()) return;
    this.bannerFile = null;
    this.bannerRemoved = true;
    m.bannerUrl = undefined;
    this.bannerPreview.set(null);
  }

  cancel(): void {
    this.logoFile = null;
    this.bannerFile = null;
    this.logoRemoved = false;
    this.bannerRemoved = false;
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
      } else if (this.logoRemoved) {
        await firstValueFrom(this.admin.deleteMosqueImage(m.id, 'logo'));
        m.logoUrl = undefined;
      }
      if (this.bannerFile) {
        const res = await firstValueFrom(this.admin.uploadMosqueImage(m.id, this.bannerFile, 'banner'));
        if (res?.url) m.bannerUrl = res.url;
      } else if (this.bannerRemoved) {
        await firstValueFrom(this.admin.deleteMosqueImage(m.id, 'banner'));
        m.bannerUrl = undefined;
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
        // G-14: previously missing fields
        facebookUrl: m.facebookUrl,
        instagramUrl: m.instagramUrl,
        youtubeUrl: m.youtubeUrl,
        twitterUrl: m.twitterUrl,
        latitude: m.latitude,
        longitude: m.longitude,
        mapLocation: m.mapLocation,
        vision: m.vision,
        history: m.history,
        parkingInfo: m.parkingInfo,
        establishedYear: m.establishedYear,
        capacity: m.capacity,
        shortDescription: m.shortDescription,
      }));

      if (updated) {
        this.mosque.set(updated);
        await this.mosqueCtx.resolve(true);
      }

      this.logoFile = null;
      this.bannerFile = null;
      this.logoRemoved = false;
      this.bannerRemoved = false;
      this.logoPreview.set(this.mediaUrl(updated?.logoUrl ?? m.logoUrl));
      this.bannerPreview.set(this.mediaUrl(updated?.bannerUrl ?? m.bannerUrl));
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

  private validateImage(file: File, label: 'logo' | 'banner'): boolean {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      this.showToast(`${label === 'logo' ? 'Logo' : 'Banner'} must be JPG, PNG, WEBP, or GIF.`, false);
      return false;
    }
    if (file.size > this.maxImageBytes) {
      this.showToast(`${label === 'logo' ? 'Logo' : 'Banner'} image must be 5 MB or smaller.`, false);
      return false;
    }
    return true;
  }
}
