import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MuqaddamService, CommunityGathering, TariqaCommunity, CommunityMemberRow } from '../../core/services/muqaddam.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-muqaddam-events',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Muqaddam" title="Events"
      subtitle="Dhikr gatherings and spiritual programs" />

    <app-card class="block mb-4">
      <div class="grid md:grid-cols-2 gap-2 mb-2">
        <select class="input" [(ngModel)]="communityId" (ngModelChange)="load()">
          <option [ngValue]="0">Select community</option>
          <option *ngFor="let c of communities()" [ngValue]="c.id">{{ c.name }}</option>
        </select>
        <select class="input" [(ngModel)]="form.gatheringType">
          <option value="DhikrGathering">Dhikr Gathering</option>
          <option value="SpiritualProgram">Spiritual Program</option>
        </select>
      </div>
      <input class="input mb-2" [(ngModel)]="form.title" placeholder="Event title">
      <textarea class="input mb-2" rows="2" [(ngModel)]="form.description" placeholder="Description"></textarea>
      <div class="grid md:grid-cols-2 gap-2">
        <input class="input" type="date" [(ngModel)]="form.date">
        <input class="input" type="time" [(ngModel)]="form.startTime">
      </div>
      <input class="input mt-2" [(ngModel)]="form.location" placeholder="Location">
      <button class="btn mt-3" (click)="create()" [disabled]="!communityId">Create Event</button>
    </app-card>

    <app-card *ngFor="let g of gatherings()" class="block mb-4">
      <h4 class="text-white font-bold">{{ g.title }} <span class="type">{{ g.gatheringType }}</span></h4>
      <p class="text-mos-muted text-sm">{{ g.date }} · {{ g.location || 'TBC' }}</p>
      <p class="text-mos-muted text-sm">{{ g.description }}</p>

      <div *ngIf="selectedGathering() === g.id" class="attendance mt-3">
        <h5 class="section">Record attendance</h5>
        <div *ngFor="let m of members()" class="row">
          <span>{{ m.fullName }}</span>
          <select class="status" [(ngModel)]="statusMap[m.userId]">
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Late">Late</option>
          </select>
        </div>
        <button class="btn mt-3" (click)="saveAttendance(g.id)">Save Attendance</button>
      </div>
      <button class="btn-sm mt-3" (click)="openAttendance(g)">Mark attendance</button>
    </app-card>
  `,
  styles: [`
    .input, .status { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }
    .status { width: auto; min-width: 7rem; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; }
    .btn:disabled { opacity: 0.5; }
    .btn-sm { background: #10b981; color: #0F172A; font-weight: 700; border: none; border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; cursor: pointer; }
    .type { font-size: 0.6875rem; color: #fbbf24; margin-left: 0.5rem; }
    .section { margin: 0 0 0.5rem; color: #fcd34d; font-size: 0.8125rem; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: #d1fae5; font-size: 0.875rem; }
  `]
})
export class MuqaddamEventsComponent implements OnInit {
  private muqaddam = inject(MuqaddamService);
  private mosqueCtx = inject(MosqueContextService);
  communities = signal<TariqaCommunity[]>([]);
  gatherings = signal<CommunityGathering[]>([]);
  members = signal<CommunityMemberRow[]>([]);
  selectedGathering = signal<number | null>(null);
  communityId = 0;
  form = { title: '', description: '', gatheringType: 'DhikrGathering', date: '', startTime: '19:30', location: '' };
  statusMap: Record<string, string> = {};
  mosqueId = 1;

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => {
      this.mosqueId = id;
      this.muqaddam.getCommunities(id).subscribe(c => {
        this.communities.set(c);
        if (c.length) { this.communityId = c[0].id; this.load(); }
      });
    });
  }

  load(): void {
    if (!this.communityId) return;
    this.muqaddam.getGatherings(this.communityId).subscribe(g => this.gatherings.set(g));
  }

  create(): void {
    if (!this.form.title.trim()) return;
    this.muqaddam.createGathering(this.communityId, {
      ...this.form,
      startTime: this.form.startTime ? this.form.startTime + ':00' : undefined,
    }).subscribe(() => {
      this.form = { title: '', description: '', gatheringType: 'DhikrGathering', date: '', startTime: '19:30', location: '' };
      this.load();
    });
  }

  openAttendance(g: CommunityGathering): void {
    this.selectedGathering.set(g.id);
    this.muqaddam.getMembers(g.communityId).subscribe(m => {
      this.members.set(m.filter(x => x.role === 'Member'));
      this.statusMap = {};
      m.filter(x => x.role === 'Member').forEach(x => this.statusMap[x.userId] = 'Present');
    });
  }

  saveAttendance(gatheringId: number): void {
    const records = Object.entries(this.statusMap).map(([userId, status]) => ({ userId, status }));
    this.muqaddam.recordAttendance(gatheringId, records).subscribe(() => this.load());
  }
}
