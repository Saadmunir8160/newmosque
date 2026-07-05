import { Component, Injector, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Meta } from '@angular/platform-browser';
import { filter, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { MosqueService } from '../../../core/services/mosque.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Mosque } from '../../../core/models';
import {
  canShowPublicClaimCta,
  formatMosqueStatus,
  publicStatusCard,
} from '../../../core/utils/mosque-status.util';
import { environment } from '../../../../environments/environment';
import { MosqueClaimDrawerComponent } from '../mosque-claim-drawer/mosque-claim-drawer.component';

@Component({
  selector: 'app-public-mosque-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, MosqueClaimDrawerComponent],
  templateUrl: './public-mosque-profile.component.html',
  styleUrls: ['./public-mosque-profile.component.css'],
})
export class PublicMosqueProfileComponent implements OnInit, OnDestroy {
  @Input() openClaimOnLoad = false;
  private mosqueService = inject(MosqueService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private title = inject(Title);
  private meta = inject(Meta);
  private injector = inject(Injector);

  mosque = signal<Mosque | null>(null);
  loading = signal(true);
  notFound = signal(false);
  loadError = signal(false);
  showClaimDrawer = signal(false);
  claimToast = signal('');
  claimToastOk = signal(true);
  stats = signal<{ members: number; establishedYear?: number; capacity?: number } | null>(null);
  leadership = signal<{ name: string; role: string; bio?: string; photoUrl?: string }[]>([]);

  slug = '';
  private apiOrigin = environment.apiUrl.replace(/\/api\/v1\/?$/, '');

  readonly formatStatus = formatMosqueStatus;
  readonly publicStatusCard = publicStatusCard;
  readonly canShowClaim = canShowPublicClaimCta;

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    void this.load();
  }

  ngOnDestroy(): void {
    this.title.setTitle('MosqueOS');
  }

  mediaUrl(path?: string | null): string | null {
    if (!path?.trim()) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${this.apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  mapsUrl(m: Mosque): string | null {
    if (m.latitude && m.longitude)
      return `https://www.google.com/maps?q=${m.latitude},${m.longitude}`;
    if (m.address?.trim())
      return `https://www.google.com/maps/search/${encodeURIComponent([m.address, m.city, m.postcode].filter(Boolean).join(' '))}`;
    return null;
  }

  isModuleEnabled(m: Mosque, key: string): boolean {
    return m.settings?.some(s => s.moduleKey === key && s.isEnabled) ?? false;
  }

  locationLine(m: Mosque): string {
    const parts = [m.city, m.country].filter(Boolean);
    return parts.join(', ');
  }

  fullAddress(m: Mosque): string | null {
    const parts = [m.address, m.city, m.postcode, m.country].filter(p => !!p?.trim());
    return parts.length ? parts.join(', ') : null;
  }

  publicStatusLabel(m: Mosque): string {
    return this.publicStatusCard(m.status).label;
  }

  claimRoute(): string {
    return `/claim-mosque/${this.slug}`;
  }

  openClaimFlow(): void {
    if (this.auth.loading()) {
      this.showClaimToast('Checking your login — please try again.', false);
      return;
    }
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: `/claim-mosque/${this.slug}` },
      });
      return;
    }
    if (this.auth.user()?.emailConfirmed === false) {
      this.showClaimToast('Please verify your email before submitting a claim.', false);
      void this.router.navigate(['/verify-email-pending'], {
        queryParams: { email: this.auth.user()?.email ?? '' },
      });
      return;
    }
    const m = this.mosque();
    if (!m || !this.canShowClaim(m.status)) {
      this.showClaimToast('This mosque cannot be claimed.', false);
      return;
    }
    this.showClaimDrawer.set(true);
  }

  closeClaimDrawer(): void {
    this.showClaimDrawer.set(false);
  }

  onClaimSubmitted(): void {
    const m = this.mosque();
    if (m) {
      this.mosque.set({ ...m, status: 'ClaimPending' });
    }
  }

  private showClaimToast(msg: string, ok: boolean): void {
    this.claimToast.set(msg);
    this.claimToastOk.set(ok);
    setTimeout(() => this.claimToast.set(''), 4000);
  }

  private maybeOpenClaimFromRoute(): void {
    if (!this.openClaimOnLoad) return;
    const m = this.mosque();
    if (!m || !this.canShowClaim(m.status)) return;
    if (!this.auth.loading() && this.auth.isAuthenticated()) {
      this.openClaimFlow();
    }
  }

  retry(): void {
    this.loadError.set(false);
    this.notFound.set(false);
    void this.load();
  }

  private async load(): Promise<void> {
    if (!this.slug) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);
    this.notFound.set(false);

    if (this.auth.loading()) {
      await firstValueFrom(
        toObservable(this.auth.loading, { injector: this.injector }).pipe(
          filter(loading => !loading),
          take(1),
        ),
      );
    }

    const previewAdmin = this.route.snapshot.queryParamMap.get('preview') === 'admin';
    const mosqueIdParam = Number(this.route.snapshot.queryParamMap.get('mosqueId'));

    if ((previewAdmin || this.auth.isSuperAdmin()) && Number.isFinite(mosqueIdParam) && mosqueIdParam > 0) {
      this.mosqueService.getById(mosqueIdParam).subscribe({
        next: (mosque) => this.applyMosque(mosque),
        error: () => this.tryPublicLoad(),
      });
      return;
    }

    this.tryPublicLoad();
  }

  private tryPublicLoad(): void {
    this.mosqueService.getPublicBySlug(this.slug).subscribe({
      next: (mosque) => this.applyMosque(mosque),
      error: (err) => {
        if (err?.status === 404) {
          this.notFound.set(true);
          this.loading.set(false);
          return;
        }
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  private applyMosque(mosque: Mosque): void {
    if (mosque.slug) this.slug = mosque.slug;
    this.mosque.set(mosque);
    this.loading.set(false);
    this.setSeo(mosque);
    this.maybeOpenClaimFromRoute();
    // Load supplementary public data only for Active mosques
    if (mosque.status === 'Active') {
      this.mosqueService.getPublicStats(mosque.id).subscribe({
        next: (s) => this.stats.set(s),
        error: () => { /* non-critical */ }
      });
      // Use leadership from DTO if already present, else fetch separately
      if (mosque.leadership?.length) {
        this.leadership.set(mosque.leadership);
      } else {
        this.mosqueService.getPublicLeadership(mosque.id).subscribe({
          next: (l) => this.leadership.set(l),
          error: () => { /* non-critical */ }
        });
      }
    }
  }

  private setSeo(m: Mosque): void {
    const pageTitle = `${m.name} | ${m.city}`;
    const description = `Official public profile of ${m.name} in ${m.city} including address, contact information and community details.`;
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    const image = this.mediaUrl(m.bannerUrl || m.logoUrl);
    if (image) this.meta.updateTag({ property: 'og:image', content: image });
  }
}
