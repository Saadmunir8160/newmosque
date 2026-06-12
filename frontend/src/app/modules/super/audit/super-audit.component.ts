import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatformService, AuditLogEntry } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';

@Component({
  selector: 'app-super-audit',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Super Admin" title="Audit Logs" subtitle="Platform actions and prayer time changes" />
    <app-card *ngFor="let log of logs()" class="block mb-3">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
        <div class="min-w-0">
          <span class="text-sm bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded font-bold">{{ log.action }}</span>
          <p class="text-white text-base mt-2 break-anywhere">{{ log.description }}</p>
          <p class="text-emerald-500 text-sm mt-1 break-anywhere">Actor: {{ log.actorId }} · {{ log.targetType }} #{{ log.targetId }}</p>
        </div>
        <p class="text-emerald-400 text-sm shrink-0">{{ log.createdAt | date:'short' }}</p>
      </div>
    </app-card>
    <p *ngIf="!logs().length" class="text-emerald-300">No audit logs yet.</p>
  `
})
export class SuperAuditComponent implements OnInit {
  private platform = inject(PlatformService);
  logs = signal<AuditLogEntry[]>([]);
  ngOnInit(): void { this.platform.getAuditLogs().subscribe(l => this.logs.set(l)); }
}
