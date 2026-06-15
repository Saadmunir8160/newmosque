import { afterNextRender, Component, Injector, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { MosqueService } from '../../../core/services/mosque.service';
import { TodayService } from '../../../core/services/today.service';
import {
  Announcement, JanazaAnnouncement, JumuahTime, Mosque,
  MosqueEvent, PrayerTimesDaily
} from '../../../core/models';
import {
  countdownToJamaat, formatTime12, getPrayerSlots, nextJumuahCountdown,
  resolveJumuahCountdowns, resolveNextPrayer, JumuahSlotCountdown
} from '../../../core/utils/prayer.utils';
import { environment } from '../../../../environments/environment';

const DEMO_TOUR_KEY = 'mos_demo_tour_done';

@Component({
  selector: 'app-demo-mosque',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './demo-mosque.component.html',
  styles: [`
    .demo-tour-pill {
      animation: demoPulse 2s ease-in-out infinite;
    }
    @keyframes demoPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.35); }
      50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
    }
  `]
})
export class DemoMosqueComponent implements OnInit, OnDestroy {
  private mosqueService = inject(MosqueService);
  private todayService = inject(TodayService);
  private injector = inject(Injector);
  private route = inject(ActivatedRoute);

  mosque = signal<Mosque | null>(null);
  prayerTimes = signal<PrayerTimesDaily | null>(null);
  jumuah = signal<JumuahTime[]>([]);
  announcements = signal<Announcement[]>([]);
  events = signal<MosqueEvent[]>([]);
  janaza = signal<JanazaAnnouncement[]>([]);
  nextPrayerName = signal('—');
  countdown = signal('00:00:00');
  nextJamaat = signal('—');
  jumuahCountdowns = signal<JumuahSlotCountdown[]>([]);
  nextJumuah = signal<{ slotNumber: number; jamaatTime: string; countdown: string } | null>(null);
  isFriday = signal(false);
  tourActive = signal(false);
  tourCompleted = signal(!!sessionStorage.getItem(DEMO_TOUR_KEY));
  featuredDua = signal<{ title: string; arabicText: string; translation?: string } | null>(null);
  loading = signal(true);
  formatTime = formatTime12;

  private timer?: ReturnType<typeof setInterval>;
  private tourTimers: ReturnType<typeof setTimeout>[] = [];
  private tourCancelled = false;
  private tourProgrammaticScroll = false;
  private userScrollHandler?: () => void;
  slug = environment.defaultMosqueSlug;
  isPublicProfile = false;

  private readonly tourSections = [
    'demo-hero', 'jamaat', 'announcements', 'events', 'dua', 'demo-footer'
  ];

  ngOnInit(): void {
    const slugParam = this.route.snapshot.paramMap.get('slug');
    this.slug = slugParam ?? environment.defaultMosqueSlug;
    this.isPublicProfile = !!slugParam;

    this.mosqueService.getBySlug(this.slug).subscribe({
      next: (mosque) => this.loadMosqueData(mosque),
      error: () => this.onDemoReady()
    });

    this.timer = setInterval(() => {
      const pt = this.prayerTimes();
      if (pt) this.tickPrayer(pt);
      const j = this.jumuah();
      if (j.length) this.tickJumuah(j);
    }, 1000);
  }

  private loadMosqueData(mosque: Mosque): void {
    const mosqueId = mosque.id;
    forkJoin({
      mosque: of(mosque),
      prayers: this.mosqueService.getDailyPrayerTimes(mosqueId),
      jumuah: this.mosqueService.getJumuahTimes(mosqueId),
      announcements: this.mosqueService.getAnnouncements(mosqueId),
      events: this.mosqueService.getEvents(mosqueId),
      janaza: this.mosqueService.getJanaza(mosqueId),
      today: this.todayService.getToday(mosqueId)
    }).subscribe({
      next: ({ mosque, prayers, jumuah, announcements, events, janaza, today }) => {
        this.mosque.set(mosque);
        this.prayerTimes.set(prayers.times);
        this.jumuah.set(jumuah);
        this.announcements.set(announcements);
        this.events.set(events);
        this.janaza.set(janaza);
        if (today.recommendedDua) this.featuredDua.set(today.recommendedDua);
        this.tickPrayer(prayers.times);
        this.tickJumuah(jumuah);
        this.onDemoReady();
      },
      error: () => this.onDemoReady()
    });
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.stopTour();
  }

  skipTour(): void {
    this.stopTour(true);
  }

  replayTour(): void {
    sessionStorage.removeItem(DEMO_TOUR_KEY);
    this.tourCompleted.set(false);
    this.stopTour();
    this.scheduleTourStart(true);
  }

  private onDemoReady(): void {
    this.loading.set(false);
    if (!this.isPublicProfile) this.scheduleTourStart();
  }

  private scheduleTourStart(force = false): void {
    afterNextRender(() => {
      requestAnimationFrame(() => this.maybeStartTour(force));
    }, { injector: this.injector });
  }

  private stopTour(persist = false): void {
    this.tourCancelled = true;
    this.tourActive.set(false);
    this.tourTimers.forEach(t => clearTimeout(t));
    this.tourTimers = [];
    this.detachUserScrollListeners();
    if (persist) {
      sessionStorage.setItem(DEMO_TOUR_KEY, '1');
      this.tourCompleted.set(true);
    }
  }

  private attachUserScrollListeners(): void {
    this.detachUserScrollListeners();
    this.userScrollHandler = () => {
      if (this.tourProgrammaticScroll) return;
      this.stopTour(true);
    };
    window.addEventListener('wheel', this.userScrollHandler, { passive: true });
    window.addEventListener('touchmove', this.userScrollHandler, { passive: true });
  }

  private detachUserScrollListeners(): void {
    if (!this.userScrollHandler) return;
    window.removeEventListener('wheel', this.userScrollHandler);
    window.removeEventListener('touchmove', this.userScrollHandler);
    this.userScrollHandler = undefined;
  }

  private scrollTourTo(id: string): void {
    this.tourProgrammaticScroll = true;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.queueTour(() => { this.tourProgrammaticScroll = false; }, 1200);
  }

  private maybeStartTour(force = false): void {
    if (!force && sessionStorage.getItem(DEMO_TOUR_KEY)) return;

    const sections = this.tourSections.filter(id => !!document.getElementById(id));
    if (!sections.length) return;

    this.tourActive.set(true);
    this.tourCancelled = false;
    this.attachUserScrollListeners();

    const pauseMs = 3200;
    let step = 0;

    const runStep = () => {
      if (this.tourCancelled) return;

      if (step >= sections.length) {
        this.scrollTourTo('demo-nav');
        this.queueTour(() => {
          sessionStorage.setItem(DEMO_TOUR_KEY, '1');
          this.tourCompleted.set(true);
          this.tourActive.set(false);
          this.detachUserScrollListeners();
        }, pauseMs);
        return;
      }

      this.scrollTourTo(sections[step]);
      step++;
      this.queueTour(runStep, pauseMs);
    };

    window.scrollTo({ top: 0, behavior: 'auto' });
    this.queueTour(runStep, 600);
  }

  private queueTour(fn: () => void, delay: number): void {
    this.tourTimers.push(setTimeout(fn, delay));
  }

  private tickPrayer(times: PrayerTimesDaily): void {
    const next = resolveNextPrayer(times);
    this.nextPrayerName.set(next.name);
    this.nextJamaat.set(formatTime12(next.jamaat));
    this.countdown.set(countdownToJamaat(next.jamaat));
  }

  private tickJumuah(slots: JumuahTime[]): void {
    this.isFriday.set(new Date().getDay() === 5);
    this.jumuahCountdowns.set(resolveJumuahCountdowns(slots));
    this.nextJumuah.set(nextJumuahCountdown(slots));
  }

  prayerSlots(): { name: string; jamaat: string; active: boolean; countdown: string }[] {
    const pt = this.prayerTimes();
    if (!pt) return [];
    const next = resolveNextPrayer(pt);
    const activeName = next.name.replace(' (tomorrow)', '');
    return getPrayerSlots(pt).map(p => ({
      name: p.name,
      jamaat: formatTime12(p.jamaat),
      active: p.name === activeName,
      countdown: p.name === activeName ? countdownToJamaat(p.jamaat) : '',
    }));
  }

  featuredAnnouncement(): Announcement | undefined {
    return this.announcements().find(a => a.isFeatured) || this.announcements()[0];
  }

  otherAnnouncements(): Announcement[] {
    const featured = this.featuredAnnouncement();
    return this.announcements().filter(a => a.id !== featured?.id).slice(0, 3);
  }
}
