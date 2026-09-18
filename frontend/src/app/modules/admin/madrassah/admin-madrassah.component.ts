import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { MadrassahService, MadrassahDashboard } from '../../../core/services/madrassah.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

@Component({
  selector: 'app-admin-madrassah',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="mos-dash">
      <app-page-header badge="Mosque Admin" title="Madrassah" subtitle="Classes, students, and attendance overview" />

      <label class="mos-form-search">
        <span class="mos-form-search__icon" aria-hidden="true">⌕</span>
        <input
          class="mos-form-input"
          type="search"
          placeholder="Search classes…"
          [(ngModel)]="search"
          (ngModelChange)="loadClasses()"
        />
      </label>

      <div class="mos-kpi-grid" *ngIf="dash() as d">
        <article class="mos-kpi">
          <span class="mos-kpi__icon">👨‍🎓</span>
          <p class="mos-kpi__label">Students</p>
          <p class="mos-kpi__value">{{ d.totalStudents }}</p>
        </article>
        <article class="mos-kpi">
          <span class="mos-kpi__icon">📚</span>
          <p class="mos-kpi__label">Classes</p>
          <p class="mos-kpi__value">{{ d.totalClasses }}</p>
        </article>
        <article class="mos-kpi">
          <span class="mos-kpi__icon">✓</span>
          <p class="mos-kpi__label">Attendance</p>
          <p class="mos-kpi__value mos-stat-value--accent">{{ d.attendanceRate }}%</p>
        </article>
        <article class="mos-kpi mos-kpi--warn">
          <span class="mos-kpi__icon">£</span>
          <p class="mos-kpi__label">Unpaid fees</p>
          <p class="mos-kpi__value mos-stat-value--danger">{{ d.unpaidFees }}</p>
        </article>
      </div>

      <section class="mos-dash-panel">
        <h3 class="mos-dash-panel__title">Add class</h3>
        <div class="mos-form-grid">
          <label class="mos-form-field">
            <span class="mos-form-label">Class name</span>
            <input class="mos-form-input" placeholder="Qur'an Level 1 (Boys)" [(ngModel)]="classForm.name">
          </label>
          <label class="mos-form-field">
            <span class="mos-form-label">Schedule</span>
            <input class="mos-form-input" placeholder="Mon–Thu 17:00–18:30" [(ngModel)]="classForm.schedule">
          </label>
        </div>
        <button type="button" class="mos-dash-btn mos-dash-btn--accent" (click)="createClass()">Create class</button>
      </section>

      <section class="mos-dash-panel">
        <h3 class="mos-dash-panel__title">Enrol new student</h3>
        <div class="mos-form-grid">
          <label class="mos-form-field">
            <span class="mos-form-label">Student name</span>
            <input class="mos-form-input" placeholder="Full name" [(ngModel)]="studentForm.name">
          </label>
          <label class="mos-form-field">
            <span class="mos-form-label">Assign to class</span>
            <select class="mos-form-input" [(ngModel)]="studentForm.classId">
              <option [value]="0">Select a class...</option>
              <option *ngFor="let c of classes()" [value]="c.id">{{ c.name }}</option>
            </select>
          </label>
        </div>
        <button type="button" class="mos-dash-btn mos-dash-btn--accent mt-2" [disabled]="!studentForm.name || !studentForm.classId || enroling()" (click)="createStudent()">{{ enroling() ? 'Enroling...' : 'Enrol student' }}</button>
      </section>

      <section *ngFor="let c of classes()" class="mos-dash-panel">
        <h4 class="mos-class-title">{{ c.name }}</h4>
        <p class="mos-class-meta">{{ c.schedule || 'No schedule' }} · {{ c.enrolments?.length || 0 }} students</p>
      </section>

      <p *ngIf="!classes().length" class="mos-dash-empty">No classes yet. Create your first class above.</p>
    </div>
  `,
  styles: [`
    .mos-form-grid { display: grid; grid-template-columns: 1fr; gap: 0.875rem; margin-bottom: 1rem; }
    @media (min-width: 640px) { .mos-form-grid { grid-template-columns: 1fr 1fr; } }
    .mos-form-field { display: flex; flex-direction: column; gap: 0.35rem; }
    .mos-class-title { margin: 0; font-size: 0.9375rem; font-weight: 700; color: var(--mos-text-primary); }
    .mos-class-meta { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--mos-text-secondary); }
    .mt-2 { margin-top: 0.5rem; }
  `]
})
export class AdminMadrassahComponent implements OnInit {
  private madrassah = inject(MadrassahService);
  private admin = inject(AdminService);
  private mosqueCtx = inject(MosqueContextService);
  dash = signal<MadrassahDashboard | null>(null);
  classes = signal<import('../../../core/services/madrassah.service').MadrassahClass[]>([]);
  search = '';
  classForm = { name: '', schedule: '' };
  studentForm = { name: '', classId: 0 };
  enroling = signal(false);
  mosqueId = 1;

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => {
      this.mosqueId = id;
      this.madrassah.getDashboard(id).subscribe(d => this.dash.set(d));
      this.loadClasses();
    });
  }

  loadClasses(): void {
    this.madrassah.getClasses(this.mosqueId, this.search).subscribe(c => this.classes.set(c));
  }

  createClass(): void {
    if (!this.classForm.name.trim()) return;
    this.admin.createMadrassahClass(this.mosqueId, this.classForm).subscribe(() => {
      this.classForm = { name: '', schedule: '' };
      this.madrassah.getDashboard(this.mosqueId).subscribe(d => this.dash.set(d));
      this.loadClasses();
    });
  }

  createStudent(): void {
    if (!this.studentForm.name.trim() || !this.studentForm.classId) return;
    this.enroling.set(true);
    this.admin.createStudent({ name: this.studentForm.name }).subscribe({
      next: (res) => {
        this.admin.enrolStudent(this.studentForm.classId, res.id).subscribe({
          next: () => {
            this.studentForm = { name: '', classId: 0 };
            this.madrassah.getDashboard(this.mosqueId).subscribe(d => this.dash.set(d));
            this.loadClasses();
            this.enroling.set(false);
          },
          error: () => this.enroling.set(false)
        });
      },
      error: () => this.enroling.set(false)
    });
  }
}
