import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MadrassahService, MadrassahClass } from '../../core/services/madrassah.service';

@Component({
  selector: 'app-teacher-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="att-page">
      <header class="att-header">
        <p class="att-badge">Teacher</p>
        <h1 class="att-title">Record Attendance</h1>
      </header>

      <section class="att-panel">
        <div class="att-form">
          <div class="att-field">
            <label class="att-label">Class</label>
            <select class="att-input" [(ngModel)]="classId" (ngModelChange)="onClassChange()">
              <option *ngFor="let c of classes()" [ngValue]="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="att-field att-field--date">
            <label class="att-label">Date</label>
            <input class="att-input" type="date" [(ngModel)]="sessionDate">
          </div>
          <button type="button" class="att-btn" (click)="createSession()">Start Session</button>
        </div>
      </section>

      <section *ngIf="selectedClass() as cls" class="att-panel">
        <h2 class="att-section-title">Mark attendance — {{ cls.name }}</h2>

        <div class="att-rows">
          <div *ngFor="let e of cls.enrolments; let i = index" class="att-row">
            <span class="att-row-num">{{ i + 1 }}</span>
            <span class="att-row-name">{{ e.student.name }}</span>
            <select class="att-status" [(ngModel)]="statusMap[e.student!.id]">
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>
          </div>
        </div>

        <button type="button" class="att-btn att-btn--save" [disabled]="!sessionId" (click)="saveAttendance()">
          Save Attendance
        </button>
        <p *ngIf="msg()" class="att-msg">{{ msg() }}</p>
      </section>
    </div>
  `,
  styles: [`
    .att-page { display: flex; flex-direction: column; gap: 1rem; }

    .att-header { margin-bottom: 0.25rem; }
    .att-badge {
      margin: 0 0 0.375rem;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #fbbf24;
    }
    .att-title {
      margin: 0;
      font-size: clamp(1.5rem, 3vw, 1.875rem);
      font-weight: 700;
      color: #fff;
    }

    .att-panel {
      background: #064e3b;
      border: 1px solid #065f46;
      border-radius: 0.75rem;
      padding: 1rem 1.125rem;
    }

    .att-form {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem 1rem;
    }
    .att-field { flex: 1; min-width: 10rem; }
    .att-field--date { flex: 0 1 11rem; min-width: 9rem; }
    .att-label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.8125rem;
      color: #6ee7b7;
    }
    .att-input {
      width: 100%;
      background: #022c22;
      border: 1px solid #065f46;
      border-radius: 0.5rem;
      padding: 0.5rem 0.75rem;
      color: #fff;
      font-size: 0.875rem;
    }

    .att-btn {
      background: #f59e0b;
      color: #022c22;
      font-weight: 700;
      font-size: 0.875rem;
      padding: 0.5rem 1.25rem;
      border-radius: 0.5rem;
      border: none;
      cursor: pointer;
      flex-shrink: 0;
    }
    .att-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .att-btn--save { width: 100%; margin-top: 1rem; padding: 0.625rem 1rem; }

    .att-section-title {
      margin: 0 0 1rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #fff;
    }

    .att-rows { display: flex; flex-direction: column; gap: 0.5rem; }
    .att-row {
      display: grid;
      grid-template-columns: 1.75rem 1fr minmax(7rem, 10rem);
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(6, 95, 70, 0.6);
    }
    .att-row:last-child { border-bottom: none; }
    .att-row-num {
      font-size: 0.875rem;
      font-weight: 600;
      color: #fff;
      text-align: center;
    }
    .att-row-name {
      font-size: 0.875rem;
      color: #d1fae5;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .att-status {
      width: 100%;
      background: #022c22;
      border: 1px solid #065f46;
      border-radius: 0.5rem;
      padding: 0.5rem 0.625rem;
      color: #fff;
      font-size: 0.8125rem;
    }

    .att-msg {
      margin: 0.75rem 0 0;
      font-size: 0.8125rem;
      color: #6ee7b7;
      text-align: center;
    }
  `]
})
export class TeacherAttendanceComponent implements OnInit {
  private madrassah = inject(MadrassahService);
  classes = signal<MadrassahClass[]>([]);
  selectedClass = signal<MadrassahClass | null>(null);
  classId = 0;
  sessionDate = new Date().toISOString().slice(0, 10);
  sessionId = 0;
  statusMap: Record<number, string> = {};
  msg = signal('');

  ngOnInit(): void {
    this.madrassah.getClasses().subscribe(c => {
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
  }

  createSession(): void {
    this.madrassah.createSession(this.classId, this.sessionDate).subscribe(s => {
      this.sessionId = s.id;
      this.msg.set('Session created. Mark attendance below.');
    });
  }

  saveAttendance(): void {
    const records = Object.entries(this.statusMap).map(([studentId, status]) => ({
      studentId: +studentId,
      status,
    }));
    this.madrassah.recordAttendance(this.sessionId, records).subscribe(() => this.msg.set('Attendance saved.'));
  }
}
