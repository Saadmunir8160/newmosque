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
import { PlatformService } from '../../../core/services/platform.service';
import { AdminService } from '../../../core/services/admin.service';
import { Mosque } from '../../../core/models';
import {
  MosqueSeedFieldErrors,
  MosqueSeedFormValue,
  defaultMosqueSeedForm,
  normalizeSeedSlug,
  validateMosqueSeedForm,
} from '../../../core/utils/mosque-seed-form.util';

export interface MosqueCreatedEvent {
  mosque: Mosque;
  uploadWarning?: string;
}

@Component({
  selector: 'app-add-mosque-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-mosque-drawer.component.html',
  styleUrls: ['./add-mosque-drawer.component.css'],
})
export class AddMosqueDrawerComponent implements OnChanges {
  private platform = inject(PlatformService);
  private admin = inject(AdminService);

  @Input({ required: true }) open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<MosqueCreatedEvent>();

  form: MosqueSeedFormValue = defaultMosqueSeedForm();
  fieldErrors = signal<MosqueSeedFieldErrors>({});
  formError = signal('');
  saving = signal(false);
  saveStage = signal<'idle' | 'checking' | 'creating' | 'uploading'>('idle');
  slugTouched = false;

  logoFile: File | null = null;
  bannerFile: File | null = null;
  logoPreview = signal<string | null>(null);
  bannerPreview = signal<string | null>(null);

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
    if (changes['open']?.currentValue === true) {
      this.reset();
    }
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
    this.closed.emit();
  }

  save(): void {
    if (this.saving()) return;

    const errors = validateMosqueSeedForm(this.form, this.logoFile, this.bannerFile);
    this.fieldErrors.set(errors);
    this.formError.set('');
    if (Object.keys(errors).length > 0) return;

    const slug = normalizeSeedSlug(this.form.slug || this.form.name);
    const payload: Partial<Mosque> = {
      name: this.form.name.trim(),
      slug,
      description: this.form.description.trim() || undefined,
      address: this.form.address.trim() || undefined,
      city: this.form.city.trim(),
      postcode: this.form.postcode.trim() || undefined,
      country: this.form.country || 'United Kingdom',
      phone: this.form.phone.trim() || undefined,
      email: this.form.email.trim() || undefined,
      website: this.form.website.trim() || undefined,
      timezone: this.form.timezone || 'Europe/London',
    };

    this.saving.set(true);
    this.saveStage.set('checking');

    this.platform.checkMosqueSlug(slug).pipe(
      switchMap((check) => {
        if (!check.available) {
          throw { inline: { slug: 'This slug is already in use.' } };
        }
        this.saveStage.set('creating');
        return this.platform.seedMosque(payload);
      }),
      switchMap((mosque) => {
        if (!this.logoFile && !this.bannerFile) {
          return of({ mosque, uploadWarning: undefined as string | undefined });
        }

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
      }),
    ).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.saveStage.set('idle');
        this.saved.emit(result);
        this.closed.emit();
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
        this.formError.set(msg || 'Unable to create mosque. Please try again.');
      },
    });
  }

  saveStageLabel(): string {
    switch (this.saveStage()) {
      case 'checking': return 'Checking slug…';
      case 'creating': return 'Creating mosque…';
      case 'uploading': return 'Uploading images…';
      default: return 'Saving…';
    }
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
    if (url) URL.revokeObjectURL(url);
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
