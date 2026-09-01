import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { GuestLoginCtaComponent } from './guest-login-cta.component';
import { Announcement, MosqueEvent } from '../../core/models';
import { Mosque } from '../../core/models';
import { formatTime12, getPrayerSlots } from '../../core/utils/prayer.utils';

@Component({
  selector: 'app-guest-home',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, GuestLoginCtaComponent],
  template: `
    <app-page-header badge="" title="Home"
      [subtitle]="mosque()?.name ? 'Welcome to ' + mosque()!.name : 'Browse your local mosque'" />

    <app-guest-login-cta />

    <section *ngIf="mosque() as m" class="mos-dash-panel mb-4">
      <h2 class="mos-dash-eyebrow">Mosque information</h2>
      <p class="mos-dash-title text-xl">{{ m.name }}</p>
      <p *ngIf="m.address || m.city" class="mos-dash-sub">{{ m.address }}<span *ngIf="m.city">, {{ m.city }}</span> <span *ngIf="m.postcode">{{ m.postcode }}</span></p>
      <p *ngIf="m.phone" class="mos-dash-sub">Tel: {{ m.phone }}</p>
      <p *ngIf="m.description" class="text-body-muted mt-2">{{ m.description }}</p>
      <a *ngIf="m.slug" [routerLink]="['/mosque', m.slug]" class="mos-dash-panel__link inline-block mt-3">View public profile →</a>
      <a routerLink="/dashboard/guest/prayer-times" class="mos-dash-panel__link inline-block mt-3 ml-3">View prayer times →</a>
    </section>

    <section *ngIf="prayerSlots().length" class="mos-dash-panel mb-4">
      <h2 class="mos-dash-panel__title">Today's prayer times</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        <div *ngFor="let p of prayerSlots()" class="text-center p-3 bg-mos-bg rounded-xl border border-mos-border">
          <span class="block text-[0.625rem] uppercase text-mos-muted font-semibold">{{ p.name }}</span>
          <span class="block text-base font-bold text-mos-text mt-1">{{ formatTime(p.jamaat) }}</span>
        </div>
      </div>
    </section>

    <section class="mos-dash-panel mb-4">
      <div class="flex justify-between items-center mb-3">
        <h2 class="mos-dash-panel__title mb-0">Latest announcements</h2>
        <a routerLink="/dashboard/guest/announcements" class="mos-dash-panel__link">View all</a>
      </div>
      <article *ngFor="let a of announcements()" class="mos-activity-row">
        <div>
          <p class="mos-activity-title">{{ a.title }}</p>
          <p class="mos-activity-meta">{{ a.summary }}</p>
        </div>
      </article>
      <p *ngIf="!announcements().length" class="mos-dash-empty">No announcements yet.</p>
    </section>

    <section class="mos-dash-panel">
      <div class="flex justify-between items-center mb-3">
        <h2 class="mos-dash-panel__title mb-0">Upcoming events</h2>
        <a routerLink="/dashboard/guest/events" class="mos-dash-panel__link">View all</a>
      </div>
      <article *ngFor="let e of events()" class="mos-activity-row cursor-pointer hover:bg-mos-bg rounded-lg px-2 -mx-2" [routerLink]="['/dashboard/guest/events', e.id]">
        <div>
          <p class="mos-activity-title">{{ e.title }}</p>
          <p class="mos-activity-meta">{{ e.date | date:'mediumDate' }}<span *ngIf="e.startTime"> · {{ formatTime(e.startTime) }}</span></p>
        </div>
      </article>
      <p *ngIf="!events().length" class="mos-dash-empty">No upcoming events.</p>
    </section>
  `,
})
export class GuestHomeComponent implements OnInit {
  private guest = inject(GuestService);
  private seo = inject(SeoService);

  mosque = signal<Mosque | null>(null);
  announcements = signal<Announcement[]>([]);
  events = signal<MosqueEvent[]>([]);
  prayerSlots = signal<{ name: string; start: string; jamaat: string }[]>([]);
  formatTime = formatTime12;

  ngOnInit(): void {
    this.seo.setPage('Mosque Home', 'Mosque information, prayer times, announcements and upcoming events.');
    this.guest.getHome().subscribe(h => {
      this.mosque.set(h.mosque);
      this.announcements.set(h.announcements ?? []);
      this.events.set(h.upcomingEvents ?? []);
      if (h.todayPrayerTimes) {
        this.prayerSlots.set(getPrayerSlots(h.todayPrayerTimes));
      }
    });
  }
}
