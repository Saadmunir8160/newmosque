import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';
import { environment } from '../../../environments/environment';

interface Allocation { id: number; description: string; status: string; userId?: string }
interface CampaignView { id: number; title: string; description?: string; allocations: Allocation[] }

@Component({
  selector: 'app-member-readings',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Member" title="Death Readings" subtitle="Complete your assigned reading portions" />

    <app-card *ngFor="let c of campaigns()" class="block mb-4">
      <h4 class="text-white font-bold">{{ c.title }}</h4>
      <p class="text-emerald-300 text-sm mb-4">{{ c.description }}</p>
      <div *ngFor="let a of c.allocations" class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-3 border-t border-emerald-800">
        <span class="text-emerald-100 text-sm">{{ a.description }}</span>
        <button *ngIf="a.status !== 'Completed'" class="btn" (click)="complete(a.id)">Mark Complete</button>
        <span *ngIf="a.status === 'Completed'" class="text-green-400 text-sm font-bold">✓ Completed</span>
      </div>
    </app-card>
    <p *ngIf="!campaigns().length" class="text-emerald-300">No reading campaigns at this time.</p>
  `,
  styles: [`.btn{background:#10b981;color:#022c22;font-weight:700;padding:6px 14px;border-radius:6px;border:none;cursor:pointer;align-self:flex-start}`]
})
export class MemberReadingsComponent implements OnInit {
  private http = inject(HttpClient);
  campaigns = signal<CampaignView[]>([]);
  private base = `${environment.apiUrl}/mosques/${environment.defaultMosqueId}/reading-campaigns`;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.http.get<{ id: number }[]>(this.base).subscribe(list => {
      if (!list.length) { this.campaigns.set([]); return; }
      forkJoin(list.map(c => this.http.get<{ campaign: CampaignView & { allocations?: Allocation[] } }>(`${this.base}/${c.id}`)))
        .subscribe(details => this.campaigns.set(details.map(d => ({
          id: d.campaign.id,
          title: d.campaign.title,
          description: d.campaign.description,
          allocations: d.campaign.allocations || []
        }))));
    });
  }

  complete(allocationId: number): void {
    this.http.post(`${this.base}/allocations/${allocationId}/complete`, {}).subscribe(() => this.load());
  }
}
