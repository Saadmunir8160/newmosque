import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MadrassahService, ParentChildView } from '../../core/services/madrassah.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-parent-portal',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Parent" title="My Children" subtitle="Attendance, fees, and progress notes" />
    <p *ngIf="!children().length" class="text-emerald-300">No children linked to your account.</p>
    <app-card *ngFor="let c of children()" class="block mb-6">
      <h3 class="text-2xl font-bold text-white mb-4">{{ c.student.name }}</h3>
      <div class="grid md:grid-cols-3 gap-4 mb-4">
        <div>
          <p class="text-emerald-400 text-sm uppercase mb-2">Attendance</p>
          <p *ngFor="let a of c.attendance" class="text-emerald-100 text-sm">{{ a.status }}: {{ a.count }}</p>
        </div>
        <div>
          <p class="text-emerald-400 text-sm uppercase mb-2">Fees</p>
          <p *ngFor="let f of c.fees" class="text-sm" [class.text-red-400]="f.status === 'Unpaid'" [class.text-emerald-100]="f.status !== 'Unpaid'">
            £{{ f.amount }} — {{ f.status }} (due {{ f.dueDate }})
          </p>
        </div>
        <div>
          <p class="text-emerald-400 text-sm uppercase mb-2">Progress</p>
          <p *ngFor="let n of c.progressNotes" class="text-emerald-100 text-sm mb-2">{{ n.note }}</p>
        </div>
      </div>
    </app-card>
  `
})
export class ParentPortalComponent implements OnInit {
  private madrassah = inject(MadrassahService);
  children = signal<ParentChildView[]>([]);
  ngOnInit(): void { this.madrassah.getMyChildren().subscribe(c => this.children.set(c)); }
}
