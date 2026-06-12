import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuranService, QuranPlanView } from '../../core/services/quran.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-member-quran',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Member" title="Qur'an Plan" subtitle="30-day para reading (1 para/day)" />
    <app-card *ngIf="plan() as p; else noPlan">
      <p class="text-emerald-300">Today's para: <strong class="text-white">{{ p.todaysPara }}</strong></p>
      <div class="w-full bg-emerald-900 rounded-full h-3 my-4">
        <div class="bg-amber-400 h-3 rounded-full" [style.width.%]="(p.completedParas / p.totalParas) * 100"></div>
      </div>
      <p class="text-emerald-200">{{ p.completedParas }} / {{ p.totalParas }} paras complete</p>
      <button class="btn mt-4" (click)="complete(p.todaysPara)">Mark Today's Para Done</button>
    </app-card>
    <ng-template #noPlan>
      <app-card>
        <p class="text-emerald-200 mb-4">No active plan yet.</p>
        <button class="btn" (click)="start()">Start 30-Day Plan</button>
      </app-card>
    </ng-template>
  `,
  styles: [`.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:10px 20px;border-radius:8px;border:none;cursor:pointer}`]
})
export class MemberQuranComponent implements OnInit {
  private quran = inject(QuranService);
  plan = signal<QuranPlanView | null>(null);
  hasPlan = signal(true);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.quran.getMyPlan().subscribe({
      next: p => { this.plan.set(p); this.hasPlan.set(true); },
      error: () => { this.plan.set(null); this.hasPlan.set(false); }
    });
  }

  start(): void { this.quran.startPlan().subscribe(() => this.load()); }
  complete(para: number): void { this.quran.completePara(para).subscribe(() => this.load()); }
}
