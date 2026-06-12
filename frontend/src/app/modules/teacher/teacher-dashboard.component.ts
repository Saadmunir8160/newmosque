import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MadrassahService, MadrassahDashboard } from '../../core/services/madrassah.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Teacher" title="Teacher Dashboard"
      subtitle="Your daily workflow — each step opens a working madrassah screen." />

    <div class="grid md:grid-cols-3 gap-4 mb-8" *ngIf="dash() as d">
      <app-card><p class="text-stat-label">Students</p><p class="text-3xl font-bold text-white">{{ d.totalStudents }}</p></app-card>
      <app-card><p class="text-stat-label">Classes</p><p class="text-3xl font-bold text-white">{{ d.totalClasses }}</p></app-card>
      <app-card><p class="text-stat-label">Attendance Rate</p><p class="text-3xl font-bold text-amber-400">{{ d.attendanceRate }}%</p></app-card>
    </div>

    <div class="space-y-4">
      <a *ngFor="let link of links" [routerLink]="link.route"
        class="block bg-[#064e3b] border border-emerald-800 rounded-2xl p-5 sm:p-6 hover:border-amber-400 transition-all hover:-translate-y-0.5">
        <div class="flex items-start gap-3">
          <span class="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-400 font-bold text-sm flex items-center justify-center shrink-0">{{ link.step }}</span>
          <div class="flex-1 min-w-0">
            <h3 class="text-white font-bold mb-1">{{ link.title }}</h3>
            <p class="text-emerald-300 text-sm mb-3">{{ link.desc }}</p>
            <ol class="space-y-1">
              <li *ngFor="let s of link.steps; let i = index" class="text-emerald-100 text-sm flex gap-2">
                <span class="text-amber-400/70 font-mono text-xs">{{ link.step }}.{{ i + 1 }}</span>{{ s }}
              </li>
            </ol>
          </div>
          <span class="text-amber-400 text-sm font-bold shrink-0 hidden sm:inline">Open →</span>
        </div>
      </a>
    </div>
  `
})
export class TeacherDashboardComponent implements OnInit {
  private madrassah = inject(MadrassahService);
  dash = signal<MadrassahDashboard | null>(null);

  links = [
    {
      step: 1,
      route: '/dashboard/teacher/classes',
      title: 'My Classes',
      desc: 'See all classes assigned to you.',
      steps: ['Open your class list', 'Tap a class to view students', 'Check schedule and room details'],
    },
    {
      step: 2,
      route: '/dashboard/teacher/attendance',
      title: 'Record Attendance',
      desc: 'Mark who attended today\'s session.',
      steps: ['Select class and date', 'Mark each student present or absent', 'Save — parents can view in portal'],
    },
  ];

  ngOnInit(): void {
    this.madrassah.getDashboard().subscribe(d => this.dash.set(d));
  }
}
