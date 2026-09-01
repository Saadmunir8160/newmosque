import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { MosqueService } from '../../core/services/mosque.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';
import { ParticipationOpportunity } from '../../core/models';

interface RegistrationRow {
  id: number;
  opportunityId: number;
  userId: string;
  status?: string;
  registeredAt?: string;
}

@Component({
  selector: 'app-teacher-participation',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header
      badge="Teacher"
      title="Participation"
      subtitle="View opportunity registrations for your mosque (read-only)" />

    <p *ngIf="!items().length" class="text-mos-muted">No active opportunities.</p>

    <app-card *ngFor="let o of items()" class="block mb-4">
      <div class="row">
        <div>
          <h3 class="title">{{ o.title }}</h3>
          <p class="meta">{{ o.type }} · {{ o.description }}</p>
        </div>
        <button type="button" class="btn" (click)="toggleRegs(o.id)">
          {{ openId() === o.id ? 'Hide' : 'View' }} registrations
        </button>
      </div>
      <div *ngIf="openId() === o.id" class="regs">
        <p *ngIf="loadingRegs()" class="meta">Loading…</p>
        <p *ngIf="!loadingRegs() && !regs().length" class="meta">No registrations yet.</p>
        <ul *ngIf="regs().length">
          <li *ngFor="let r of regs()">
            {{ r.userId }} · {{ r.status || 'registered' }}
            <span *ngIf="r.registeredAt"> · {{ r.registeredAt | date:'short' }}</span>
          </li>
        </ul>
      </div>
    </app-card>
  `,
  styles: [`
    .row { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
    .title { margin: 0; color: #fff; font-weight: 700; }
    .meta { margin: 0.25rem 0 0; color: #94a3b8; font-size: 0.85rem; }
    .btn { background: #f59e0b; color: #0f172a; font-weight: 700; border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
    .regs { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.08); }
    ul { margin: 0; padding-left: 1.1rem; color: #e2e8f0; font-size: 0.875rem; }
  `],
})
export class TeacherParticipationComponent implements OnInit {
  private mosque = inject(MosqueService);
  private mosqueCtx = inject(MosqueContextService);
  private http = inject(HttpClient);

  items = signal<ParticipationOpportunity[]>([]);
  openId = signal<number | null>(null);
  regs = signal<RegistrationRow[]>([]);
  loadingRegs = signal(false);
  mid = 1;

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => {
      this.mid = id;
      this.mosque.getParticipation(id).subscribe(o => this.items.set(o ?? []));
    });
  }

  toggleRegs(opportunityId: number): void {
    if (this.openId() === opportunityId) {
      this.openId.set(null);
      this.regs.set([]);
      return;
    }
    this.openId.set(opportunityId);
    this.loadingRegs.set(true);
    this.http
      .get<RegistrationRow[]>(
        `${environment.apiUrl}/mosques/${this.mid}/participation/${opportunityId}/registrations`
      )
      .subscribe({
        next: rows => {
          this.regs.set(rows ?? []);
          this.loadingRegs.set(false);
        },
        error: () => {
          this.regs.set([]);
          this.loadingRegs.set(false);
        },
      });
  }
}
