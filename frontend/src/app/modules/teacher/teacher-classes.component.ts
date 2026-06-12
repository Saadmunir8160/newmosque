import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MadrassahService, MadrassahClass } from '../../core/services/madrassah.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-teacher-classes',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Teacher" title="My Classes" />
    <app-card *ngFor="let c of classes()" class="block mb-4">
      <h4 class="text-white font-bold text-lg">{{ c.name }}</h4>
      <p class="text-emerald-300 text-sm mb-4">{{ c.schedule }}</p>
      <ul class="space-y-1">
        <li *ngFor="let e of c.enrolments" class="text-emerald-100 text-sm">• {{ e.student?.name }} ({{ e.status }})</li>
      </ul>
    </app-card>
  `
})
export class TeacherClassesComponent implements OnInit {
  private madrassah = inject(MadrassahService);
  classes = signal<MadrassahClass[]>([]);
  ngOnInit(): void { this.madrassah.getClasses().subscribe(c => this.classes.set(c)); }
}
