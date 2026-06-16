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

    <p *ngIf="msg()" class="toast" [class.toast--err]="msgErr()">{{ msg() }}</p>

    <section *ngIf="plan() as p; else noPlan" class="plan-card">
      <div class="plan-card__head">
        <span class="plan-card__label">Today's para</span>
        <h3 class="plan-card__para">Para {{ p.todaysPara }} — {{ paraName(p.todaysPara) }}</h3>
      </div>

      <div class="plan-card__progress">
        <div class="plan-card__bar">
          <div class="plan-card__fill" [style.width.%]="(p.completedParas / p.totalParas) * 100"></div>
        </div>
        <p class="plan-card__stats">{{ p.completedParas }} / {{ p.totalParas }} paras complete</p>
      </div>

      <button type="button" class="btn-gold" [disabled]="busy() || p.todayCompleted"
        (click)="complete(p.todaysPara)">
        {{ completeButtonLabel(p) }}
      </button>
    </section>

    <ng-template #noPlan>
      <section class="plan-card plan-card--empty">
        <p class="plan-card__empty-text">No active 30-day plan yet. Start today and read one para daily.</p>
        <button type="button" class="btn-gold" [disabled]="busy()" (click)="start()">
          {{ busy() ? 'Starting...' : 'Start 30-day plan' }}
        </button>
      </section>
    </ng-template>
  `,
  styles: [`
    .toast { margin-bottom: 0.75rem; font-size: 0.8125rem; color: #6ee7b7; }
    .toast--err { color: #fecaca; }
    .plan-card {
      padding: 1.25rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.95), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.3); border-radius: 0.75rem;
    }
    .plan-card--empty { text-align: center; }
    .plan-card__label { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #fcd34d; }
    .plan-card__para { margin: 0.35rem 0 0; font-size: 1.125rem; font-weight: 700; color: #fff; }
    .plan-card__progress { margin: 1.25rem 0; }
    .plan-card__bar { height: 0.5rem; background: rgba(0,0,0,0.35); border-radius: 9999px; overflow: hidden; }
    .plan-card__fill { height: 100%; background: linear-gradient(90deg, #d97706, #fcd34d); border-radius: 9999px; transition: width 0.35s ease; }
    .plan-card__stats { margin: 0.5rem 0 0; font-size: 0.8125rem; color: rgba(167,243,208,0.85); }
    .plan-card__empty-text { margin: 0 0 1rem; color: rgba(167,243,208,0.8); font-size: 0.875rem; }
    .btn-gold {
      width: 100%; font-size: 0.875rem; font-weight: 700; color: #022c22;
      background: linear-gradient(180deg, #fcd34d, #D4AF37); border: none;
      border-radius: 0.5rem; padding: 0.65rem 1rem; cursor: pointer;
    }
    .btn-gold:disabled { opacity: 0.55; cursor: not-allowed; }
  `]
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
    if (p.todayCompleted) return 'Done for today';
    if (this.busy()) return 'Saving...';
    return 'Mark today para done';
  }

  load(): void {
    this.quran.getMyPlan().subscribe({
      next: p => { this.plan.set(p); this.msg.set(''); },
      error: () => this.plan.set(null),
    });
  }

  start(): void {
    this.busy.set(true);
    this.msg.set('');
    this.quran.startPlan().subscribe({
      next: () => { this.busy.set(false); this.msgErr.set(false); this.msg.set('30-day plan started — bismillah!'); this.load(); },
      error: () => { this.busy.set(false); this.showErr('Could not start plan. Log in and try again.'); },
    });
  }

  complete(para: number): void {
    this.busy.set(true);
    this.msg.set('');
    this.quran.completePara(para).subscribe({
      next: () => { this.busy.set(false); this.msgErr.set(false); this.msg.set(`Para ${para} marked complete.`); this.load(); },
      error: () => { this.busy.set(false); this.showErr('Could not save progress.'); },
    });
  }

  private showErr(text: string): void {
    this.msgErr.set(true);
    this.msg.set(text);
  }
}
