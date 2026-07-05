import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ContentService, Community } from '../../../core/services/content.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';

@Component({
  selector: 'app-admin-communities',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Communities" subtitle="Create tariqa circles, study groups, youth groups" />

    <div class="toolbar">
      <input class="input" placeholder="Search communities…" [(ngModel)]="search">
      <select class="input w-auto" [(ngModel)]="typeFilter">
        <option value="">All types</option>
        <option value="Tariqa">Tariqa</option>
        <option value="StudyCircle">Study Circle</option>
        <option value="YouthGroup">Youth Group</option>
        <option value="SistersGroup">Sisters Group</option>
      </select>
    </div>

    <app-card>
      <input class="input mb-2" placeholder="Name" [(ngModel)]="form.name">
      <select class="input mb-2" [(ngModel)]="form.type">
        <option value="Tariqa">Tariqa</option><option value="StudyCircle">Study Circle</option>
        <option value="YouthGroup">Youth Group</option><option value="SistersGroup">Sisters Group</option>
      </select>
      <textarea class="input mb-2" rows="2" placeholder="Description" [(ngModel)]="form.description"></textarea>
      <button class="btn" (click)="create()">Create Community</button>
    </app-card>

    <app-card *ngFor="let c of filtered()" class="block mt-3">
      <h4 class="text-white font-bold">{{ c.name }}</h4>
      <p class="text-mos-muted text-sm">{{ c.type }} · {{ c.isPublic ? 'Public' : 'Private' }}</p>
      <p *ngIf="c.description" class="text-mos-muted text-sm mt-1">{{ c.description }}</p>
    </app-card>
    <p *ngIf="!filtered().length" class="empty">No communities match your filters.</p>
  `,
  styles: [`
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .input{background:#0F172A;border:1px solid #F8FAFC;border-radius:8px;padding:10px;color:#fff;width:100%}
    .w-auto { width: auto; min-width: 140px; }
    .btn{background:#f59e0b;color:#0F172A;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}
    .empty { color: #6ee7b7; font-size: 0.875rem; margin-top: 1rem; }
  `]
})
export class AdminCommunitiesComponent implements OnInit {
  private admin = inject(AdminService);
  private content = inject(ContentService);
  private mosqueCtx = inject(MosqueContextService);
  items = signal<Community[]>([]);
  form = { name: '', type: 'Tariqa', description: '' };
  search = '';
  typeFilter = '';
  mid = 1;

  filtered = computed(() => {
    const q = this.search.trim().toLowerCase();
    return this.items().filter(c => {
      if (this.typeFilter && c.type !== this.typeFilter) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.description?.toLowerCase().includes(q) ?? false);
    });
  });

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => {
      this.mid = id;
      this.reload();
    });
  }

  reload(): void {
    this.content.getCommunities(this.mid).subscribe(c => this.items.set(c));
  }

  create(): void {
    this.admin.createCommunity({ ...this.form, mosqueId: this.mid, isPublic: true }).subscribe(() => {
      this.form = { name: '', type: 'Tariqa', description: '' };
      this.reload();
    });
  }
}
