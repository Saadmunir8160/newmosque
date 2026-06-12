import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MadrassahService, MadrassahClass } from '../../core/services/madrassah.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-teacher-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Teacher" title="Record Attendance" />
    <app-card>
      <label class="text-emerald-300 text-sm">Class</label>
      <select class="input mb-3" [(ngModel)]="classId" (ngModelChange)="onClassChange()">
        <option *ngFor="let c of classes()" [ngValue]="c.id">{{ c.name }}</option>
      </select>
      <input class="input mb-3" type="date" [(ngModel)]="sessionDate">
      <button class="btn mb-4" (click)="createSession()">Start Session</button>
    </app-card>
    <app-card *ngIf="selectedClass() as cls">
      <h4 class="text-white font-bold mb-4">Mark attendance — {{ cls.name }}</h4>
      <div *ngFor="let e of cls.enrolments" class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-2 border-b border-emerald-800">
        <span class="text-emerald-100 min-w-0">{{ e.student?.name }}</span>
        <select class="input w-full sm:w-32 shrink-0" [(ngModel)]="statusMap[e.student!.id]">
          <option value="Present">Present</option><option value="Absent">Absent</option><option value="Late">Late</option>
        </select>
      </div>
      <button class="btn mt-4" [disabled]="!sessionId" (click)="saveAttendance()">Save Attendance</button>
      <p *ngIf="msg()" class="text-emerald-300 text-sm mt-2">{{ msg() }}</p>
    </app-card>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:8px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}`]
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
      if (c.length) { this.classId = c[0].id; this.onClassChange(); }
    });
  }

  onClassChange(): void {
    const cls = this.classes().find(c => c.id === this.classId) || null;
    this.selectedClass.set(cls);
    this.statusMap = {};
    cls?.enrolments?.forEach(e => { if (e.student) this.statusMap[e.student.id] = 'Present'; });
  }

  createSession(): void {
    this.madrassah.createSession(this.classId, this.sessionDate).subscribe(s => {
      this.sessionId = s.id;
      this.msg.set('Session created. Mark attendance below.');
    });
  }

  saveAttendance(): void {
    const records = Object.entries(this.statusMap).map(([studentId, status]) => ({
      studentId: +studentId, status
    }));
    this.madrassah.recordAttendance(this.sessionId, records).subscribe(() => this.msg.set('Attendance saved.'));
  }
}
