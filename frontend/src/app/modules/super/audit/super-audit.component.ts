import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatformService, AuditLogEntry } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';

const ACTION_LABELS: Record<string, string> = {
  ASSIGN_ROLE: 'Role assigned',
  REMOVE_ROLE: 'Role removed',
  APPROVE_CLAIM: 'Claim approved',
  REJECT_CLAIM: 'Claim rejected',
  SEED_MOSQUE: 'Mosque listed',
  UPDATE_MOSQUE: 'Listing updated',
  BULK_MOSQUE_STATUS: 'Bulk status change',
  ASSIGN_MOSQUE_ADMIN: 'Admin assigned',
  PRAYER_TIME_CHANGE: 'Prayer time updated',
};

@Component({
  selector: 'app-super-audit',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header
      badge="Super Admin"
      title="Audit trail"
      subtitle="A chronological record of platform actions and prayer time changes." />

    <div *ngIf="!logs().length" class="admin-empty">
      <p class="admin-empty-title">No activity yet</p>
      <p class="admin-empty-desc">Actions such as role changes, claim decisions, and mosque listings will appear here.</p>
    </div>

    <app-card *ngFor="let log of logs()" class="block mb-2" [interactive]="true">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
        <div class="min-w-0">
          <span class="text-xs font-bold uppercase tracking-wide bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded">
            {{ actionLabel(log.action) }}
          </span>
          <p class="text-white text-sm mt-2 mb-0 break-anywhere leading-relaxed">{{ log.description }}</p>
          <p class="text-xs text-emerald-600 mt-2 m-0">
            {{ log.targetType || 'System' }}
            <span *ngIf="log.targetId"> · #{{ log.targetId }}</span>
          </p>
        </div>
        <time class="text-xs text-emerald-400 shrink-0">{{ log.createdAt | date:'medium' }}</time>
      </div>
    </app-card>
  `
})
export class SuperAuditComponent implements OnInit {
  private platform = inject(PlatformService);
  logs = signal<AuditLogEntry[]>([]);

  ngOnInit(): void {
    this.platform.getAuditLogs(50).subscribe(l => this.logs.set(l));
  }

  actionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action.replace(/_/g, ' ').toLowerCase();
  }
}
