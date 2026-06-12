import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ContentService, Community } from '../../../core/services/content.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-communities',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Communities" subtitle="Create tariqa circles, study groups, youth groups" />
    <app-card>
      <input class="input mb-2" placeholder="Name" [(ngModel)]="form.name">
      <select class="input mb-2" [(ngModel)]="form.type">
        <option value="Tariqa">Tariqa</option><option value="StudyCircle">Study Circle</option>
        <option value="YouthGroup">Youth Group</option><option value="SistersGroup">Sisters Group</option>
      </select>
      <textarea class="input mb-2" rows="2" placeholder="Description" [(ngModel)]="form.description"></textarea>
      <button class="btn" (click)="create()">Create Community</button>
    </app-card>
    <app-card *ngFor="let c of items()" class="block mt-3">
      <h4 class="text-white font-bold">{{ c.name }}</h4>
      <p class="text-emerald-300 text-sm">{{ c.type }} · {{ c.isPublic ? 'Public' : 'Private' }}</p>
    </app-card>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}`]
})
export class AdminCommunitiesComponent implements OnInit {
  private admin = inject(AdminService);
  private content = inject(ContentService);
  items = signal<Community[]>([]);
  form = { name: '', type: 'Tariqa', description: '' };

  ngOnInit(): void { this.content.getCommunities(environment.defaultMosqueId).subscribe(c => this.items.set(c)); }

  create(): void {
    this.admin.createCommunity({ ...this.form, mosqueId: environment.defaultMosqueId, isPublic: true }).subscribe(() => {
      this.content.getCommunities(environment.defaultMosqueId).subscribe(c => this.items.set(c));
    });
  }
}
