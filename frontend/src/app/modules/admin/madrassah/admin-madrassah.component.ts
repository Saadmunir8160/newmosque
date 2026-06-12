import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MadrassahService, MadrassahDashboard } from '../../../core/services/madrassah.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';

@Component({
  selector: 'app-admin-madrassah',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Madrassah Overview" />
    <div class="grid md:grid-cols-4 gap-4 mb-8" *ngIf="dash() as d">
      <app-card><p class="text-stat-label">Students</p><p class="text-3xl font-bold text-white">{{ d.totalStudents }}</p></app-card>
      <app-card><p class="text-stat-label">Classes</p><p class="text-3xl font-bold text-white">{{ d.totalClasses }}</p></app-card>
      <app-card><p class="text-stat-label">Attendance</p><p class="text-3xl font-bold text-amber-400">{{ d.attendanceRate }}%</p></app-card>
      <app-card><p class="text-stat-label">Unpaid Fees</p><p class="text-3xl font-bold text-red-400">{{ d.unpaidFees }}</p></app-card>
    </div>
    <app-card *ngFor="let c of classes()">
      <h4 class="text-white font-bold">{{ c.name }}</h4>
      <p class="text-emerald-300 text-sm">{{ c.schedule }} · {{ c.enrolments?.length || 0 }} students</p>
    </app-card>
  `
})
export class AdminMadrassahComponent implements OnInit {
  private madrassah = inject(MadrassahService);
  dash = signal<MadrassahDashboard | null>(null);
  classes = signal<import('../../../core/services/madrassah.service').MadrassahClass[]>([]);

  ngOnInit(): void {
    this.madrassah.getDashboard().subscribe(d => this.dash.set(d));
    this.madrassah.getClasses().subscribe(c => this.classes.set(c));
  }
}
