import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { JumuahTime, MosqueEvent, PrayerTimesDaily } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import {
  countdownToJamaat, formatTime12, getPrayerSlots, nextJumuahCountdown,
  resolveNextPrayer
} from '../../../core/utils/prayer.utils';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styles: [`
    :host { display: block; width: 100%; }

    /* ── Keyframes ── */
    @keyframes mosFadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes mosFloat {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-8px); }
    }

    /* ── Hero entrance ── */
    .mos-hero-in {
      opacity: 0;
      animation: mosFadeInUp 0.7s ease forwards;
    }
    .mos-hero-in-1 { animation-delay: 0.1s; }
    .mos-hero-in-2 { animation-delay: 0.25s; }
    .mos-hero-in-3 { animation-delay: 0.4s; }
    .mos-hero-in-4 { animation-delay: 0.55s; }

    /* ── Phone float ── */
    .mos-float { animation: mosFloat 4s ease-in-out infinite; }
    .mos-float-1 { animation-delay: 0s; }
    .mos-float-2 { animation-delay: 0.8s; }
    .mos-float-3 { animation-delay: 1.6s; }

    /* ── Scroll reveal ── */
    .mos-reveal {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .mos-reveal-visible {
      opacity: 1;
      transform: translateY(0);
    }
    .mos-stagger-0 { transition-delay: 0s; }
    .mos-stagger-1 { transition-delay: 0.08s; }
    .mos-stagger-2 { transition-delay: 0.16s; }
    .mos-stagger-3 { transition-delay: 0.24s; }
    .mos-stagger-4 { transition-delay: 0.32s; }
    .mos-stagger-5 { transition-delay: 0.4s; }

    /* ── Nav link underline ── */
    .mos-nav-link {
      position: relative;
      transition: color 0.2s ease;
    }
    .mos-nav-link::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 0;
      height: 2px;
      background: #fbbf24;
      border-radius: 1px;
      transition: width 0.25s ease;
    }
    .mos-nav-link:hover::after { width: 100%; }
    .mos-nav-link.active { color: #fff; }
    .mos-nav-link.active::after { width: 100%; }

    /* ── Professional navbar ── */
    .mos-nav {
      position: sticky; top: 0; z-index: 50;
      border-bottom: 1px solid rgba(16, 185, 129, 0.12);
      background: rgba(2, 44, 34, 0.72);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    }
    .mos-nav.scrolled {
      background: rgba(2, 44, 34, 0.96);
      border-bottom-color: rgba(16, 185, 129, 0.22);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28);
    }
    .mos-nav-inner {
      display: flex; align-items: center; justify-content: space-between;
      gap: 0.75rem; min-height: 64px; min-width: 0;
    }
    @media (min-width: 1024px) { .mos-nav-inner { min-height: 72px; } }
    .mos-brand {
      display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0;
    }
    .mos-brand-mark {
      width: 38px; height: 38px; border-radius: 11px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 0.95rem; color: #022c22;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25);
    }
    .mos-brand-text { line-height: 1.15; }
    .mos-brand-name { display: block; font-weight: 800; font-size: 1rem; color: #fff; letter-spacing: -0.02em; }
    @media (min-width: 640px) { .mos-brand-name { font-size: 1.05rem; } }
    .mos-brand-tag { display: block; font-size: 0.65rem; color: #6ee7b7; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; }
    @media (max-width: 380px) { .mos-brand-tag { display: none; } }
    .mos-nav-center {
      display: none; align-items: center; gap: 2px;
      padding: 5px; border-radius: 999px;
      background: rgba(6, 78, 59, 0.45);
      border: 1px solid rgba(16, 185, 129, 0.15);
    }
    @media (min-width: 1024px) { .mos-nav-center { display: flex; } }
    .mos-nav-pill {
      padding: 8px 16px; border-radius: 999px; border: none; background: transparent;
      color: #a7f3d0; font-size: 0.875rem; font-weight: 500; cursor: pointer;
      text-decoration: none; transition: color 0.2s, background 0.2s;
    }
    .mos-nav-pill:hover { color: #fff; background: rgba(16, 185, 129, 0.18); }
    .mos-nav-pill.active { color: #022c22; background: #fbbf24; font-weight: 600; }
    .mos-nav-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .mos-btn-ghost {
      display: none; padding: 9px 18px; border-radius: 10px; font-size: 0.875rem; font-weight: 600;
      border: 1.5px solid rgba(167, 243, 208, 0.45); background: transparent; color: #ecfdf5;
      cursor: pointer; transition: all 0.2s ease;
    }
    .mos-btn-ghost:hover { border-color: #6ee7b7; background: rgba(16, 185, 129, 0.12); }
    @media (min-width: 640px) { .mos-btn-ghost { display: inline-flex; align-items: center; } }
    .mos-btn-primary {
      display: none; padding: 9px 20px; border-radius: 10px; font-size: 0.875rem; font-weight: 700;
      border: none; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #022c22;
      text-decoration: none; cursor: pointer;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);
      transition: transform 0.15s, box-shadow 0.2s;
    }
    .mos-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(245, 158, 11, 0.4); }
    @media (min-width: 640px) { .mos-btn-primary { display: inline-flex; align-items: center; } }
    .mos-menu-toggle {
      display: flex; align-items: center; justify-content: center;
      width: 42px; height: 42px; border-radius: 10px;
      border: 1px solid rgba(16, 185, 129, 0.35); background: rgba(6, 78, 59, 0.5);
      color: #ecfdf5; cursor: pointer; transition: background 0.2s, border-color 0.2s;
    }
    .mos-menu-toggle:hover { background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.5); }
    @media (min-width: 1024px) { .mos-menu-toggle { display: none; } }
    .mos-menu-toggle svg { transition: transform 0.25s ease; }
    .mos-menu-toggle.open svg { transform: rotate(90deg); }
    .mos-mobile-drawer {
      overflow: hidden; max-height: 0; opacity: 0;
      transition: max-height 0.35s ease, opacity 0.25s ease;
      border-top: 1px solid transparent;
    }
    .mos-mobile-drawer.open {
      max-height: 480px; opacity: 1;
      border-top-color: rgba(16, 185, 129, 0.15);
    }
    .mos-mobile-nav { padding: 1rem 1.25rem 1.25rem; display: flex; flex-direction: column; gap: 4px; }
    .mos-mobile-link {
      width: 100%; text-align: left; padding: 12px 14px; border-radius: 10px;
      border: none; background: transparent; color: #d1fae5; font-size: 0.95rem; font-weight: 500;
      cursor: pointer; text-decoration: none; transition: background 0.2s, color 0.2s;
    }
    .mos-mobile-link:hover, .mos-mobile-link.active { background: rgba(16, 185, 129, 0.15); color: #fff; }
    .mos-mobile-cta {
      margin-top: 12px; padding-top: 14px; border-top: 1px solid rgba(16, 185, 129, 0.2);
      display: flex; flex-direction: column; gap: 10px;
    }

    /* ── Card hover lift ── */
    .mos-card-hover {
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
    }
    .mos-card-hover:hover {
      transform: translateY(-4px);
      border-color: rgb(16, 185, 129) !important;
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.15);
    }

    /* ── Spiritual tag scale ── */
    .mos-tag-hover {
      transition: transform 0.2s ease, border-color 0.2s ease;
      cursor: default;
    }
    .mos-tag-hover:hover {
      transform: scale(1.05);
      border-color: #10b981;
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
      .mos-hero-in,
      .mos-float {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
      }
      .mos-reveal {
        opacity: 1;
        transform: none;
        transition: none;
      }
      .mos-card-hover:hover { transform: none; }
      .mos-tag-hover:hover { transform: none; }
      .mos-nav-link::after { display: none; }
    }

    .phone {
      width: min(100%, 200px);
      max-width: 100%;
      flex-shrink: 0;
      border-radius: 22px; border: 2px solid #065f46; background: #022c22; padding: 6px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.35);
    }
    .phone-screen { border-radius: 16px; overflow: hidden; background: #064e3b; min-height: 180px; }
    .phone-notch { width: 48px; height: 5px; background: #065f46; border-radius: 99px; margin: 4px auto 8px; }
    @media (min-width: 640px) {
      .mos-phone-row { flex-direction: row; }
      .phone { width: 168px; }
      .phone-screen { min-height: 220px; }
    }

    .mos-countdown-live {
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.06em;
    }

    .mos-footer {
      background: linear-gradient(180deg, #011a14 0%, #010f0c 100%);
      border-top: 1px solid rgba(245, 158, 11, 0.15);
      position: relative;
      overflow: hidden;
    }
    .mos-footer::before {
      content: '';
      position: absolute;
      top: -120px;
      right: -80px;
      width: 320px;
      height: 320px;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.06) 0%, transparent 70%);
      pointer-events: none;
    }
    .mos-footer::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: -60px;
      width: 280px;
      height: 280px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%);
      pointer-events: none;
    }
    .mos-footer-inner { position: relative; z-index: 1; }
    .mos-footer-accent {
      height: 3px;
      background: linear-gradient(90deg, transparent, #f59e0b 20%, #10b981 50%, #f59e0b 80%, transparent);
    }
    .footer-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #a7f3d0;
      font-size: 0.9375rem;
      transition: color 0.2s ease, transform 0.2s ease;
    }
    .footer-link:hover { color: #fff; transform: translateX(2px); }
    .footer-contact-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      color: #d1fae5;
      font-size: 0.9375rem;
      line-height: 1.5;
    }
    .footer-icon {
      flex-shrink: 0;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.5rem;
      background: rgba(6, 78, 59, 0.6);
      border: 1px solid rgba(16, 185, 129, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fbbf24;
    }
  `]
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;
  private timer?: ReturnType<typeof setInterval>;
  private mosqueService = inject(MosqueService);

  menuOpen = signal(false);
  navScrolled = signal(false);
  activeSection = signal('home');

  prayerTimes = signal<PrayerTimesDaily | null>(null);
  jumuah = signal<JumuahTime[]>([]);
  nextPrayerName = signal('—');
  nextJamaat = signal('—');
  countdown = signal('00:00:00');
  isFriday = signal(false);
  nextJumuah = signal<{ slotNumber: number; jamaatTime: string; countdown: string } | null>(null);
  showcaseSubtitle = signal('Next Prayer');
  showcasePrayerName = signal('—');
  showcaseCountdown = signal('00:00:00');
  todayDayLabel = signal('Today');
  todayDateStr = signal('');
  formatTime = formatTime12;
  nextEvent = signal<MosqueEvent | null>(null);
  eventCountdown = signal('—');

  private readonly fallbackPrayers: PrayerTimesDaily = {
    id: 0, mosqueId: 1, date: '',
    fajrStart: '04:15:00', fajrJamaat: '04:30:00',
    dhuhrStart: '13:00:00', dhuhrJamaat: '13:30:00',
    asrStart: '17:45:00', asrJamaat: '18:00:00',
    maghribStart: '21:15:00', maghribJamaat: '21:20:00',
    ishaStart: '22:30:00', ishaJamaat: '22:45:00',
  };

  readonly tagline = 'Manage the Mosque + Strengthen Worship';

  readonly benefits = [
    { icon: '🕌', title: 'Prayer Times', items: ['Daily timetable', 'Jumuah slots', 'Ramadan exceptions'] },
    { icon: '📚', title: 'Madrassah', items: ['Attendance', 'Progress tracking', 'Parent portal'] },
    { icon: '🤝', title: 'Community', items: ['Events', 'Announcements', 'Participation'] },
    { icon: '📿', title: 'Spiritual Life', items: ['Awrad', 'Adhkar', 'Duas', 'Quran plans'] },
  ];

  readonly todayFeatures = [
    { label: 'Next Prayer', desc: 'Live countdown to the next jamaah' },
    { label: 'Jamaah Times', desc: 'Today\'s full timetable at a glance' },
    { label: 'Recommended Wird', desc: 'Context-aware awrad for the time of day' },
    { label: 'Daily Quran Reading', desc: 'Para plans with gentle progress tracking' },
    { label: 'Friday Content', desc: 'Jumuah reminders and special duas' },
    { label: 'Special Events', desc: 'Mawlid, classes and community gatherings' },
  ];

  readonly featureGroups = [
    { title: 'Prayer Times', items: ['Daily timetable', 'Monthly timetable', 'Multiple Jumuah slots', 'Countdown'] },
    { title: 'Announcements', items: ['Publish mosque news', 'Featured notices'] },
    { title: 'Events', items: ['Mawlid', 'Classes', 'Gatherings'] },
    { title: 'Janaza', items: ['Funeral announcements', 'Reading campaigns'] },
    { title: 'Communities', items: ['Study circles', 'Youth groups', 'Tariqa circles'] },
    { title: 'Madrassah', items: ['Classes', 'Attendance', 'Fees', 'Parent access'] },
  ];

  readonly audiences = [
    { title: 'Mosque Administrators', desc: 'Manage all mosque operations from one trusted platform.', icon: '🏛️' },
    { title: 'Teachers', desc: 'Track attendance and student progress with clarity.', icon: '👨‍🏫' },
    { title: 'Parents', desc: 'View children\'s attendance, fees and progress reports.', icon: '👨‍👩‍👧' },
    { title: 'Community Members', desc: 'Stay connected to prayer, learning and events.', icon: '🌙' },
  ];

  readonly spiritual = [
    'Khulasa Wird', 'Awrad Collections', 'Daily Adhkar', 'Duas Library',
    'Quran Reading Plans', 'Wudu Guides', 'Umrah & Hajj Guides',
  ];

  readonly comparison = [
    { traditional: 'Static pages', mos: 'Live prayer times' },
    { traditional: 'No parent portal', mos: 'Madrassah management' },
    { traditional: 'No community tools', mos: 'Events & participation' },
    { traditional: 'No spiritual content', mos: 'Awrad & adhkar' },
  ];

  readonly bradfordMosques = [
    'Masjid Al-Noor Bradford', 'Markazi Jamia Masjid', 'Jamia Masjid Hanfia',
    'Al-Hikmah Centre', 'Masjid-e-Umar', 'Central Mosque Bradford',
  ];

  readonly footerLinks: { label: string; action?: string; route?: string }[] = [
    { label: 'About', action: 'home' },
    { label: 'Features', action: 'features' },
    { label: 'Demo Mosque', route: '/demo' },
    { label: 'Pricing', action: 'pricing' },
    { label: 'Privacy Policy', action: 'privacy' },
    { label: 'Terms of Service', action: 'terms' },
    { label: 'Contact', action: 'contact' },
  ];

  readonly privacySummary =
    'MOS collects only data needed to run your mosque account. Information is stored securely, never sold, and access is limited by role. Contact hello@mosqueos.uk for data requests.';

  readonly termsSummary =
    'Use MOS responsibly for mosque and community purposes. Admins are responsible for published content. Accounts are personal and governed by UK law. Contact hello@mosqueos.uk with questions.';

  constructor(private el: ElementRef<HTMLElement>) {}

  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.refreshDateLabel();
    const mosqueId = environment.defaultMosqueId;
    this.mosqueService.getDailyPrayerTimes(mosqueId).subscribe({
      next: res => {
        this.prayerTimes.set(res.times);
        this.tickPrayer(res.times);
      },
      error: () => {
        this.prayerTimes.set(this.fallbackPrayers);
        this.tickPrayer(this.fallbackPrayers);
      }
    });
    this.mosqueService.getJumuahTimes(mosqueId).subscribe({
      next: slots => {
        this.jumuah.set(slots);
        this.tickJumuah(slots);
      },
      error: () => this.tickJumuah([])
    });
    this.mosqueService.getEvents(mosqueId).subscribe({
      next: events => this.tickEvent(events),
      error: () => this.tickEvent([])
    });

    this.timer = setInterval(() => {
      this.refreshDateLabel();
      const pt = this.prayerTimes() ?? this.fallbackPrayers;
      this.tickPrayer(pt);
      this.tickJumuah(this.jumuah());
      this.tickEvent(this.eventsCache);
    }, 1000);
  }

  private eventsCache: MosqueEvent[] = [];

  heroPrayerSlots(): { name: string; jamaat: string; active: boolean }[] {
    const pt = this.prayerTimes();
    if (!pt) return [];
    const activeName = this.nextPrayerName().replace(' (tomorrow)', '');
    return getPrayerSlots(pt).map(p => ({
      name: p.name,
      jamaat: formatTime12(p.jamaat),
      active: p.name === activeName,
    }));
  }

  private refreshDateLabel(): void {
    const now = new Date();
    const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' });
    this.todayDayLabel.set(`Today · ${weekday}`);
    this.todayDateStr.set(now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
    this.isFriday.set(now.getDay() === 5);
  }

  private tickPrayer(times: PrayerTimesDaily): void {
    const next = resolveNextPrayer(times);
    this.nextPrayerName.set(next.name);
    this.nextJamaat.set(formatTime12(next.jamaat));
    this.countdown.set(countdownToJamaat(next.jamaat));
    this.updateShowcase();
  }

  private tickJumuah(slots: JumuahTime[]): void {
    this.nextJumuah.set(nextJumuahCountdown(slots));
    this.updateShowcase();
  }

  private updateShowcase(): void {
    const jumuah = this.nextJumuah();
    if (this.isFriday() && jumuah) {
      this.showcaseSubtitle.set('Next Jumuah');
      this.showcasePrayerName.set(`Jumuah · Slot ${jumuah.slotNumber}`);
      this.showcaseCountdown.set(jumuah.countdown);
      return;
    }
    this.showcaseSubtitle.set('Next Prayer');
    this.showcasePrayerName.set(this.nextPrayerName());
    this.showcaseCountdown.set(this.countdown());
  }

  showcaseGreeting(): string {
    return this.isFriday() && this.nextJumuah() ? 'Jumuah Mubarak' : 'Assalamu Alaikum';
  }

  private tickEvent(events: MosqueEvent[]): void {
    this.eventsCache = events;
    const now = Date.now();
    const upcoming = events
      .map(e => ({ event: e, start: this.parseEventDateTime(e) }))
      .filter(x => x.start.getTime() > now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0];

    if (!upcoming) {
      this.nextEvent.set(null);
      this.eventCountdown.set('—');
      return;
    }
    this.nextEvent.set(upcoming.event);
    this.eventCountdown.set(this.countdownToDateTime(upcoming.start));
  }

  private parseEventDateTime(event: MosqueEvent): Date {
    const date = event.date.includes('T') ? event.date.slice(0, 10) : event.date;
    const time = event.startTime.length >= 5 ? event.startTime.slice(0, 8) : `${event.startTime}:00`;
    return new Date(`${date}T${time}`);
  }

  private countdownToDateTime(target: Date): string {
    const diff = Math.max(0, target.getTime() - Date.now());
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  browseAsGuest(): void {
    this.menuOpen.set(false);
    this.authService.enterGuestMode();
    this.router.navigate(['/dashboard']);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.navScrolled.set(window.scrollY > 12);
    const sections = ['home', 'features', 'pricing', 'contact'];
    for (const id of [...sections].reverse()) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= 120) {
        this.activeSection.set(id);
        return;
      }
    }
    this.activeSection.set('home');
  }

  isActive(id: string): boolean {
    return this.activeSection() === id;
  }

  ngAfterViewInit(): void {
    const root = this.el.nativeElement;
    const reveals = root.querySelectorAll<HTMLElement>('.mos-reveal');

    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reveals.forEach(el => el.classList.add('mos-reveal-visible'));
      return;
    }

    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('mos-reveal-visible');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    reveals.forEach(el => this.observer!.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.timer) clearInterval(this.timer);
  }

  scrollTo(id: string): void {
    this.menuOpen.set(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
