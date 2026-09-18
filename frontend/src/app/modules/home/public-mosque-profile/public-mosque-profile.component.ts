import { Component, Injector, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Meta } from '@angular/platform-browser';
import { filter, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { MosqueService } from '../../../core/services/mosque.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Announcement, Mosque, MosqueEvent, NextPrayer, PrayerTimesDaily, JumuahTime } from '../../../core/models';
import {
  canShowPublicClaimCta,
  formatMosqueStatus,
  publicStatusCard,
} from '../../../core/utils/mosque-status.util';
import { canShowClaimCta, claimCtaHint } from '../../../core/utils/mosque-claim.util';
import {
  resolveMosqueSocialLinks,
  socialLinkCssClass,
  socialLinkLabel,
} from '../../../core/utils/mosque-social.util';
import { environment } from '../../../../environments/environment';
import { MosqueClaimDrawerComponent } from '../mosque-claim-drawer/mosque-claim-drawer.component';
import {
  countdownToJamaat,
  formatTime12,
  resolveNextPrayer,
  DEFAULT_PRAYER_TIMEZONE,
} from '../../../core/utils/prayer.utils';

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
  public auth = inject(AuthService);
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

  prayerTimes = signal<PrayerTimesDaily | null>(null);
  prayerLoading = signal(false);
  prayerView = signal<'daily' | 'monthly'>('daily');
  monthlyDays = signal<PrayerTimesDaily[]>([]);
  monthlyLoading = signal(false);
  monthlyYear = new Date().getFullYear();
  monthlyMonth = new Date().getMonth() + 1;
  jumuahSlots = signal<JumuahTime[]>([]);
  nextPrayer = signal<NextPrayer | null>(null);
  prayerCountdown = signal('');
  announcements = signal<Announcement[]>([]);
  announcementsLoading = signal(false);
  events = signal<MosqueEvent[]>([]);
  eventsLoading = signal(false);

  featuredAnnouncement = computed(() => {
    const list = this.announcements();
    return list.find(a => a.isFeatured) ?? list[0] ?? null;
  });

  otherAnnouncements = computed(() => {
    const featured = this.featuredAnnouncement();
    return this.announcements().filter(a => a.id !== featured?.id).slice(0, 4);
  });

  slug = '';
  private apiOrigin = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
  private prayerTimer?: ReturnType<typeof setInterval>;

  readonly formatStatus = formatMosqueStatus;
  readonly publicStatusCard = publicStatusCard;
  readonly canShowClaim = canShowPublicClaimCta;
  readonly resolveSocialLinks = resolveMosqueSocialLinks;
  readonly socialLinkLabel = socialLinkLabel;
  readonly socialLinkCssClass = socialLinkCssClass;

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    void this.load();
    this.prayerTimer = setInterval(() => this.tickPrayerCountdown(), 1000);
  }

  todayDateStr(): string {
    return new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  getPrayerList(): { name: string; adhan: string; salah: string }[] {
    const pt = this.prayerTimes();
    if (!pt) return [];
    return [
      { name: 'Fajr', adhan: this.formatClock(pt.fajrStart), salah: this.formatClock(pt.fajrJamaat) },
      { name: 'Dhuhr', adhan: this.formatClock(pt.dhuhrStart), salah: this.formatClock(pt.dhuhrJamaat) },
      { name: 'Asr', adhan: this.formatClock(pt.asrStart), salah: this.formatClock(pt.asrJamaat) },
      { name: 'Maghrib', adhan: this.formatClock(pt.maghribStart), salah: this.formatClock(pt.maghribJamaat) },
      { name: 'Isha', adhan: this.formatClock(pt.ishaStart), salah: this.formatClock(pt.ishaJamaat) },
      { name: 'Jumuah', adhan: '12:30 pm', salah: '1:30 pm' }
    ];
  }

  ngOnDestroy(): void {
    this.title.setTitle('MosqueOS');
    if (this.prayerTimer) clearInterval(this.prayerTimer);
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

  claimHint(): string {
    return claimCtaHint({
      isAuthenticated: this.auth.isAuthenticated(),
      emailConfirmed: this.auth.user()?.emailConfirmed,
    });
  }

  formatClock(value?: string | null): string {
    if (!value?.trim()) return '—';
    return formatTime12(value);
  }

  isNextPrayer(name: string): boolean {
    const current = this.nextPrayer()?.name?.replace(' (tomorrow)', '') ?? '';
    return current === name;
  }

  monthLabel(): string {
    return new Date(this.monthlyYear, this.monthlyMonth - 1, 1)
      .toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  }

  showDailyPrayer(): void {
    this.prayerView.set('daily');
  }

  showMonthlyPrayer(): void {
    this.prayerView.set('monthly');
    this.loadMonthly();
  }

  shiftMonth(delta: number): void {
    this.monthlyMonth += delta;
    if (this.monthlyMonth > 12) { this.monthlyMonth = 1; this.monthlyYear++; }
    if (this.monthlyMonth < 1) { this.monthlyMonth = 12; this.monthlyYear--; }
    this.loadMonthly();
  }

  private loadMonthly(): void {
    const m = this.mosque();
    if (!m) return;
    this.monthlyLoading.set(true);
    this.mosqueService.getMonthlyPrayerTimes(m.id, this.monthlyYear, this.monthlyMonth).subscribe({
      next: rows => {
        this.monthlyDays.set(rows ?? []);
        this.monthlyLoading.set(false);
      },
      error: () => {
        this.monthlyDays.set([]);
        this.monthlyLoading.set(false);
      },
    });
  }

  private prayerTimezone(): string {
    return this.mosque()?.timezone?.trim() || DEFAULT_PRAYER_TIMEZONE;
  }

  private tickPrayerCountdown(): void {
    const pt = this.prayerTimes();
    if (!pt) {
      this.nextPrayer.set(null);
      this.prayerCountdown.set('');
      return;
    }
    const tz = this.prayerTimezone();
    const next = resolveNextPrayer(pt, tz);
    this.nextPrayer.set(next);
    this.prayerCountdown.set(countdownToJamaat(next.jamaat, tz));
  }

  canClaimMosque(m: Mosque): boolean {
    if (!canShowPublicClaimCta(m.status, m.allowClaimRequests !== false)) return false;
    return canShowClaimCta({
      mosqueStatus: m.status === 'ClaimPending' ? 'Unclaimed' : m.status,
      isSuperAdmin: this.auth.isSuperAdmin(),
      userId: this.auth.user()?.id,
      ownerId: m.ownerId,
    });
  }

  /** Ensure website / social URLs open correctly even without https:// */
  externalUrl(url?: string | null): string | null {
    const raw = url?.trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw) || raw.startsWith('mailto:') || raw.startsWith('tel:')) return raw;
    return `https://${raw}`;
  }

  openClaimFlow(): void {
    if (this.auth.loading()) {
      this.showClaimToast('Checking your login — please try again.', false);
      return;
    }
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], {
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
    if (!m || !this.canClaimMosque(m)) {
      this.showClaimToast('This mosque cannot be claimed right now.', false);
      return;
    }
    this.showClaimDrawer.set(true);
  }

  closeClaimDrawer(): void {
    this.showClaimDrawer.set(false);
  }

  onClaimSubmitted(): void {
    this.showClaimDrawer.set(false);
    this.showClaimToast('Claim submitted. The listing is hidden until Super Admin review.', true);
    void this.load();
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
    this.loadSupplementary(mosque);
    this.loadModuleSections(mosque);
  }

  private loadSupplementary(mosque: Mosque): void {
    this.mosqueService.getPublicStats(mosque.id).subscribe({
      next: (s) => this.stats.set(s),
      error: () => { /* non-critical */ },
    });
    if (mosque.leadership?.length) {
      this.leadership.set(mosque.leadership);
    } else {
      this.mosqueService.getPublicLeadership(mosque.id).subscribe({
        next: (l) => this.leadership.set(l),
        error: () => { /* non-critical */ },
      });
    }
  }

  private loadModuleSections(mosque: Mosque): void {
    this.prayerTimes.set(null);
    this.jumuahSlots.set([]);
    this.announcements.set([]);
    this.events.set([]);

    if (this.isModuleEnabled(mosque, 'PrayerTimes')) {
      this.prayerLoading.set(true);
      this.mosqueService.getDailyPrayerTimes(mosque.id).subscribe({
        next: (res) => {
          this.prayerTimes.set(res.times ?? null);
          this.prayerLoading.set(false);
          this.tickPrayerCountdown();
        },
        error: () => {
          this.prayerTimes.set(null);
          this.prayerLoading.set(false);
          this.nextPrayer.set(null);
          this.prayerCountdown.set('');
        },
      });
      this.mosqueService.getJumuahTimes(mosque.id).subscribe({
        next: (slots) => this.jumuahSlots.set(slots ?? []),
        error: () => this.jumuahSlots.set([]),
      });
    }

    if (this.isModuleEnabled(mosque, 'Announcements')) {
      this.announcementsLoading.set(true);
      this.mosqueService.getAnnouncements(mosque.id).subscribe({
        next: (list) => {
          const sorted = [...(list ?? [])].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
          this.announcements.set(sorted.slice(0, 8));
          this.announcementsLoading.set(false);
        },
        error: () => {
          this.announcements.set([]);
          this.announcementsLoading.set(false);
        },
      });
    }

    if (this.isModuleEnabled(mosque, 'Events')) {
      this.eventsLoading.set(true);
      this.mosqueService.getEvents(mosque.id, undefined, undefined, true, 'Scheduled').subscribe({
        next: (list) => {
          this.events.set((list ?? []).slice(0, 3));
          this.eventsLoading.set(false);
        },
        error: () => {
          this.events.set([]);
          this.eventsLoading.set(false);
        },
      });
    }
  }

  private setSeo(m: Mosque): void {
    const pageTitle = `${m.name} | ${m.city}`;
    const description =
      m.shortDescription?.trim()
      || m.description?.trim()
      || `Official public profile of ${m.name} in ${m.city} including address, contact information and community details.`;
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/mosque/${m.slug}`;
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
    const image = this.mediaUrl(m.bannerUrl || m.logoUrl);
    if (image) {
      this.meta.updateTag({ property: 'og:image', content: image });
      this.meta.updateTag({ name: 'twitter:image', content: image });
    }
  }
}
