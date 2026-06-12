import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { environment } from '../../../../environments/environment';
import { JanazaAnnouncement } from '../../../core/models';

@Component({
  selector: 'app-admin-janaza',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Janaza Announcements" subtitle="Respectful death and funeral notices" />
    <app-card>
      <input class="input mb-2" placeholder="Name of deceased" [(ngModel)]="form.name">
      <input class="input mb-2" type="date" [(ngModel)]="form.janazaDate">
      <input class="input mb-2" type="time" [(ngModel)]="form.janazaTime">
      <input class="input mb-2" placeholder="Location" [(ngModel)]="form.location">
      <input class="input mb-2" placeholder="Burial location" [(ngModel)]="form.burialLocation">
      <button class="btn" (click)="create()">Post Janaza</button>
    </app-card>
    <app-card *ngFor="let j of items()" class="block mt-3">
      <h4 class="text-amber-400 font-bold">{{ j.name }}</h4>
      <p class="text-emerald-200 text-sm">{{ j.janazaDate }} at {{ j.janazaTime }} — {{ j.location }}</p>
    </app-card>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}`]
})
export class AdminJanazaComponent implements OnInit {
  private admin = inject(AdminService);
  private mosque = inject(MosqueService);
  items = signal<JanazaAnnouncement[]>([]);
  form = { name: '', janazaDate: '', janazaTime: '13:30', location: '', burialLocation: '', dateOfDeath: '' };
  mid = environment.defaultMosqueId;

  ngOnInit(): void { this.mosque.getJanaza(this.mid).subscribe(j => this.items.set(j)); }

  create(): void {
    const data = { ...this.form, dateOfDeath: this.form.janazaDate, janazaTime: this.form.janazaTime + ':00' };
    this.admin.createJanaza(this.mid, data).subscribe(() => this.mosque.getJanaza(this.mid).subscribe(j => this.items.set(j)));
  }
}
