import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MuqaddamService, MuridSummary, TariqaCommunity } from '../../core/services/muqaddam.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-muqaddam',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Muqaddam" title="Murid Summary" subtitle="Tariqa groups, wird progress and spiritual guidance" />

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <app-card><p class="text-stat-label">Tariqa Groups</p><p class="text-2xl font-bold text-white">{{ communities().length }}</p></app-card>
      <app-card><p class="text-stat-label">Murids</p><p class="text-2xl font-bold text-white">{{ murids().length }}</p></app-card>
      <app-card><p class="text-stat-label">Wird Completed</p><p class="text-2xl font-bold text-amber-400">{{ totalWirdDone() }}</p></app-card>
      <app-card><p class="text-stat-label">Death Readings Done</p><p class="text-2xl font-bold text-green-400">{{ totalReadingsDone() }}</p></app-card>
    </div>

    <h3 class="text-white font-bold text-lg mb-3">Tariqa Communities</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <app-card *ngFor="let c of communities()">
        <h4 class="text-white font-bold">{{ c.name }}</h4>
        <p class="text-emerald-300 text-sm">{{ c.memberCount }} members</p>
        <p class="text-emerald-200 text-sm mt-2">{{ c.description }}</p>
      </app-card>
    </div>

    <h3 class="text-white font-bold text-lg mb-3">Murid Progress</h3>
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="text-emerald-400 text-sm uppercase border-b border-emerald-800">
          <tr>
            <th class="py-3 pr-4">Name</th>
            <th class="py-3 pr-4 hidden sm:table-cell">Communities</th>
            <th class="py-3 pr-4">Wird</th>
            <th class="py-3 pr-4">Qur'an</th>
            <th class="py-3">Readings</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let m of murids()" class="border-b border-emerald-900/50">
            <td class="py-3 pr-4 text-white font-medium">{{ m.fullName }}</td>
            <td class="py-3 pr-4 text-emerald-300 hidden sm:table-cell">{{ communityNames(m) }}</td>
            <td class="py-3 pr-4 text-emerald-200">{{ m.wirdCompleted }}/{{ m.wirdTotal }}</td>
            <td class="py-3 pr-4 text-emerald-200">{{ m.quranParasCompleted }} paras</td>
            <td class="py-3 text-emerald-200">{{ m.deathReadingsCompleted }}/{{ m.deathReadingsTotal }}</td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!murids().length" class="text-emerald-300 mt-4">No murids in tariqa communities yet.</p>
    </div>
  `
})
export class MuqaddamComponent implements OnInit {
  private muqaddam = inject(MuqaddamService);
  murids = signal<MuridSummary[]>([]);
  communities = signal<TariqaCommunity[]>([]);

  ngOnInit(): void {
    const id = environment.defaultMosqueId;
    this.muqaddam.getMurids(id).subscribe(m => this.murids.set(m));
    this.muqaddam.getCommunities(id).subscribe(c => this.communities.set(c));
  }

  communityNames(m: MuridSummary): string {
    return m.communities.map(c => c.name).join(', ') || '—';
  }

  totalWirdDone(): number {
    return this.murids().reduce((s, m) => s + m.wirdCompleted, 0);
  }

  totalReadingsDone(): number {
    return this.murids().reduce((s, m) => s + m.deathReadingsCompleted, 0);
  }
}
