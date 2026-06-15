import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MadrassahClass, MadrassahService } from '../../core/services/madrassah.service';

@Component({
  selector: 'app-teacher-progress-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="notes-page">
      <header>
        <p class="notes-badge">Teacher</p>
        <h1 class="notes-title">Progress notes</h1>
      </header>

      <section class="card">
        <div class="form-grid">
          <select class="input" [(ngModel)]="classId" (ngModelChange)="onClassChange()">
            <option [ngValue]="0">Select class</option>
            <option *ngFor="let c of classes()" [ngValue]="c.id">{{ c.name }}</option>
          </select>
          <select class="input" [(ngModel)]="studentId">
            <option [ngValue]="0">Select student</option>
            <option *ngFor="let s of students()" [ngValue]="s.id">{{ s.name }}</option>
          </select>
        </div>
        <textarea class="input mt" rows="4" [(ngModel)]="noteText" placeholder="Write student progress note..."></textarea>
        <button class="btn mt" (click)="save()">Save note</button>
        <p *ngIf="msg()" class="msg">{{ msg() }}</p>
      </section>
    </div>
  `,
  styles: [`
    .notes-page { display: flex; flex-direction: column; gap: 1rem; }
    .notes-badge { margin: 0; font-size: 0.7rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; }
    .notes-title { margin: 0.25rem 0 0; color: #fff; font-size: 1.5rem; }
    .card { background: #064e3b; border: 1px solid #065f46; border-radius: 0.75rem; padding: 1rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .input { background: #022c22; border: 1px solid #065f46; color: #fff; border-radius: 0.5rem; padding: 0.6rem 0.75rem; width: 100%; }
    .btn { background: #f59e0b; color: #022c22; border: none; border-radius: 0.5rem; padding: 0.55rem 1rem; font-weight: 700; cursor: pointer; }
    .mt { margin-top: 0.65rem; }
    .msg { margin: 0.5rem 0 0; color: #6ee7b7; font-size: 0.82rem; }
  `]
})
export class TeacherProgressNotesComponent implements OnInit {
  private madrassah = inject(MadrassahService);
  classes = signal<MadrassahClass[]>([]);
  students = signal<{ id: number; name: string }[]>([]);
  classId = 0;
  studentId = 0;
  noteText = '';
  msg = signal('');

  ngOnInit(): void {
    this.madrassah.getClasses().subscribe(c => this.classes.set(c));
  }

  onClassChange(): void {
    const cls = this.classes().find(c => c.id === this.classId);
    this.students.set((cls?.enrolments ?? []).map(e => e.student));
    this.studentId = 0;
  }

  save(): void {
    if (!this.classId || !this.studentId || !this.noteText.trim()) {
      this.msg.set('Select class/student and write note.');
      return;
    }
    this.madrassah.addProgressNote(this.studentId, this.classId, this.noteText.trim()).subscribe({
      next: () => {
        this.msg.set('Progress note saved.');
        this.noteText = '';
      },
      error: () => this.msg.set('Could not save note.')
    });
  }
}
