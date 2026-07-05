import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Mosque } from '../../../core/models';
import { AuthService } from '../../../core/auth/auth.service';
import { MosqueClaimsService, SubmitMosqueClaimResponse } from '../../../core/services/mosque-claims.service';
import {
  CLAIM_ROLES,
  readClaimApiError,
  validateClaimForm,
} from '../../../core/utils/mosque-claim.util';

@Component({
  selector: 'app-mosque-claim-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mosque-claim-drawer.component.html',
  styleUrls: ['./mosque-claim-drawer.component.css'],
})
export class MosqueClaimDrawerComponent implements OnChanges {
  private auth = inject(AuthService);
  private claims = inject(MosqueClaimsService);

  @Input({ required: true }) open = false;
  @Input({ required: true }) mosque!: Mosque;
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<SubmitMosqueClaimResponse>();

  readonly roles = CLAIM_ROLES;

  fullName = '';
  email = '';
  phone = '';
  role = '';
  notes = '';
  proofFile: File | null = null;
  proofFileName = signal('');
  uploadPercent = signal(0);

  fieldErrors = signal<Record<string, string>>({});
  formError = signal('');
  submitting = signal(false);
  success = signal(false);
  claimReference = signal('');
  toast = signal('');
  toastOk = signal(true);
  blockReason = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      this.reset();
      this.prefillUser();
      this.checkPreconditions();
    }
  }

  cancel(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  clearField(field: string): void {
    const next = { ...this.fieldErrors() };
    delete next[field];
    this.fieldErrors.set(next);
    this.formError.set('');
  }

  onProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.proofFile = file;
    this.proofFileName.set(file?.name ?? '');
    this.clearField('proof');
  }

  removeProof(): void {
    this.proofFile = null;
    this.proofFileName.set('');
    this.uploadPercent.set(0);
  }

  submit(): void {
    if (this.submitting() || this.blockReason()) return;

    const errors = validateClaimForm({
      phone: this.phone,
      role: this.role,
      proofFile: this.proofFile,
    });
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) return;

    const m = this.mosque;
    if (!m?.id) {
      this.formError.set('Mosque not found.');
      return;
    }

    const form = new FormData();
    form.append('mosqueId', String(m.id));
    form.append('fullName', this.fullName.trim());
    form.append('email', this.email.trim());
    form.append('phone', this.phone.trim());
    form.append('role', this.role);
    if (this.notes.trim()) form.append('notes', this.notes.trim());
    if (this.proofFile) form.append('proofDocument', this.proofFile, this.proofFile.name);

    this.submitting.set(true);
    this.formError.set('');
    this.uploadPercent.set(0);

    this.claims.submitClaim(form).subscribe({
      next: (evt) => {
        if (evt.event === 'progress') {
          this.uploadPercent.set(evt.percent ?? 0);
          return;
        }
        if (evt.result) {
          this.submitting.set(false);
          this.success.set(true);
          this.claimReference.set(evt.result.claimReference);
          this.submitted.emit(evt.result);
          this.showToast('Claim submitted successfully.', true);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err instanceof HttpErrorResponse
          ? readClaimApiError(err)
          : 'Unable to submit your claim. Please try again.';
        this.formError.set(msg);
        this.showToast(msg, false);
      },
    });
  }

  private reset(): void {
    this.phone = '';
    this.role = '';
    this.notes = '';
    this.proofFile = null;
    this.proofFileName.set('');
    this.uploadPercent.set(0);
    this.fieldErrors.set({});
    this.formError.set('');
    this.submitting.set(false);
    this.success.set(false);
    this.claimReference.set('');
    this.blockReason.set('');
    this.toast.set('');
  }

  private prefillUser(): void {
    const user = this.auth.user();
    this.fullName = user?.fullName?.trim() || '';
    this.email = user?.email?.trim() || '';
  }

  private checkPreconditions(): void {
    if (!this.auth.isAuthenticated()) {
      this.blockReason.set('You must be logged in to submit a claim.');
      return;
    }
    if (this.auth.user()?.emailConfirmed === false) {
      this.blockReason.set('Please verify your email before submitting a claim.');
      return;
    }
    if (this.mosque?.status !== 'Unclaimed') {
      if (this.mosque?.status === 'ClaimPending') {
        this.blockReason.set('A claim for this mosque is already under review.');
      } else {
        this.blockReason.set('This mosque has already been claimed.');
      }
      return;
    }

    if (!this.mosque?.id) {
      this.blockReason.set('Mosque not found.');
      return;
    }

    this.claims.getMyClaims().subscribe({
      next: (items) => {
        const pending = items.find(
          c => c.mosqueId === this.mosque.id && c.status.toLowerCase() === 'pending',
        );
        if (pending) {
          this.blockReason.set('A claim for this mosque is already under review.');
        }
      },
      error: () => { /* allow submit; server validates */ },
    });
  }

  private showToast(msg: string, ok: boolean): void {
    this.toast.set(msg);
    this.toastOk.set(ok);
  }
}
