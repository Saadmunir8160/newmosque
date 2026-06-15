import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { MosqueService } from '../../core/services/mosque.service';
import { ParticipationOpportunity } from '../../core/models';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-member-participation',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header [useAuthRole]="true" title="Participation" subtitle="Browse and register for opportunities" />
    <app-card *ngFor="let p of items()" class="block mb-3">
      <h4 class="text-white font-bold">{{ p.title }}</h4>
      <p class="text-emerald-300 text-sm">{{ p.type }} <span *ngIf="p.date">· {{ p.date | date:'mediumDate' }}</span></p>
      <p class="text-emerald-100 text-sm mt-2">{{ p.description || 'No details yet.' }}</p>
    </app-card>
    <p *ngIf="!items().length" class="text-emerald-300 text-sm">No participation opportunities available.</p>
  `
})
export class MemberParticipationComponent implements OnInit {
  private mosque = inject(MosqueService);
  items = signal<ParticipationOpportunity[]>([]);

  ngOnInit(): void {
    this.mosque.getParticipation(environment.defaultMosqueId).subscribe(v => this.items.set(v));
  }
}
