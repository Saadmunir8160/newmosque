import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { MosqueService } from '../../core/services/mosque.service';
import { JanazaAnnouncement } from '../../core/models';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-member-janaza',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header [useAuthRole]="true" title="Janaza" subtitle="View janaza announcements" />
    <app-card *ngFor="let j of janaza()" class="block mb-3">
      <h4 class="member-title">{{ j.name }}</h4>
      <p class="member-meta">{{ j.janazaDate | date:'mediumDate' }} · {{ j.janazaTime.slice(0,5) }}</p>
      <p class="member-desc mt-1">{{ j.location }}</p>
    </app-card>
    <p *ngIf="!janaza().length" class="member-empty">No janaza announcements currently.</p>
  `
})
export class MemberJanazaComponent implements OnInit {
  private mosque = inject(MosqueService);
  janaza = signal<JanazaAnnouncement[]>([]);

  ngOnInit(): void {
    this.mosque.getJanaza(environment.defaultMosqueId).subscribe(v => this.janaza.set(v));
  }
}
