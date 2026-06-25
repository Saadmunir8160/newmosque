import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MuqaddamService, MuridSummary } from '../../core/services/muqaddam.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-muqaddam-murids',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Muqaddam" title="Murid Management"
      subtitle="View murids, track participation and gathering attendance" />

    <div class="toolbar">
      <input class="input" placeholder="Search murids…" [(ngModel)]="search" (ngModelChange)="load()">
    </div>

    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th class="hidden sm:table-cell">Communities</th>
            <th>Participation</th>
            <th>Attendance</th>
            <th>Wird</th>
            <th>Qur'an</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let m of murids()">
            <td class="name">{{ m.fullName }}</td>
            <td class="hidden sm:table-cell">{{ communityNames(m) }}</td>
            <td>{{ m.gatheringsAttended }}/{{ m.gatheringsTotal }}</td>
            <td>{{ attendancePct(m) }}%</td>
            <td>{{ m.wirdCompleted }}/{{ m.wirdTotal }}</td>
            <td>{{ m.quranParasCompleted }} paras</td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!murids().length" class="empty">No murids in your assigned communities.</p>
    </div>
  `,
  styles: [`
    .toolbar { margin-bottom: 1rem; }
    .input { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 10px; color: #fff; max-width: 320px; width: 100%; }
    .table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .table th, .table td { padding: 0.625rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); color: #d1fae5; }
    .table th { color: #6ee7b7; font-size: 0.6875rem; text-transform: uppercase; }
    .name { color: #fff; font-weight: 600; }
    .empty { color: #6ee7b7; margin-top: 1rem; }
  `]
})
export class MuqaddamMuridsComponent implements OnInit {
  private muqaddam = inject(MuqaddamService);
  private mosqueCtx = inject(MosqueContextService);
  murids = signal<MuridSummary[]>([]);
  search = '';
  mosqueId = 1;

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => { this.mosqueId = id; this.load(); });
  }

  load(): void {
    this.muqaddam.getMurids(this.mosqueId, this.search).subscribe(m => this.murids.set(m));
  }

  communityNames(m: MuridSummary): string {
    return m.communities.map(c => c.name).join(', ') || '—';
  }

  attendancePct(m: MuridSummary): number {
    return m.gatheringsTotal ? Math.round((m.gatheringsAttended / m.gatheringsTotal) * 100) : 0;
  }
}
