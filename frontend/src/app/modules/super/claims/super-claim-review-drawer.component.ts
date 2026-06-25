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
import { PlatformClaimDetail, PlatformService } from '../../../core/services/platform.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-super-claim-review-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-claim-review-drawer.component.html',
  styleUrls: ['./super-claim-review-drawer.component.css'],
})
export class SuperClaimReviewDrawerComponent implements OnChanges {
  private platform = inject(PlatformService);

  @Input({ required: true }) open = false;
  @Input({ required: true }) claimId = 0;
  @Output() closed = new EventEmitter<void>();
  @Output() approved = new EventEmitter<void>();
  @Output() rejected = new EventEmitter<void>();

  detail = signal<PlatformClaimDetail | null>(null);
  loading = signal(false);
  acting = signal(false);
  error = signal('');

  showApproveConfirm = signal(false);
  showRejectDialog = signal(false);
  rejectReason = '';
  rejectError = signal('');

  private apiOrigin = environment.apiUrl.replace(/\/api\/v1\/?$/, '');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue && this.claimId > 0) {
      this.load();
    }
    if (changes['open']?.currentValue === false) {
      this.resetDialogs();
    }
  }

  close(): void {
    if (this.acting()) return;
    this.closed.emit();
  }

  documentUrl(path?: string | null): string | null {
    if (!path?.trim()) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${this.apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  primaryDocumentUrl(): string | null {
    const d = this.detail();
    if (!d) return null;
    const doc = d.documents?.[0]?.url ?? d.proofDocumentUrl;
    return this.documentUrl(doc);
  }

  openDocument(): void {
    const url = this.primaryDocumentUrl();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  openApproveConfirm(): void {
    this.showApproveConfirm.set(true);
  }

  cancelApprove(): void {
    this.showApproveConfirm.set(false);
  }

  confirmApprove(): void {
    if (!this.claimId || this.acting()) return;
    this.acting.set(true);
    this.error.set('');
    this.platform.approvePlatformClaim(this.claimId).subscribe({
      next: () => {
        this.acting.set(false);
        this.showApproveConfirm.set(false);
        this.approved.emit();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.error?.message ?? 'Approval failed. Please try again.');
      },
    });
  }

  openRejectDialog(): void {
    this.rejectReason = '';
    this.rejectError.set('');
    this.showRejectDialog.set(true);
  }

  cancelReject(): void {
    this.showRejectDialog.set(false);
  }

  confirmReject(): void {
    const reason = this.rejectReason.trim();
    if (!reason) {
      this.rejectError.set('Rejection reason is required.');
      return;
    }
    if (!this.claimId || this.acting()) return;
    this.acting.set(true);
    this.rejectError.set('');
    this.platform.rejectPlatformClaim(this.claimId, reason).subscribe({
      next: () => {
        this.acting.set(false);
        this.showRejectDialog.set(false);
        this.rejected.emit();
      },
      error: (err) => {
        this.acting.set(false);
        this.rejectError.set(err?.error?.message ?? 'Rejection failed. Please try again.');
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.detail.set(null);
    this.platform.getPlatformClaimDetail(this.claimId).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load claim details.');
        this.loading.set(false);
      },
    });
  }

  private resetDialogs(): void {
    this.showApproveConfirm.set(false);
    this.showRejectDialog.set(false);
    this.rejectReason = '';
    this.rejectError.set('');
  }
}
