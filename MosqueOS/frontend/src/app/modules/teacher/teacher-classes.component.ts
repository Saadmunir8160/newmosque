import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../../core/services/teacher.service';
import { MadrassahClass } from '../../core/services/madrassah.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-teacher-classes',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Teacher" title="My Classes" subtitle="Classes assigned to you" />

    <div class="toolbar">
      <input class="input" placeholder="Search classes…" [(ngModel)]="search" (ngModelChange)="load()">
    </div>

    <app-card *ngFor="let c of classes()" class="block mb-4">
      <h4 class="text-white font-bold text-lg">{{ c.name }}</h4>
      <p class="text-mos-muted text-sm mb-4">{{ c.schedule || 'No schedule set' }}</p>
      <p class="text-mos-muted text-xs mb-2 uppercase tracking-wide">Students ({{ c.enrolments?.length || 0 }})</p>
      <ul class="space-y-1">
        <li *ngFor="let e of c.enrolments" class="text-mos-text text-sm">
          • {{ e.student?.name }} <span class="text-mos-primary">({{ e.status }})</span>
        </li>
      </ul>
      <p *ngIf="!c.enrolments?.length" class="text-mos-muted text-sm">No students enrolled.</p>
    </app-card>
    <p *ngIf="!classes().length" class="empty">No classes assigned to you yet.</p>
  `,
  styles: [`
    .toolbar { margin-bottom: 1rem; }
    .input { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 10px; color: #fff; width: 100%; max-width: 320px; }
    .empty { color: #6ee7b7; font-size: 0.875rem; }
  `]
})
export class TeacherClassesComponent implements OnInit {
  private teacher = inject(TeacherService);
  classes = signal<MadrassahClass[]>([]);
  search = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.teacher.getClasses(this.search).subscribe(c => this.classes.set(c));
  }
}
