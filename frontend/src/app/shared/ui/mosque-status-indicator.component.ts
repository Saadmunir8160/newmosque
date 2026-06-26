import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Issue 3 — traffic-light mosque status indicator (Unclaimed / pending / Active). */
type IndicatorKind = 'UNCLAIMED' | 'CLAIMED' | 'ACTIVE' | 'OTHER';

@Component({
  selector: 'app-mosque-status-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-indicator" [class.status-indicator--sm]="compact" [ngClass]="statusClass">
      <span class="status-dot"></span>
      {{ statusLabel }}
    </span>
  `,
  styles: [`
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.2;
      white-space: nowrap;
    }
    .status-indicator--sm {
      font-size: 10px;
      padding: 2px 8px;
      gap: 5px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .status-indicator--sm .status-dot {
      width: 6px;
      height: 6px;
    }
    .status-unclaimed { background: #fef2f2; color: #991b1b; border: 1px solid rgba(220, 38, 38, 0.2); }
    .status-unclaimed .status-dot { background: #dc2626; }
    .status-claimed { background: #fffbeb; color: #92400e; border: 1px solid rgba(217, 119, 6, 0.25); }
    .status-claimed .status-dot { background: #d97706; }
    .status-active { background: #f0fdf4; color: #166534; border: 1px solid rgba(22, 163, 74, 0.2); }
    .status-active .status-dot { background: #16a34a; }
    .status-other { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
    .status-other .status-dot { background: #94a3b8; }
  `],
})
export class MosqueStatusIndicatorComponent {
  @Input() status = '';
  @Input() compact = false;

  private kind(): IndicatorKind {
    switch (this.status) {
      case 'Unclaimed':
        return 'UNCLAIMED';
      case 'Claimed':
      case 'ClaimPending':
      case 'PendingReview':
        return 'CLAIMED';
      case 'Active':
        return 'ACTIVE';
      default:
        return 'OTHER';
    }
  }

  get statusClass(): Record<string, boolean> {
    const k = this.kind();
    return {
      'status-unclaimed': k === 'UNCLAIMED',
      'status-claimed': k === 'CLAIMED',
      'status-active': k === 'ACTIVE',
      'status-other': k === 'OTHER',
    };
  }

  get statusLabel(): string {
    const labels: Record<IndicatorKind, string> = {
      UNCLAIMED: 'Unclaimed — needs attention',
      CLAIMED: 'Pending verification',
      ACTIVE: 'Active',
      OTHER: this.fallbackLabel(),
    };
    return labels[this.kind()];
  }

  private fallbackLabel(): string {
    return this.status
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, c => c.toUpperCase()) || 'Unknown';
  }
}
