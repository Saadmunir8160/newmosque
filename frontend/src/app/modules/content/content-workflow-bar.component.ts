import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentEditorService, ContentPublishStatus } from '../../core/services/content-editor.service';

@Component({
  selector: 'app-content-workflow-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="workflow-bar">
      <span class="status-pill" [attr.data-status]="currentStatus()">{{ statusLabel(currentStatus()) }}</span>
      <div class="workflow-actions" *ngIf="actions().length">
        <button type="button" *ngFor="let a of actions()" class="wf-btn"
          [class.wf-btn--primary]="a.to === 'Approved' || a.to === 'Published'"
          [disabled]="busy()" (click)="run(a.to)">{{ a.label }}</button>
      </div>
      <p *ngIf="msg()" class="wf-msg" [class.wf-msg--err]="!msgOk()">{{ msg() }}</p>
    </div>
  `,
  styles: [`
    .workflow-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .status-pill {
      font-size: 0.5625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 3px 8px;
      border-radius: 9999px;
      border: 1px solid var(--mos-border, #E2E8F0);
      color: var(--mos-text-secondary, #64748B);
      background: var(--mos-bg, #F8FAF9);
    }
    .status-pill[data-status="Draft"] { color: #64748B; background: #F8FAFC; border-color: #E2E8F0; }
    .status-pill[data-status="InReview"] { color: #B45309; background: #FFFBEB; border-color: #FDE68A; }
    .status-pill[data-status="Approved"] { color: #047857; background: #ECFDF5; border-color: #A7F3D0; }
    .status-pill[data-status="Published"] { color: #047857; background: #DCFCE7; border-color: #86EFAC; }
    .status-pill[data-status="Unpublished"] { color: #57534E; background: #F5F5F4; border-color: #E7E5E4; }

    .workflow-actions { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .wf-btn {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 5px 10px;
      border-radius: 8px;
      border: 1px solid var(--mos-border, #E2E8F0);
      background: var(--mos-surface, #fff);
      color: var(--mos-primary, #0F4C3A);
      cursor: pointer;
      transition: background 0.18s, border-color 0.18s;
    }
    .wf-btn:hover:not(:disabled) {
      background: rgba(15, 76, 58, 0.06);
      border-color: rgba(15, 76, 58, 0.28);
    }
    .wf-btn--primary {
      color: #fff;
      background: linear-gradient(180deg, #1D6B57, #0F4C3A);
      border-color: #0F4C3A;
    }
    .wf-btn--primary:hover:not(:disabled) {
      background: linear-gradient(180deg, #0F4C3A, #08362A);
    }
    .wf-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .wf-msg { margin: 0; width: 100%; font-size: 0.6875rem; font-weight: 600; color: #047857; }
    .wf-msg--err { color: #B91C1C; }
  `]
})
export class ContentWorkflowBarComponent {
  private editor = inject(ContentEditorService);

  @Input({ required: true }) entityType!: string;
  @Input({ required: true }) entityId!: number;
  @Input() status: ContentPublishStatus | string = 'Draft';
  @Input() localMode = false;
  @Output() changed = new EventEmitter<void>();
  @Output() localTransition = new EventEmitter<ContentPublishStatus>();

  busy = signal(false);
  msg = signal('');
  msgOk = signal(true);

  statusLabel(s: ContentPublishStatus | string): string {
    return s === 'InReview' ? 'In Review' : String(s);
  }

  currentStatus(): ContentPublishStatus {
    return (this.status || 'Draft') as ContentPublishStatus;
  }

  actions(): { label: string; to: ContentPublishStatus }[] {
    switch (this.currentStatus()) {
      case 'Draft': return [{ label: 'Submit for review', to: 'InReview' }];
      case 'InReview': return [
        { label: 'Approve', to: 'Approved' },
        { label: 'Send back', to: 'Draft' },
      ];
      case 'Approved': return [{ label: 'Publish', to: 'Published' }];
      case 'Published': return [{ label: 'Unpublish', to: 'Unpublished' }];
      case 'Unpublished': return [{ label: 'Revise', to: 'Draft' }];
      default: return [];
    }
  }

  run(to: ContentPublishStatus): void {
    if (this.localMode) {
      this.localTransition.emit(to);
      this.msgOk.set(true);
      this.msg.set(`Moved to ${this.statusLabel(to)}.`);
      return;
    }

    this.busy.set(true);
    this.msg.set('');
    this.editor.transition(this.entityType, this.entityId, to).subscribe({
      next: () => {
        this.busy.set(false);
        this.msgOk.set(true);
        this.msg.set(`Moved to ${this.statusLabel(to)}.`);
        this.changed.emit();
      },
      error: () => {
        this.busy.set(false);
        this.msgOk.set(false);
        this.msg.set('Workflow action failed.');
      },
    });
  }
}
