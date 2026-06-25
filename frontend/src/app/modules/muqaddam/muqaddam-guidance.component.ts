import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MuqaddamService, GuidanceNote, TariqaCommunity, MuridSummary } from '../../core/services/muqaddam.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-muqaddam-guidance',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Muqaddam" title="Guidance Notes"
      subtitle="Spiritual notes, follow-ups, and recommendations for murids" />

    <app-card class="block mb-4">
      <div class="grid md:grid-cols-2 gap-2 mb-2">
        <select class="input" [(ngModel)]="form.communityId" (ngModelChange)="loadMurids()">
          <option [ngValue]="0">Select community</option>
          <option *ngFor="let c of communities()" [ngValue]="c.id">{{ c.name }}</option>
        </select>
        <select class="input" [(ngModel)]="form.muridUserId">
          <option value="">Select murid</option>
          <option *ngFor="let m of murids()" [value]="m.userId">{{ m.fullName }}</option>
        </select>
      </div>
      <div class="tabs">
        <button *ngFor="let t of noteTypes" type="button" class="tab" [class.active]="form.type === t" (click)="form.type = t">{{ t }}</button>
      </div>
      <textarea class="input mt-2" rows="3" [(ngModel)]="form.content" placeholder="Write guidance…"></textarea>
      <input *ngIf="form.type === 'FollowUp'" class="input mt-2" type="date" [(ngModel)]="form.followUpDate">
      <button class="btn mt-3" (click)="save()">Save note</button>
    </app-card>

    <div class="toolbar">
      <select class="input w-auto" [(ngModel)]="filterType" (ngModelChange)="loadNotes()">
        <option value="">All types</option>
        <option value="Note">Notes</option>
        <option value="FollowUp">Follow-ups</option>
        <option value="Recommendation">Recommendations</option>
      </select>
      <input class="input" placeholder="Search…" [(ngModel)]="search" (ngModelChange)="loadNotes()">
    </div>

    <app-card *ngFor="let n of notes()" class="block mb-3">
      <div class="flex justify-between gap-2">
        <div>
          <span class="type">{{ n.type }}</span>
          <p class="content">{{ n.content }}</p>
          <p class="meta" *ngIf="n.followUpDate">Follow-up: {{ n.followUpDate }}</p>
        </div>
        <button *ngIf="n.type === 'FollowUp' && !n.isCompleted" class="btn-sm" (click)="complete(n.id)">Done</button>
      </div>
    </app-card>
  `,
  styles: [`
    .input { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }
    .w-auto { width: auto; min-width: 140px; }
    .tabs { display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .tab { background: transparent; border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; padding: 0.35rem 0.65rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer; }
    .tab.active { background: #F8FAFC; color: #fff; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; }
    .btn-sm { background: #10b981; color: #0F172A; font-weight: 700; border: none; border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; cursor: pointer; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .type { font-size: 0.625rem; text-transform: uppercase; color: #fbbf24; font-weight: 700; }
    .content { margin: 0.35rem 0 0; color: #fff; font-size: 0.875rem; }
    .meta { margin: 0.25rem 0 0; color: #6ee7b7; font-size: 0.75rem; }
  `]
})
export class MuqaddamGuidanceComponent implements OnInit {
  private muqaddam = inject(MuqaddamService);
  private mosqueCtx = inject(MosqueContextService);
  communities = signal<TariqaCommunity[]>([]);
  murids = signal<MuridSummary[]>([]);
  notes = signal<GuidanceNote[]>([]);
  noteTypes = ['Note', 'FollowUp', 'Recommendation'];
  form = { communityId: 0, muridUserId: '', type: 'Note', content: '', followUpDate: '' };
  filterType = '';
  search = '';
  mosqueId = 1;

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => {
      this.mosqueId = id;
      this.muqaddam.getCommunities(id).subscribe(c => this.communities.set(c));
      this.loadNotes();
    });
  }

  loadMurids(): void {
    if (!this.form.communityId) { this.murids.set([]); return; }
    this.muqaddam.getMembers(this.form.communityId).subscribe(m =>
      this.murids.set(m.filter(x => x.role === 'Member').map(x => ({
        userId: x.userId,
        fullName: x.fullName,
        communities: [],
        gatheringsAttended: 0,
        gatheringsTotal: 0,
        wirdCompleted: 0,
        wirdTotal: 0,
        quranParasCompleted: 0,
        deathReadingsCompleted: 0,
        deathReadingsTotal: 0,
      })))
    );
  }

  loadNotes(): void {
    this.muqaddam.getGuidanceNotes(undefined, this.filterType || undefined, this.search)
      .subscribe(n => this.notes.set(n));
  }

  save(): void {
    if (!this.form.communityId || !this.form.muridUserId || !this.form.content.trim()) return;
    this.muqaddam.createGuidanceNote({
      communityId: this.form.communityId,
      muridUserId: this.form.muridUserId,
      type: this.form.type,
      content: this.form.content.trim(),
      followUpDate: this.form.followUpDate || undefined,
    }).subscribe(() => {
      this.form.content = '';
      this.loadNotes();
    });
  }

  complete(id: number): void {
    this.muqaddam.completeFollowUp(id).subscribe(() => this.loadNotes());
  }
}
