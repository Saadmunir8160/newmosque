import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PlatformService, PlatformUser } from '../../../core/services/platform.service';
import { AdminService } from '../../../core/services/admin.service';
import { ROLES } from '../../../core/constants/roles';
import { Mosque } from '../../../core/models';
import {
  EDIT_MOSQUE_STATUSES,
  MosqueSeedFieldErrors,
  MosqueSeedFormValue,
  defaultMosqueSeedForm,
  mosqueSeedFormFromMosque,
  normalizeSeedSlug,
  validateMosqueSeedForm,
} from '../../../core/utils/mosque-seed-form.util';
import { environment } from '../../../../environments/environment';

export interface MosqueSeedSavedEvent {
  mosque: Mosque;
  uploadWarning?: string;
  inviteLink?: string;
  inviteMessage?: string;
}

@Component({
  selector: 'app-mosque-seed-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mosque-seed-form.component.html',
  styleUrls: ['./mosque-seed-form.component.css'],
})
export class MosqueSeedFormComponent implements OnChanges {
  private platform = inject(PlatformService);
  private admin = inject(AdminService);

  @Input() editMosque: Mosque | null = null;
  @Input() users: PlatformUser[] = [];
  @Input() showFooter = true;
  @Output() cancelled = new EventEmitter<void>();
  @Output() saved = new EventEmitter<MosqueSeedSavedEvent>();

  form: MosqueSeedFormValue = defaultMosqueSeedForm();
  fieldErrors = signal<MosqueSeedFieldErrors>({});
  formError = signal('');
  saving = signal(false);
  saveStage = signal<'idle' | 'checking' | 'creating' | 'saving' | 'uploading'>('idle');
  slugTouched = false;

  logoFile: File | null = null;
  bannerFile: File | null = null;
  logoPreview = signal<string | null>(null);
  bannerPreview = signal<string | null>(null);

  readonly editStatuses = EDIT_MOSQUE_STATUSES;
  /** Dev/test only — hidden when production or editing an existing mosque. */
  readonly showFillTestData = !environment.production;

  readonly countries = [
    'United Kingdom',
    'Ireland',
    'United States',
    'Canada',
    'United Arab Emirates',
    'Pakistan',
    'Saudi Arabia',
  ];

  readonly timezones = [
    'Europe/London',
    'Europe/Paris',
    'Europe/Dublin',
    'America/New_York',
    'America/Toronto',
    'Asia/Dubai',
    'Asia/Karachi',
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editMosque']) {
      this.reset();
      if (this.editMosque) {
        this.populateEditForm(this.editMosque);
      }
    }
  }

  private populateEditForm(m: Mosque): void {
    this.form = mosqueSeedFormFromMosque(m);
    this.slugTouched = true;
    this.logoPreview.set(m.logoUrl ?? null);
    this.bannerPreview.set(m.bannerUrl ?? null);
  }

  onNameInput(): void {
    if (!this.slugTouched) {
      this.form.slug = normalizeSeedSlug(this.form.name);
    }
    this.clearFieldError('name');
  }

  onSlugInput(): void {
    this.slugTouched = true;
    this.form.slug = normalizeSeedSlug(this.form.slug);
    this.clearFieldError('slug');
  }

  onFieldInput(field: keyof MosqueSeedFormValue): void {
    this.clearFieldError(field);
    this.formError.set('');
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.setImageFile('logo', file);
    input.value = '';
  }

  onBannerSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.setImageFile('banner', file);
    input.value = '';
  }

  removeLogo(): void {
    this.revokePreview(this.logoPreview());
    this.logoFile = null;
    this.logoPreview.set(null);
    this.clearFieldError('logo');
  }

  removeBanner(): void {
    this.revokePreview(this.bannerPreview());
    this.bannerFile = null;
    this.bannerPreview.set(null);
    this.clearFieldError('banner');
  }

  cancel(): void {
    if (this.saving()) return;
    this.cancelled.emit();
  }

  /** Development helper: fill sample Unclaimed mosque fields with a unique slug. */
  fillTestData(): void {
    if (!this.showFillTestData || this.editMosque || this.saving()) return;

    const stamp = Date.now().toString(36);
    const slug = `test-mosque-${stamp}`;
    this.slugTouched = true;
    this.fieldErrors.set({});
    this.formError.set('');

    this.form = {
      ...defaultMosqueSeedForm(),
      name: `Test Mosque ${stamp.toUpperCase()}`,
      slug,
      description: 'Auto-filled test listing for Module 3.1 seed → claim → activate flow.',
      address: '12 High Street',
      city: 'Bradford',
      postcode: 'BD1 1AA',
      country: 'United Kingdom',
      phone: '01274123456',
      email: `test-${stamp}@mosqueos.test`,
      website: 'https://example.org',
      timezone: 'Europe/London',
      status: 'Unclaimed',
      ownerInviteEmail: `owner-${stamp}@mosqueos.test`,
      ownerInviteName: 'Test Owner',
    };

    const social = this.form as MosqueSeedFormValue & {
      facebookUrl?: string;
      instagramUrl?: string;
      twitterUrl?: string;
      youtubeUrl?: string;
    };
    social.facebookUrl = 'https://facebook.com/mosqueos-test';
    social.instagramUrl = 'https://instagram.com/mosqueos-test';
    social.twitterUrl = 'https://x.com/mosqueos-test';
    social.youtubeUrl = 'https://youtube.com/@mosqueos-test';
  }

  save(): void {
    if (this.saving()) return;

    const errors = validateMosqueSeedForm(this.form, this.logoFile, this.bannerFile);
    this.fieldErrors.set(errors);
    this.formError.set('');
    if (Object.keys(errors).length > 0) return;

    const slug = normalizeSeedSlug(this.form.slug || this.form.name);
    const social = this.form as MosqueSeedFormValue & {
      facebookUrl?: string;
      instagramUrl?: string;
      twitterUrl?: string;
      youtubeUrl?: string;
    };
    const payload: Partial<Mosque> = {
      name: this.form.name.trim(),
      slug,
      description: this.form.description.trim(),
      address: this.form.address.trim(),
      city: this.form.city.trim(),
      postcode: this.form.postcode.trim(),
      country: this.form.country || 'United Kingdom',
      phone: this.form.phone.trim(),
      email: this.form.email.trim(),
      website: this.form.website.trim(),
      facebookUrl: social.facebookUrl?.trim() ?? '',
      instagramUrl: social.instagramUrl?.trim() ?? '',
      twitterUrl: social.twitterUrl?.trim() ?? '',
      youtubeUrl: social.youtubeUrl?.trim() ?? '',
      timezone: this.form.timezone || 'Europe/London',
    };

    if (this.editMosque) {
      payload.status = this.form.status || undefined;
      payload.ownerId = this.form.ownerId.trim();
    }

    this.saving.set(true);
    this.saveStage.set('checking');

    const slugCheck$ = (this.editMosque && this.editMosque.slug === slug)
      ? of({ available: true, slug })
      : this.platform.checkMosqueSlug(slug);

    slugCheck$.pipe(
      switchMap((check) => {
        if (!check.available) {
          throw { inline: { slug: 'This slug is already in use.' } };
        }
        if (this.editMosque) {
          this.saveStage.set('saving');
          return this.platform.updateMosque(this.editMosque.id, payload as any);
        }
        this.saveStage.set('creating');
        return this.platform.seedMosque(payload);
      }),
      switchMap((mosque) => {
        const ownerEmail = this.form.ownerInviteEmail.trim() || this.form.email.trim();
        const afterUpload$ = (!this.logoFile && !this.bannerFile)
          ? of({ mosque, uploadWarning: undefined as string | undefined })
          : this.uploadImages(mosque);

        if (this.editMosque || !ownerEmail) {
          return afterUpload$.pipe(map((r) => ({ ...r, inviteLink: undefined, inviteMessage: undefined })));
        }

        return afterUpload$.pipe(
          switchMap((r) =>
            this.platform.sendMosqueInvite(mosque.id, {
              email: ownerEmail,
              name: this.form.ownerInviteName.trim() || undefined,
              role: ROLES.MosqueOwner,
            }).pipe(
              map((invite) => ({
                ...r,
                inviteLink: invite.acceptLink,
                inviteMessage: invite.message,
              })),
              catchError((inviteErr) => of({
                ...r,
                inviteMessage: inviteErr?.error?.message ?? 'Mosque created but owner invitation failed.',
              })),
            ),
          ),
        );
      }),
    ).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.saveStage.set('idle');
        this.saved.emit(result);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveStage.set('idle');
        if (err?.inline) {
          this.fieldErrors.set({ ...this.fieldErrors(), ...err.inline });
          return;
        }
        const msg = err?.error?.message ?? err?.message ?? '';
        if (err?.status === 409 || msg.toLowerCase().includes('slug')) {
          this.fieldErrors.set({ ...this.fieldErrors(), slug: 'This slug is already in use.' });
          return;
        }
        this.formError.set(
          msg || (this.editMosque
            ? 'Unable to update mosque. Please try again.'
            : 'Unable to create mosque. Please try again.'),
        );
      },
    });
  }

  saveStageLabel(): string {
    switch (this.saveStage()) {
      case 'checking': return 'Checking slug…';
      case 'creating': return 'Creating mosque…';
      case 'saving': return 'Saving changes…';
      case 'uploading': return 'Uploading images…';
      default: return 'Saving…';
    }
  }

  ownerLabel(user: PlatformUser): string {
    return `${user.fullName || user.userName} · ${user.email || user.userName}`;
  }

  private uploadImages(mosque: Mosque) {
    this.saveStage.set('uploading');
    const uploads: { kind: 'logo' | 'banner'; request: ReturnType<AdminService['uploadMosqueImage']> }[] = [];
    if (this.logoFile) uploads.push({ kind: 'logo', request: this.admin.uploadMosqueImage(mosque.id, this.logoFile, 'logo') });
    if (this.bannerFile) uploads.push({ kind: 'banner', request: this.admin.uploadMosqueImage(mosque.id, this.bannerFile, 'banner') });

    return forkJoin(
      uploads.map((u) =>
        u.request.pipe(
          catchError(() => of({ failed: u.kind as 'logo' | 'banner' })),
          map((res) => ('failed' in res ? res : { ok: true })),
        ),
      ),
    ).pipe(
      map((results) => {
        const failed = results.find((r) => 'failed' in r) as { failed: 'logo' | 'banner' } | undefined;
        const uploadWarning = failed
          ? failed.failed === 'banner'
            ? 'Banner upload failed.'
            : 'Logo upload failed.'
          : undefined;
        return { mosque, uploadWarning };
      }),
    );
  }

  private setImageFile(kind: 'logo' | 'banner', file: File | null): void {
    const isLogo = kind === 'logo';
    if (isLogo) {
      this.revokePreview(this.logoPreview());
      this.logoFile = file;
      this.logoPreview.set(file ? URL.createObjectURL(file) : null);
      this.clearFieldError('logo');
    } else {
      this.revokePreview(this.bannerPreview());
      this.bannerFile = file;
      this.bannerPreview.set(file ? URL.createObjectURL(file) : null);
      this.clearFieldError('banner');
    }
  }

  private clearFieldError(field: keyof MosqueSeedFieldErrors): void {
    const current = { ...this.fieldErrors() };
    delete current[field];
    this.fieldErrors.set(current);
  }

  private revokePreview(url: string | null): void {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  }

  private reset(): void {
    this.form = defaultMosqueSeedForm();
    this.fieldErrors.set({});
    this.formError.set('');
    this.saving.set(false);
    this.saveStage.set('idle');
    this.slugTouched = false;
    this.removeLogo();
    this.removeBanner();
  }
}
