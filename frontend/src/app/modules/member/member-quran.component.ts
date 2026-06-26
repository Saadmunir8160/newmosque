import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuranService, QuranPlanView } from '../../core/services/quran.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

const PARA_NAMES = [
  'Alif Lam Meem', 'Sayaqool', 'Tilkal Rusul', 'Lan Tanaloo', 'Wal Muhsanaat',
  'La Yuhibbullah', 'Wa Idha Sami\'oo', 'Wa Law Annana', 'Qalal Malao', 'Wa A\'lamu',
  'Yatazeroon', 'Wa Maa Min Daaabbah', 'Wa Maa Ubarri\'u', 'Rubama', 'Subhanalladhi',
  'Qala Alam', 'Iqtaraba', 'Qad Aflaha', 'Wa Qalalladheena', 'A\'man Khalaq',
  'Utlu Maa Oohiya', 'Wa Man Yaqnut', 'Faman Azlam', 'Fa Man Khair', 'Elahukum',
  'Ha Meem', 'Qala Fama Khatbukum', 'Qad Sami\'a', 'Tabarakalladhi', 'Amma Yatasaa\'aloon',
];

@Component({
  selector: 'app-member-quran',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Member" title="Qur'an Plan"
      subtitle="30-day khatm — read 1 para per day and track your progress." />

    <p *ngIf="msg()" class="member-toast" [class.member-toast--err]="msgErr()">{{ msg() }}</p>

    <section *ngIf="plan() as p; else noPlan" class="member-card member-card--hero">
      <span class="member-tag">Today's para</span>
      <h3 class="member-title member-title--lg">Para {{ p.todaysPara }} — {{ paraName(p.todaysPara) }}</h3>

      <div class="member-progress">
        <div class="member-progress__bar">
          <div class="member-progress__fill" [style.width.%]="(p.completedParas / p.totalParas) * 100"></div>
        </div>
        <p class="member-progress__stats">{{ p.completedParas }} / {{ p.totalParas }} paras complete</p>
      </div>

      <button type="button" class="member-btn-primary member-btn-primary--block" [disabled]="busy() || p.todayCompleted"
        (click)="complete(p.todaysPara)">
        {{ completeButtonLabel(p) }}
      </button>
    </section>

    <ng-template #noPlan>
      <section class="member-card member-card--hero" style="text-align: center;">
        <p class="member-desc">No active 30-day plan yet. Start today and read one para daily.</p>
        <button type="button" class="member-btn-primary member-btn-primary--block" [disabled]="busy()" (click)="start()">
          {{ busy() ? 'Starting...' : 'Start 30-day plan' }}
        </button>
      </section>
    </ng-template>
  `,
})
export class MemberQuranComponent implements OnInit {
  private quran = inject(QuranService);
  plan = signal<QuranPlanView | null>(null);
  busy = signal(false);
  msg = signal('');
  msgErr = signal(false);

  ngOnInit(): void { this.load(); }

  paraName(n: number): string {
    return PARA_NAMES[n - 1] ?? `Para ${n}`;
  }

  completeButtonLabel(p: QuranPlanView): string {
    if (this.busy()) return 'Saving...';
    if (p.todayCompleted) return '✓ Completed today';
    return 'Mark para complete';
  }

  load(): void {
    this.quran.getMyPlan().subscribe({
      next: p => this.plan.set(p),
      error: () => this.plan.set(null),
    });
  }

  start(): void {
    this.busy.set(true);
    this.msg.set('');
    this.quran.startPlan().subscribe({
      next: () => {
        this.busy.set(false);
        this.msgErr.set(false);
        this.msg.set('30-day plan started — barakAllah feek.');
        this.load();
      },
      error: () => { this.busy.set(false); this.showErr('Could not start plan.'); },
    });
  }

  complete(para: number): void {
    this.busy.set(true);
    this.msg.set('');
    this.quran.completePara(para).subscribe({
      next: res => {
        this.busy.set(false);
        this.plan.update(p => p ? {
          ...p,
          completedParas: res.completedParas,
          totalParas: res.totalParas,
          todayCompleted: true,
        } : null);
        this.msgErr.set(false);
        this.msg.set('Para marked complete — jazakAllah khair.');
      },
      error: () => { this.busy.set(false); this.showErr('Could not save progress.'); },
    });
  }

  private showErr(text: string): void {
    this.msgErr.set(true);
    this.msg.set(text);
  }
}
