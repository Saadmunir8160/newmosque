import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService, Community } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-member-communities',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Member" title="Communities" subtitle="Join tariqa circles and study groups" />
    <app-card *ngFor="let c of communities()" class="block mb-4">
      <div class="flex justify-between items-start">
        <div>
          <h4 class="text-white font-bold">{{ c.name }}</h4>
          <p class="text-amber-400 text-sm uppercase">{{ c.type }}</p>
          <p class="text-emerald-200 text-sm mt-2">{{ c.description }}</p>
        </div>
        <button class="btn" (click)="join(c.id)">Join</button>
      </div>
    </app-card>
  `,
  styles: [`.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 14px;border-radius:8px;border:none;cursor:pointer;font-size:12px}`]
})
export class MemberCommunitiesComponent implements OnInit {
  private content = inject(ContentService);
  communities = signal<Community[]>([]);
  ngOnInit(): void { this.content.getCommunities(environment.defaultMosqueId).subscribe(c => this.communities.set(c)); }
  join(id: number): void { this.content.joinCommunity(id).subscribe(); }
}
