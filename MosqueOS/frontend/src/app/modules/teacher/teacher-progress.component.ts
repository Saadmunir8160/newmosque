import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService, ProgressType, StudentProgressRecord, ProgressNote } from '../../core/services/teacher.service';
import { MadrassahClass, Student } from '../../core/services/madrassah.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-teacher-progress',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Teacher" title="Student Progress"
      subtitle="Quran progress, memorization, exam results, and teacher notes" />

    <app-card class="block mb-4">
      <div class="grid md:grid-cols-2 gap-2 mb-2">
        <select class="input" [(ngModel)]="classId" (ngModelChange)="onClassChange()">
          <option [ngValue]="0">Select class</option>
          <option *ngFor="let c of classes()" [ngValue]="c.id">{{ c.name }}</option>
        </select>
        <select class="input" [(ngModel)]="studentId" (ngModelChange)="loadHistory()">
          <option [ngValue]="0">Select student</option>
          <option *ngFor="let s of students()" [ngValue]="s.id">{{ s.name }}</option>
        </select>
      </div>

      <div class="tabs">
        <button *ngFor="let t of progressTypes" type="button" class="tab" [class.active]="activeType === t"
          (click)="activeType = t">{{ t }}</button>
      </div>

      <div class="grid md:grid-cols-2 gap-2 mt-3">
        <input class="input" [(ngModel)]="form.title" placeholder="Title (e.g. Surah al-Fil)">
        <input *ngIf="activeType === 'Exam'" class="input" type="number" [(ngModel)]="form.score" placeholder="Score %" min="0" max="100">
        <input *ngIf="activeType !== 'TeacherNote'" class="input md:col-span-2" [(ngModel)]="form.surahOrTopic" placeholder="Surah or topic">
        <textarea class="input md:col-span-2" rows="3" [(ngModel)]="form.detail" placeholder="Details or teacher note…"></textarea>
      </div>
      <button class="btn mt-3" (click)="save()">Save {{ activeType }} Record</button>
      <p *ngIf="msg()" class="msg">{{ msg() }}</p>
    </app-card>

    <app-card *ngIf="records().length" class="block mb-4">
      <h3 class="section">Progress history</h3>
      <div *ngFor="let r of records()" class="hist-row">
        <span class="type">{{ r.progressType }}</span>
        <div>
          <p class="title">{{ r.title }} <span *ngIf="r.score != null" class="score">{{ r.score }}%</span></p>
          <p class="meta" *ngIf="r.surahOrTopic">{{ r.surahOrTopic }}</p>
          <p class="detail" *ngIf="r.detail">{{ r.detail }}</p>
        </div>
      </div>
    </app-card>

    <app-card *ngIf="notes().length">
      <h3 class="section">Teacher notes</h3>
      <div *ngFor="let n of notes()" class="note">{{ n.note }} <span class="date">{{ n.createdAt | date:'mediumDate' }}</span></div>
    </app-card>
  `,
  styles: [`
    .input { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }
    .tabs { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .tab { background: transparent; border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; padding: 0.35rem 0.65rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer; }
    .tab.active { background: #F8FAFC; color: #fff; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; }
    .msg { margin-top: 0.5rem; color: #6ee7b7; font-size: 0.8125rem; }
    .section { margin: 0 0 0.75rem; color: #fcd34d; font-size: 0.875rem; font-weight: 600; }
    .hist-row { display: flex; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .type { font-size: 0.625rem; text-transform: uppercase; color: #fbbf24; font-weight: 700; padding-top: 0.2rem; }
    .title { margin: 0; color: #fff; font-weight: 600; font-size: 0.875rem; }
    .score { color: #fbbf24; margin-left: 0.5rem; }
    .meta, .detail { margin: 0.125rem 0 0; color: #a7f3d0; font-size: 0.8125rem; }
    .note { color: #d1fae5; font-size: 0.875rem; padding: 0.35rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .date { color: #6ee7b7; font-size: 0.75rem; margin-left: 0.5rem; }
  `]
})
export class TeacherProgressComponent implements OnInit {
  private teacher = inject(TeacherService);
  classes = signal<MadrassahClass[]>([]);
  students = signal<Student[]>([]);
  records = signal<StudentProgressRecord[]>([]);
  notes = signal<ProgressNote[]>([]);
  classId = 0;
  studentId = 0;
  activeType: ProgressType = 'Quran';
  progressTypes: ProgressType[] = ['Quran', 'Memorization', 'Exam', 'TeacherNote'];
  form = { title: '', detail: '', surahOrTopic: '', score: undefined as number | undefined };
  msg = signal('');

  ngOnInit(): void {
    this.teacher.getClasses().subscribe(c => this.classes.set(c));
  }

  onClassChange(): void {
    if (!this.classId) { this.students.set([]); return; }
    this.teacher.getStudents(this.classId).subscribe(s => {
      this.students.set(s);
      this.studentId = 0;
      this.records.set([]);
      this.notes.set([]);
    });
  }

  loadHistory(): void {
    if (!this.classId || !this.studentId) return;
    this.teacher.getProgress(this.studentId, this.classId).subscribe(r => {
      this.records.set(r.records);
      this.notes.set(r.notes);
    });
  }

  save(): void {
    if (!this.classId || !this.studentId || !this.form.title.trim()) {
      this.msg.set('Select class, student, and enter a title.');
      return;
    }
    this.teacher.addProgress(this.studentId, {
      classId: this.classId,
      progressType: this.activeType,
      title: this.form.title.trim(),
      detail: this.form.detail.trim() || undefined,
      surahOrTopic: this.form.surahOrTopic.trim() || undefined,
      score: this.activeType === 'Exam' ? this.form.score : undefined,
    }).subscribe({
      next: () => {
        this.msg.set('Progress saved.');
        this.form = { title: '', detail: '', surahOrTopic: '', score: undefined };
        this.loadHistory();
      },
      error: () => this.msg.set('Could not save progress.'),
    });
  }
}
