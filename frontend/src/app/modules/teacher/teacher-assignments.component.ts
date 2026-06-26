import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService, ClassAssignment } from '../../core/services/teacher.service';
import { MadrassahClass } from '../../core/services/madrassah.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-teacher-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Teacher" title="Assignments"
      subtitle="Create homework, upload resources, and grade students" />

    <app-card class="block mb-4">
      <div class="grid md:grid-cols-2 gap-2 mb-2">
        <select class="input" [(ngModel)]="classId" (ngModelChange)="load()">
          <option [ngValue]="0">Select class</option>
          <option *ngFor="let c of classes()" [ngValue]="c.id">{{ c.name }}</option>
        </select>
        <input class="input" placeholder="Search assignments…" [(ngModel)]="search" (ngModelChange)="load()">
      </div>

      <h3 class="section">Create homework</h3>
      <input class="input mb-2" [(ngModel)]="form.title" placeholder="Assignment title">
      <textarea class="input mb-2" rows="2" [(ngModel)]="form.description" placeholder="Instructions"></textarea>
      <div class="grid md:grid-cols-2 gap-2">
        <input class="input" type="date" [(ngModel)]="form.dueDate">
        <input class="input" [(ngModel)]="form.resourceUrl" placeholder="Resource URL (PDF, link…)">
      </div>
      <input class="input mt-2" [(ngModel)]="form.resourceFileName" placeholder="Resource file name (display)">
      <button class="btn mt-3" (click)="create()" [disabled]="!classId">Create Assignment</button>
      <p *ngIf="msg()" class="msg">{{ msg() }}</p>
    </app-card>

    <app-card *ngFor="let a of assignments()" class="block mb-4">
      <div class="flex flex-col sm:flex-row sm:justify-between gap-2 mb-3">
        <div>
          <h4 class="text-white font-bold">{{ a.title }}</h4>
          <p class="text-mos-muted text-sm">{{ a.description }}</p>
          <p class="text-mos-muted text-xs" *ngIf="a.dueDate">Due {{ a.dueDate }}</p>
          <a *ngIf="a.resourceUrl" [href]="a.resourceUrl" target="_blank" rel="noopener" class="resource">📎 {{ a.resourceFileName || 'Resource' }}</a>
        </div>
      </div>

      <div *ngFor="let g of a.grades" class="grade-row">
        <span class="name">{{ g.student?.name || 'Student #' + g.studentId }}</span>
        <input class="input-sm" [(ngModel)]="gradeMap[g.id].grade" placeholder="Grade">
        <input class="input-sm" [(ngModel)]="gradeMap[g.id].feedback" placeholder="Feedback">
        <button class="btn-sm" (click)="saveGrade(a.id, g.studentId, g.id)">Save</button>
      </div>
    </app-card>
  `,
  styles: [`
    .input, .input-sm { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }
    .input-sm { padding: 6px 8px; font-size: 0.8125rem; }
    .section { margin: 0.75rem 0; color: #fcd34d; font-size: 0.875rem; font-weight: 600; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; }
    .btn:disabled { opacity: 0.5; }
    .btn-sm { background: #10b981; color: #0F172A; font-weight: 700; border: none; border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; cursor: pointer; }
    .msg { margin-top: 0.5rem; color: #6ee7b7; font-size: 0.8125rem; }
    .resource { display: inline-block; margin-top: 0.35rem; color: #fbbf24; font-size: 0.8125rem; }
    .grade-row { display: grid; grid-template-columns: 1fr 5rem 1fr auto; gap: 0.5rem; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .name { color: #d1fae5; font-size: 0.875rem; }
  `]
})
export class TeacherAssignmentsComponent implements OnInit {
  private teacher = inject(TeacherService);
  classes = signal<MadrassahClass[]>([]);
  assignments = signal<ClassAssignment[]>([]);
  classId = 0;
  search = '';
  form = { title: '', description: '', dueDate: '', resourceUrl: '', resourceFileName: '' };
  gradeMap: Record<number, { grade: string; feedback: string }> = {};
  msg = signal('');

  ngOnInit(): void {
    this.teacher.getClasses().subscribe(c => {
      this.classes.set(c);
      if (c.length) { this.classId = c[0].id; this.load(); }
    });
  }

  load(): void {
    if (!this.classId) return;
    this.teacher.getAssignments(this.classId, this.search).subscribe(list => {
      this.assignments.set(list);
      this.gradeMap = {};
      list.forEach(a => a.grades?.forEach(g => {
        this.gradeMap[g.id] = { grade: g.grade ?? '', feedback: g.feedback ?? '' };
      }));
    });
  }

  create(): void {
    if (!this.form.title.trim()) return;
    this.teacher.createAssignment(this.classId, {
      title: this.form.title.trim(),
      description: this.form.description.trim() || undefined,
      dueDate: this.form.dueDate || undefined,
      resourceUrl: this.form.resourceUrl.trim() || undefined,
      resourceFileName: this.form.resourceFileName.trim() || undefined,
    }).subscribe(() => {
      this.msg.set('Assignment created.');
      this.form = { title: '', description: '', dueDate: '', resourceUrl: '', resourceFileName: '' };
      this.load();
    });
  }

  saveGrade(assignmentId: number, studentId: number, gradeRowId: number): void {
    const g = this.gradeMap[gradeRowId];
    this.teacher.gradeAssignment(assignmentId, studentId, {
      grade: g.grade || undefined,
      feedback: g.feedback || undefined,
      status: 'Graded',
    }).subscribe(() => this.msg.set('Grade saved.'));
  }
}
