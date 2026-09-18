import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AdminService, PrayerExceptionRow } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { appDateString } from '../../../core/utils/date.utils';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { JumuahTime, PrayerTimesDaily } from '../../../core/models';

@Component({
  selector: 'app-admin-prayer-times',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header [useAuthRole]="true" title="Edit Timetable" subtitle="Daily jamaat, Jumuah slots and exceptions" />

    <app-card *ngIf="times() as t" class="mb-6">
      <div class="flex flex-wrap justify-between items-center mb-4 gap-3">
        <div class="flex items-center gap-3">
          <h3 class="text-white font-bold">Daily Prayer Times</h3>
          <span *ngIf="t.status" class="px-2 py-1 text-xs rounded text-white" [ngClass]="{'bg-green-600': t.status === 'Published', 'bg-gray-600': t.status !== 'Published'}">
            {{ t.status }}
          </span>
        </div>
        <a [routerLink]="['/dashboard/admin/prayer-times/templates']" [queryParams]="{mosqueId: mosqueId}" class="btn text-sm" style="text-decoration:none;">Templates & Generate</a>
      </div>
      <div class="mb-4">
        <label class="text-label text-mos-muted block mb-1">Select Date</label>
        <input class="input" type="date" [(ngModel)]="selectedDate" (ngModelChange)="loadDate($event)" style="max-width: 200px">
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div *ngFor="let p of prayers">
          <label class="text-label text-mos-muted font-semibold">{{ p.label }}</label>
          <div class="flex flex-col gap-2 mt-1">
            <div>
              <span class="text-xs text-mos-muted">Start</span>
              <input class="input text-sm p-2" type="time" [ngModel]="toInputTime(t[p.start])" (ngModelChange)="onTimeChange(p.start, $event)">
            </div>
            <div>
              <span class="text-xs text-mos-muted">Jamaat</span>
              <input class="input text-sm p-2" type="time" [ngModel]="toInputTime(t[p.jamaat])" (ngModelChange)="onTimeChange(p.jamaat, $event)">
            </div>
          </div>
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button class="btn" (click)="saveDraft(t)">Save Draft</button>
        <button class="btn" style="background:#10b981;color:#fff;" (click)="publish(t)">Publish</button>
      </div>
      <p *ngIf="msg()" class="text-mos-muted text-sm mt-2">{{ msg() }}</p>
    </app-card>

    <app-card class="mb-6">
      <h3 class="text-white font-bold mb-4">Jumuah Slots</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <input class="input" type="number" placeholder="Slot #" [(ngModel)]="jumuahForm.slotNumber" min="1">
        <input class="input" type="time" [(ngModel)]="jumuahForm.jamaatTime">
        <button class="btn" (click)="addJumuah()">Add Jumuah</button>
      </div>
      <div class="space-y-2">
        <div *ngFor="let j of jumuah()" class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-2 border-b border-mos-border">
          <span class="text-white min-w-0 break-anywhere">Jamaat {{ j.slotNumber }} — {{ j.jamaatTime.slice(0,5) }}</span>
          <button class="text-red-400 text-sm shrink-0 self-start sm:self-center" (click)="removeJumuah(j.id)">Remove</button>
        </div>
      </div>
    </app-card>

    <app-card class="mb-6">
      <h3 class="text-white font-bold mb-4">Prayer Exceptions</h3>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <input class="input" type="date" [(ngModel)]="exceptionForm.date">
        <select class="input" [(ngModel)]="exceptionForm.prayer">
          <option value="Fajr">Fajr</option>
          <option value="Dhuhr">Dhuhr</option>
          <option value="Asr">Asr</option>
          <option value="Maghrib">Maghrib</option>
          <option value="Isha">Isha</option>
        </select>
        <input class="input" type="time" [(ngModel)]="exceptionForm.overrideValue">
        <button class="btn" (click)="addException()">Add exception</button>
      </div>
      <input class="input mb-4" placeholder="Reason (optional)" [(ngModel)]="exceptionForm.reason">
      <div class="space-y-2">
        <div *ngFor="let ex of exceptions()" class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-2 border-b border-mos-border">
          <span class="text-white text-sm">{{ ex.date | date:'mediumDate' }} — {{ ex.prayer }} → {{ ex.overrideValue?.slice(0,5) }}<span *ngIf="ex.reason"> ({{ ex.reason }})</span></span>
          <button class="text-red-400 text-sm shrink-0" (click)="removeException(ex.id)">Remove</button>
        </div>
      </div>
      <p *ngIf="!exceptions().length" class="text-mos-muted text-sm">No exceptions configured.</p>
    </app-card>
  `,
  styles: [`.input{background:#0F172A;border:1px solid #F8FAFC;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#0F172A;font-weight:700;padding:10px 20px;border-radius:8px;border:none;cursor:pointer}`]
})
export class AdminPrayerTimesComponent implements OnInit {
  private admin = inject(AdminService);
  private mosqueService = inject(MosqueService);
  private route = inject(ActivatedRoute);
  private mosqueCtx = inject(MosqueContextService);
  times = signal<PrayerTimesDaily | null>(null);
  jumuah = signal<JumuahTime[]>([]);
  exceptions = signal<PrayerExceptionRow[]>([]);
  msg = signal('');
  selectedDate = appDateString();
  jumuahForm = { slotNumber: 1, jamaatTime: '13:00' };
  exceptionForm = { date: appDateString(), prayer: 'Fajr', overrideValue: '13:00', reason: '' };
  prayers = [
    { label: 'Fajr', start: 'fajrStart' as const, jamaat: 'fajrJamaat' as const },
    { label: 'Dhuhr', start: 'dhuhrStart' as const, jamaat: 'dhuhrJamaat' as const },
    { label: 'Asr', start: 'asrStart' as const, jamaat: 'asrJamaat' as const },
    { label: 'Maghrib', start: 'maghribStart' as const, jamaat: 'maghribJamaat' as const },
    { label: 'Isha', start: 'ishaStart' as const, jamaat: 'ishaJamaat' as const },
  ];
  mosqueId = 1;

  ngOnInit(): void {
    const qId = parseInt(this.route.snapshot.queryParamMap.get('mosqueId') || '', 10);
    if (!isNaN(qId) && qId > 0) {
      this.mosqueId = qId;
      this.load();
    } else {
      this.mosqueCtx.resolve().then(id => { this.mosqueId = id; this.load(); });
    }
  }

  load(): void {
    this.loadDate(this.selectedDate);
    this.mosqueService.getJumuahTimes(this.mosqueId).subscribe(j => this.jumuah.set(j));
    this.admin.getPrayerExceptions(this.mosqueId).subscribe({
      next: list => this.exceptions.set(list),
      error: () => this.exceptions.set([]),
    });
  }

  loadDate(date: string): void {
    this.selectedDate = date;
    this.msg.set('');
    // Pass includeDraft = true so the admin can see their own drafts
    this.mosqueService.getDailyPrayerTimes(this.mosqueId, date, true).subscribe(r => {
      if (r.times) {
        this.times.set(r.times);
      } else {
        this.times.set({
          id: 0, mosqueId: this.mosqueId, date: date,
          fajrStart: '', fajrJamaat: '',
          dhuhrStart: '', dhuhrJamaat: '',
          asrStart: '', asrJamaat: '',
          maghribStart: '', maghribJamaat: '',
          ishaStart: '', ishaJamaat: '',
          status: 'Draft'
        });
      }
    });
  }

  onTimeChange(field: keyof PrayerTimesDaily, val: string): void {
    const t = this.times();
    if (t && val) (t as any)[field] = val.length === 5 ? val + ':00' : val;
  }

  toInputTime(t: string): string { return typeof t === 'string' ? t.slice(0, 5) : ''; }

  saveDraft(t: PrayerTimesDaily): void {
    this.admin.upsertPrayerTimes(this.mosqueId, t, false).subscribe({
      next: (res) => {
        this.msg.set('Draft saved.');
        this.times.set(res);
      },
      error: () => this.msg.set('Save failed — check your role.')
    });
  }

  publish(t: PrayerTimesDaily): void {
    this.admin.upsertPrayerTimes(this.mosqueId, t, true).subscribe({
      next: (res) => {
        this.msg.set('Prayer times published.');
        this.times.set(res);
      },
      error: () => this.msg.set('Publish failed — check your role.')
    });
  }

  addJumuah(): void {
    const time = this.jumuahForm.jamaatTime.length === 5 ? this.jumuahForm.jamaatTime + ':00' : this.jumuahForm.jamaatTime;
    this.admin.addJumuahSlot(this.mosqueId, { slotNumber: this.jumuahForm.slotNumber, jamaatTime: time }).subscribe(() => {
      this.mosqueService.getJumuahTimes(this.mosqueId).subscribe(j => this.jumuah.set(j));
    });
  }

  removeJumuah(id: number): void {
    this.admin.deleteJumuahSlot(this.mosqueId, id).subscribe(() => {
      this.mosqueService.getJumuahTimes(this.mosqueId).subscribe(j => this.jumuah.set(j));
    });
  }

  addException(): void {
    const time = this.exceptionForm.overrideValue.length === 5
      ? this.exceptionForm.overrideValue + ':00'
      : this.exceptionForm.overrideValue;
    this.admin.addPrayerException(this.mosqueId, {
      date: this.exceptionForm.date,
      prayer: this.exceptionForm.prayer,
      overrideValue: time,
      reason: this.exceptionForm.reason?.trim() || undefined,
    }).subscribe({
      next: () => { 
        this.msg.set('Exception added.'); 
        this.admin.getPrayerExceptions(this.mosqueId).subscribe(list => this.exceptions.set(list));
      },
      error: () => this.msg.set('Could not add exception.'),
    });
  }

  removeException(id: number): void {
    this.admin.deletePrayerException(this.mosqueId, id).subscribe(() => {
      this.admin.getPrayerExceptions(this.mosqueId).subscribe(list => this.exceptions.set(list));
    });
  }
}
