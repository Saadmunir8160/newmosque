import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { AuthService } from '../../../core/auth/auth.service';

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  actionLabel: string;
  actionRoute: string;
  icon: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'claim',
    label: 'Submit a Claim',
    description: 'Find your mosque in the directory and submit an ownership claim.',
    actionLabel: 'Browse mosque listings',
    actionRoute: '/dashboard/owner/mosque-listings',
    icon: '🕌'
  },
  {
    id: 'approved',
    label: 'Claim Approved',
    description: 'Wait for Super Admin to review and approve your claim.',
    actionLabel: 'View my claims',
    actionRoute: '/dashboard/owner/verification',
    icon: '✅'
  },
  {
    id: 'profile',
    label: 'Complete Profile',
    description: 'Fill out your mosque profile to at least 60% completeness.',
    actionLabel: 'Edit mosque profile',
    actionRoute: '/dashboard/owner/my-mosque/edit-profile',
    icon: '📝'
  },
  {
    id: 'modules',
    label: 'Configure Modules',
    description: 'Enable the features you want available for your mosque.',
    actionLabel: 'Configure modules',
    actionRoute: '/dashboard/owner/modules',
    icon: '⚙️'
  },
  {
    id: 'live',
    label: 'Go Live',
    description: 'Submit your mosque for final review and go live on MosqueOS.',
    actionLabel: 'Submit for review',
    actionRoute: '/dashboard/owner/my-mosque',
    icon: '🚀'
  }
];

@Component({
  selector: 'app-owner-onboarding',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="ob-header">
      <h1 class="ob-title">Getting Started</h1>
      <p class="ob-sub">Follow these steps to get your mosque live on MosqueOS.</p>
    </div>

    <div class="ob-progress">
      <div class="ob-progress__bar">
        <div class="ob-progress__fill" [style.width.%]="progressPct()"></div>
      </div>
      <span class="ob-progress__label">{{ currentStep() + 1 }} / {{ steps.length }} completed</span>
    </div>

    <div class="ob-steps">
      <div
        *ngFor="let step of steps; let i = index"
        class="ob-step"
        [class.ob-step--done]="i < currentStep()"
        [class.ob-step--active]="i === currentStep()"
        [class.ob-step--pending]="i > currentStep()">
        <div class="ob-step__icon">
          <span *ngIf="i < currentStep()">✓</span>
          <span *ngIf="i >= currentStep()">{{ step.icon }}</span>
        </div>
        <div class="ob-step__body">
          <h2 class="ob-step__label">{{ step.label }}</h2>
          <p class="ob-step__desc">{{ step.description }}</p>
          <a
            *ngIf="i === currentStep()"
            [routerLink]="step.actionRoute"
            class="ob-btn">
            {{ step.actionLabel }}
          </a>
        </div>
        <div class="ob-step__status">
          <span *ngIf="i < currentStep()" class="ob-badge ob-badge--done">Done</span>
          <span *ngIf="i === currentStep()" class="ob-badge ob-badge--active">Current</span>
          <span *ngIf="i > currentStep()" class="ob-badge ob-badge--pending">Pending</span>
        </div>
      </div>
    </div>

    <div *ngIf="currentStep() === steps.length" class="ob-complete">
      <span class="ob-complete__icon">🎉</span>
      <h2>Your mosque is live!</h2>
      <p>All steps completed. Members can now find your mosque on MosqueOS.</p>
      <a routerLink="/dashboard/owner" class="ob-btn">Go to dashboard</a>
    </div>
  `,
  styles: [`
    :host { display: block; max-width: 680px; margin: 0 auto; }
    .ob-header { margin-bottom: 1.5rem; }
    .ob-title { margin: 0 0 0.25rem; font-size: 1.5rem; font-weight: 900; color: var(--mos-text-primary); }
    .ob-sub { margin: 0; font-size: 0.875rem; color: var(--mos-text-secondary); }
    .ob-progress { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
    .ob-progress__bar { flex: 1; height: 8px; border-radius: 999px; background: var(--mos-border); overflow: hidden; }
    .ob-progress__fill { height: 100%; background: var(--mos-primary); border-radius: 999px; transition: width 0.4s ease; }
    .ob-progress__label { font-size: 0.75rem; font-weight: 700; color: var(--mos-text-secondary); white-space: nowrap; }
    .ob-steps { display: grid; gap: 0.75rem; }
    .ob-step {
      display: flex; align-items: flex-start; gap: 1rem;
      padding: 1rem 1.125rem; border-radius: 14px;
      border: 1.5px solid var(--mos-border); background: #fff;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .ob-step--active { border-color: var(--mos-primary); box-shadow: 0 0 0 3px var(--mos-primary-08); }
    .ob-step--done { opacity: 0.65; }
    .ob-step--pending { opacity: 0.5; }
    .ob-step__icon { font-size: 1.5rem; min-width: 2.25rem; text-align: center; margin-top: 0.1rem; }
    .ob-step__body { flex: 1; }
    .ob-step__label { margin: 0 0 0.25rem; font-size: 0.95rem; font-weight: 800; color: var(--mos-text-primary); }
    .ob-step__desc { margin: 0 0 0.75rem; font-size: 0.8125rem; color: var(--mos-text-secondary); line-height: 1.5; }
    .ob-btn {
      display: inline-flex; align-items: center;
      padding: 0.45rem 1rem; border-radius: 10px;
      background: var(--mos-primary); color: #fff;
      font-weight: 700; font-size: 0.8125rem; text-decoration: none;
    }
    .ob-btn:hover { opacity: 0.9; }
    .ob-step__status { margin-top: 0.1rem; }
    .ob-badge {
      font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.55rem;
      border-radius: 999px; white-space: nowrap;
    }
    .ob-badge--done { background: #d1fae5; color: #065f46; }
    .ob-badge--active { background: var(--mos-primary-08); color: var(--mos-primary); }
    .ob-badge--pending { background: var(--mos-surface); color: var(--mos-text-secondary); }
    .ob-complete {
      margin-top: 1.5rem; padding: 2rem; text-align: center;
      border-radius: 16px; border: 2px solid #d1fae5; background: #f0fdf4;
    }
    .ob-complete__icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
    .ob-complete h2 { margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 900; }
    .ob-complete p { margin: 0 0 1rem; font-size: 0.875rem; color: var(--mos-text-secondary); }
  `]
})
export class OwnerOnboardingComponent implements OnInit {
  private admin = inject(AdminService);
  private auth = inject(AuthService);

  readonly steps = STEPS;
  claimStatus = signal<string>('');
  mosqueStatus = signal<string>('');
  completeness = signal<number>(0);

  currentStep = computed(() => {
    // Step 0: no claim submitted
    if (!this.claimStatus()) return 0;
    // Step 1: claim pending
    if (this.claimStatus() === 'Pending') return 1;
    // Step 2: claim approved but profile incomplete
    if (this.claimStatus() === 'Approved' && this.completeness() < 60) return 2;
    // Step 3: profile complete but mosque not submitted
    if (['Claimed', 'Active'].includes(this.mosqueStatus()) && this.completeness() >= 60
        && !['PendingReview', 'Active'].includes(this.mosqueStatus())) return 3;
    // Step 4: submitted for review, not yet active
    if (this.mosqueStatus() === 'PendingReview') return 4;
    // All done
    if (this.mosqueStatus() === 'Active') return 5;
    return 2;
  });

  progressPct = computed(() => Math.round((this.currentStep() / this.steps.length) * 100));

  ngOnInit(): void {
    this.admin.getMyClaims().subscribe({
      next: (items: any[]) => {
        if (!items?.length) return;
        const latest = items[0];
        this.claimStatus.set(latest.reviewStatus ?? latest.status ?? '');
        this.mosqueStatus.set(latest.mosqueStatus ?? latest.status ?? '');
      }
    });
  }
}
