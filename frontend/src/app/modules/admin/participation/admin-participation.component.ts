import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { environment } from '../../../../environments/environment';
import { ParticipationOpportunity } from '../../../core/models';

@Component({
  selector: 'app-admin-participation',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Participation Opportunities" subtitle="Volunteering, classes, projects" />
    <app-card>
      <input class="input mb-2" placeholder="Title" [(ngModel)]="form.title">
      <select class="input mb-2" [(ngModel)]="form.type">
        <option value="Volunteering">Volunteering</option><option value="Class">Class</option>
        <option value="Project">Project</option><option value="Event">Event</option>
      </select>
      <textarea class="input mb-2" rows="2" placeholder="Description" [(ngModel)]="form.description"></textarea>
      <button class="btn" (click)="create()">Post Opportunity</button>
    </app-card>
    <app-card *ngFor="let o of items()" class="block mt-3">
      <h4 class="text-white font-bold">{{ o.title }}</h4>
      <p class="text-emerald-300 text-sm">{{ o.type }} · {{ o.description }}</p>
    </app-card>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}`]
})
export class AdminParticipationComponent implements OnInit {
  private admin = inject(AdminService);
  private mosque = inject(MosqueService);
  items = signal<ParticipationOpportunity[]>([]);
  form = { title: '', type: 'Volunteering', description: '' };
  mid = environment.defaultMosqueId;

  ngOnInit(): void { this.mosque.getParticipation(this.mid).subscribe(o => this.items.set(o)); }

  create(): void {
    this.admin.createParticipation(this.mid, { ...this.form, isActive: true }).subscribe(() => {
      this.mosque.getParticipation(this.mid).subscribe(o => this.items.set(o));
    });
  }
}
