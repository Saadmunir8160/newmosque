import { Component, OnInit, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';

import { TeacherService, TeacherDashboard } from '../../core/services/teacher.service';

import { PageHeaderComponent } from '../../shared/ui/page-header.component';

import { CardComponent } from '../../shared/ui/card.component';



@Component({

  selector: 'app-teacher-dashboard',

  standalone: true,

  imports: [CommonModule, RouterModule, PageHeaderComponent, CardComponent],

  template: `

    <app-page-header [useAuthRole]="true" title="Teacher Dashboard"

      subtitle="Manage your classes, attendance, progress, and assignments." />



    <div class="mos-kpi-grid mb-8" *ngIf="dash() as d">

      <app-card><p class="text-stat-label">My Classes</p><p class="mos-stat-value">{{ d.totalClasses }}</p></app-card>

      <app-card><p class="text-stat-label">Students</p><p class="mos-stat-value">{{ d.totalStudents }}</p></app-card>

      <app-card><p class="text-stat-label">Attendance Rate</p><p class="mos-stat-value mos-stat-value--accent">{{ d.attendanceRate }}%</p></app-card>

      <app-card><p class="text-stat-label">Pending Grades</p><p class="mos-stat-value mos-stat-value--danger">{{ d.pendingGrades }}</p></app-card>

    </div>



    <div class="mos-quick-grid mb-8">

      <a *ngFor="let link of links" [routerLink]="link.route" class="mos-quick-link">

        <h3 class="mos-quick-link__title">{{ link.title }}</h3>

        <p class="mos-quick-link__desc">{{ link.desc }}</p>

      </a>

    </div>



    <app-card *ngIf="dash()?.recentActivity?.length">

      <h3 class="mos-dash-panel__title">Recent Activity</h3>

      <div *ngFor="let a of dash()!.recentActivity" class="mos-activity-row">

        <span class="mos-activity-badge">{{ a.type }}</span>

        <div>

          <p class="mos-activity-title">{{ a.title }}</p>

          <p class="mos-activity-meta" *ngIf="a.detail">{{ a.detail }} · {{ a.at | date:'short' }}</p>

        </div>

      </div>

    </app-card>

  `,

})

export class TeacherDashboardComponent implements OnInit {

  private teacher = inject(TeacherService);

  dash = signal<TeacherDashboard | null>(null);



  links = [

    { route: '/dashboard/teacher/classes', title: 'My Classes', desc: 'View assigned classes and students' },

    { route: '/dashboard/teacher/attendance', title: 'Attendance', desc: 'Mark present, absent, or late' },

    { route: '/dashboard/teacher/progress', title: 'Student Progress', desc: 'Quran, memorization, exams, notes' },

    { route: '/dashboard/teacher/assignments', title: 'Assignments', desc: 'Homework, resources, grading' },

    { route: '/dashboard/teacher/reports', title: 'Reports', desc: 'Class attendance summaries' },

  ];



  ngOnInit(): void {

    this.teacher.getDashboard().subscribe(d => this.dash.set(d));

  }

}


