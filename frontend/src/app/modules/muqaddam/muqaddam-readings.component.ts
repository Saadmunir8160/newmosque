import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';
import { environment } from '../../../environments/environment';

interface CampaignDetail {
  campaign: { id: number; title: string; description?: string };
  totalAllocations: number;
  completed: number;
}

@Component({
  selector: 'app-muqaddam-readings',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Muqaddam" title="Death Readings Monitor" subtitle="Track community reading campaign progress" />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <app-card *ngFor="let c of campaigns()">
        <h4 class="text-white font-bold">{{ c.campaign.title }}</h4>
        <p class="text-emerald-300 text-sm mt-1 mb-4">{{ c.campaign.description }}</p>
        <div class="flex items-center gap-3">
          <div class="flex-1 bg-emerald-900 rounded-full h-2">
            <div class="bg-amber-400 h-2 rounded-full transition-all" [style.width.%]="progress(c)"></div>
          </div>
          <span class="text-emerald-200 text-sm shrink-0">{{ c.completed }}/{{ c.totalAllocations }}</span>
        </div>
      </app-card>
    </div>
    <p *ngIf="!campaigns().length" class="text-emerald-300">No active reading campaigns.</p>
  `
})
export class MuqaddamReadingsComponent implements OnInit {
  private http = inject(HttpClient);
  campaigns = signal<CampaignDetail[]>([]);
  private base = `${environment.apiUrl}/mosques/${environment.defaultMosqueId}/reading-campaigns`;

  ngOnInit(): void {
    this.http.get<{ id: number }[]>(this.base).subscribe(list => {
      if (!list.length) { this.campaigns.set([]); return; }
      forkJoin(list.map(c => this.http.get<CampaignDetail>(`${this.base}/${c.id}`)))
        .subscribe(details => this.campaigns.set(details));
    });
  }

  progress(c: CampaignDetail): number {
    return c.totalAllocations ? Math.round((c.completed / c.totalAllocations) * 100) : 0;
  }
}
