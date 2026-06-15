import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MadrassahClass, MadrassahService } from '../../core/services/madrassah.service';

@Component({
  selector: 'app-teacher-class-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reports-page">
      <header>
        <p class="badge">Teacher</p>
        <h1 class="title">Class reports</h1>
        <p class="sub">Attendance summaries for your classes.</p>
      </header>

      <section class="card" *ngFor="let r of reports()">
        <h3>{{ r.name }}</h3>
        <p class="meta">Students: {{ r.total }}</p>
        <p class="meta">Present: {{ r.present }} | Absent: {{ r.absent }} | Late: {{ r.late }}</p>
        <p class="rate">Attendance rate: {{ r.rate }}%</p>
      </section>
    </div>
  `,
  styles: [`
    .reports-page { display: flex; flex-direction: column; gap: 1rem; }
    .badge { margin: 0; font-size: 0.7rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; }
    .title { margin: 0.25rem 0 0; color: #fff; font-size: 1.5rem; }
    .sub { margin: 0.25rem 0 0; color: #6ee7b7; font-size: 0.85rem; }
    .card { background: #064e3b; border: 1px solid #065f46; border-radius: 0.75rem; padding: 1rem; }
    h3 { margin: 0; color: #fff; }
    .meta { margin: 0.35rem 0 0; color: #d1fae5; font-size: 0.84rem; }
    .rate { margin: 0.55rem 0 0; color: #fbbf24; font-weight: 700; }
  `]
})
export class TeacherClassReportsComponent implements OnInit {
  private madrassah = inject(MadrassahService);
  classes = signal<MadrassahClass[]>([]);

  reports = computed(() => this.classes().map(c => {
    const enrol = c.enrolments ?? [];
    const total = enrol.length;
    const present = enrol.filter(e => e.status === 'Present').length;
    const absent = enrol.filter(e => e.status === 'Absent').length;
    const late = enrol.filter(e => e.status === 'Late').length;
    const rate = total ? Math.round((present / total) * 100) : 0;
    return { name: c.name, total, present, absent, late, rate };
  }));

  ngOnInit(): void {
    this.madrassah.getClasses().subscribe(c => this.classes.set(c));
  }
}
