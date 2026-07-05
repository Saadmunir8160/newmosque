import { Component, OnInit, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';

import { MatCardModule } from '@angular/material/card';

import { MatChipsModule } from '@angular/material/chips';

import { PrayerEditorService, PrayerEditorDashboard } from '../../core/services/prayer-editor.service';

import { MosqueContextService } from '../../core/services/mosque-context.service';

import { PrayerTimesDaily } from '../../core/models';

import { MosqueService } from '../../core/services/mosque.service';



@Component({

  selector: 'app-prayer-editor-dashboard',

  standalone: true,

  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatChipsModule],

  template: `

    <div class="mos-dash">

      <header class="mos-dash-header">

        <div>

          <p class="mos-dash-eyebrow">Prayer Times Editor</p>

          <h1 class="mos-dash-title">Dashboard</h1>

          <p class="mos-dash-sub" *ngIf="summary() as s">{{ s.mosqueName }} — manage and publish prayer schedules.</p>

        </div>

      </header>



      <div class="mos-kpi-grid mb-4" *ngIf="summary() as s">

        <div class="mos-kpi">

          <p class="mos-kpi__label">Today</p>

          <p class="mos-kpi__value mos-kpi__value--sm">{{ s.todayStatus || '—' }}</p>

        </div>

        <div class="mos-kpi">

          <p class="mos-kpi__label">Published days</p>

          <p class="mos-kpi__value">{{ s.publishedDays }}</p>

        </div>

        <div class="mos-kpi">

          <p class="mos-kpi__label">Draft days</p>

          <p class="mos-kpi__value">{{ s.draftDays }}</p>

        </div>

        <div class="mos-kpi">

          <p class="mos-kpi__label">Jumuah slots</p>

          <p class="mos-kpi__value">{{ s.jumuahSlots }}</p>

        </div>

      </div>



      <section class="mos-dash-panel" *ngIf="times() as t">

        <h2 class="mos-dash-panel__title">Today's timetable</h2>

        <div class="space-y-2 mb-4">

          <div class="flex justify-between text-sm border-b border-mos-border pb-2" *ngFor="let p of prayers">

            <span class="font-medium text-mos-text">{{ p.label }}</span>

            <span class="text-mos-muted">{{ t[p.start].slice(0,5) }} start · {{ t[p.jamaat].slice(0,5) }} jamaat</span>

          </div>

        </div>

        <div class="flex flex-wrap gap-2">

          <a mat-flat-button color="primary" routerLink="/dashboard/prayer-editor/daily">Edit daily</a>

          <a mat-stroked-button routerLink="/dashboard/prayer-editor/jumuah">Jumuah</a>

          <a mat-stroked-button routerLink="/dashboard/prayer-editor/ramadan">Ramadan</a>

          <a mat-stroked-button routerLink="/dashboard/prayer-editor/audit">Audit log</a>

        </div>

      </section>

    </div>

  `,

})

export class PrayerEditorDashboardComponent implements OnInit {

  private editor = inject(PrayerEditorService);

  private mosqueCtx = inject(MosqueContextService);

  private mosque = inject(MosqueService);



  summary = signal<PrayerEditorDashboard | null>(null);

  times = signal<PrayerTimesDaily | null>(null);

  private mosqueId = 1;



  prayers = [

    { label: 'Fajr', start: 'fajrStart' as const, jamaat: 'fajrJamaat' as const },

    { label: 'Dhuhr', start: 'dhuhrStart' as const, jamaat: 'dhuhrJamaat' as const },

    { label: 'Asr', start: 'asrStart' as const, jamaat: 'asrJamaat' as const },

    { label: 'Maghrib', start: 'maghribStart' as const, jamaat: 'maghribJamaat' as const },

    { label: 'Isha', start: 'ishaStart' as const, jamaat: 'ishaJamaat' as const },

  ];



  ngOnInit(): void {

    this.mosqueCtx.resolve().then(id => {

      this.mosqueId = id;

      this.editor.getDashboard(id).subscribe(s => this.summary.set(s));

      this.mosque.getDailyPrayerTimes(id).subscribe(r => this.times.set(r.times));

    });

  }

}


