import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../../core/services/teacher.service';
import { MadrassahClass } from '../../core/services/madrassah.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-teacher-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Teacher" title="Attendance" subtitle="Mark present, absent, or late" />

    <app-card class="block mb-4">
      <div class="form-row">
        <div class="field">
          <label class="label">Class</label>
          <select class="input" [(ngModel)]="classId" (ngModelChange)="onClassChange()">
            <option *ngFor="let c of classes()" [ngValue]="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label class="label">Date</label>
          <input class="input" type="date" [(ngModel)]="sessionDate">
        </div>
        <button type="button" class="btn" (click)="createSession()">Start Session</button>
      </div>
    </app-card>

    <app-card *ngIf="selectedClass() as cls">
      <h3 class="section">Mark attendance — {{ cls.name }}</h3>
      <div *ngFor="let e of cls.enrolments; let i = index" class="row">
        <span class="num">{{ i + 1 }}</span>
        <span class="name">{{ e.student?.name }}</span>
        <select class="status" [(ngModel)]="statusMap[e.student!.id]">
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
          <option value="Late">Late</option>
        </select>
      </div>
      <button type="button" class="btn btn-save" [disabled]="!sessionId" (click)="saveAttendance()">Save Attendance</button>
      <p *ngIf="msg()" class="msg">{{ msg() }}</p>
    </app-card>
  `,
  styles: [`
    .form-row { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end; }
    .field { flex: 1; min-width: 10rem; }
    .label { display: block; margin-bottom: 0.35rem; font-size: 0.75rem; color: #6ee7b7; }
    .input, .status { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 8px 10px; color: #fff; width: 100%; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; }
    .btn:disabled { opacity: 0.5; }
    .btn-save { width: 100%; margin-top: 1rem; }
    .section { margin: 0 0 1rem; color: #fff; font-size: 0.9375rem; font-weight: 600; }
    .row { display: grid; grid-template-columns: 2rem 1fr 9rem; gap: 0.75rem; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .num { color: #fff; font-weight: 600; text-align: center; }
    .name { color: #d1fae5; font-size: 0.875rem; }
    .msg { margin-top: 0.75rem; color: #6ee7b7; font-size: 0.8125rem; text-align: center; }
  `]
})
export class TeacherAttendanceComponent implements OnInit {
  private teacher = inject(TeacherService);
  classes = signal<MadrassahClass[]>([]);
  selectedClass = signal<MadrassahClass | null>(null);
  classId = 0;
  sessionDate = new Date().toISOString().slice(0, 10);
  sessionId = 0;
  statusMap: Record<number, string> = {};
  msg = signal('');

  ngOnInit(): void {
    this.teacher.getClasses().subscribe(c => {
      this.classes.set(c);
      if (c.length) {
        this.classId = c[0].id;
        this.onClassChange();
      }
    });
  }

  onClassChange(): void {
    const cls = this.classes().find(c => c.id === this.classId) || null;
    this.selectedClass.set(cls);
    this.statusMap = {};
    cls?.enrolments?.forEach(e => {
      if (e.student) this.statusMap[e.student.id] = 'Present';
    });
    this.sessionId = 0;
  }

  createSession(): void {
    this.teacher.createSession(this.classId, this.sessionDate).subscribe(s => {
      this.sessionId = s.id;
      this.msg.set('Session created. Mark attendance below.');
    });
  }

  saveAttendance(): void {
    const records = Object.entries(this.statusMap).map(([studentId, status]) => ({
      studentId: +studentId,
      status,
    }));
    this.teacher.recordAttendance(this.sessionId, records).subscribe(() => this.msg.set('Attendance saved.'));
  }
}
