import { Component, ElementRef, HostListener, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationApiService, UserNotificationItem } from '../../core/services/notification-api.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="nb" *ngIf="auth.isAuthenticated() && !auth.isGuest()" #root>
      <button type="button" class="nb-btn" #btn (click)="toggle()" [attr.aria-expanded]="open()" aria-label="Notifications">
        <span aria-hidden="true">🔔</span>
        <span *ngIf="unread() > 0" class="nb-badge">{{ unread() > 9 ? '9+' : unread() }}</span>
      </button>
      <div *ngIf="open()" class="nb-panel" role="dialog" aria-label="Notifications"
        [style.top.px]="panelTop()" [style.left.px]="panelLeft()">
        <header class="nb-panel__head">
          <strong>Notifications</strong>
          <button type="button" class="nb-link" (click)="markAll()" [disabled]="!unread()">Mark all read</button>
        </header>
        <p *ngIf="loading()" class="nb-muted">Loading…</p>
        <ul *ngIf="!loading()" class="nb-list">
          <li *ngFor="let n of items()" [class.nb-item--unread]="!n.isRead">
            <a *ngIf="n.route; else plain" [routerLink]="n.route" (click)="openItem(n)">
              <strong>{{ n.title }}</strong>
              <span>{{ n.message }}</span>
              <time>{{ n.createdAt | date:'short' }}</time>
            </a>
            <ng-template #plain>
              <button type="button" class="nb-plain" (click)="openItem(n)">
                <strong>{{ n.title }}</strong>
                <span>{{ n.message }}</span>
                <time>{{ n.createdAt | date:'short' }}</time>
              </button>
            </ng-template>
          </li>
          <li *ngIf="!items().length" class="nb-muted">No notifications yet.</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .nb { position: relative; display: inline-flex; }
    .nb-btn {
      position: relative; width: 2.25rem; height: 2.25rem; border-radius: 8px;
      border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: 1rem;
    }
    .nb-badge {
      position: absolute; top: -0.2rem; right: -0.2rem; min-width: 1.05rem; height: 1.05rem;
      border-radius: 999px; background: #dc2626; color: #fff; font-size: 0.62rem; font-weight: 800;
      display: inline-flex; align-items: center; justify-content: center; padding: 0 0.2rem;
    }
    .nb-panel {
      position: fixed;
      width: min(92vw, 22rem);
      max-height: min(70vh, 26rem);
      overflow: auto;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 16px 40px rgba(15,23,42,0.18);
      z-index: 2400;
    }
    .nb-panel__head {
      display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;
      padding: 0.85rem 1rem; border-bottom: 1px solid #e2e8f0;
      position: sticky; top: 0; background: #fff; z-index: 1;
    }
    .nb-panel__head strong { font-size: 0.9rem; color: #0f172a; }
    .nb-link {
      border: none; background: none; color: #1d6b57; font-size: 0.75rem;
      font-weight: 700; cursor: pointer; white-space: nowrap;
    }
    .nb-link:disabled { opacity: 0.45; cursor: default; }
    .nb-list { list-style: none; margin: 0; padding: 0; }
    .nb-list a, .nb-plain {
      display: grid; gap: 0.2rem; width: 100%; text-align: left; padding: 0.85rem 1rem;
      border: none; border-bottom: 1px solid #f1f5f9; background: #fff;
      text-decoration: none; color: inherit; cursor: pointer;
      box-sizing: border-box;
    }
    .nb-item--unread a, .nb-item--unread .nb-plain { background: #f0fdf9; }
    .nb-list strong {
      font-size: 0.8125rem; color: #0f172a;
      overflow-wrap: anywhere; word-break: break-word;
    }
    .nb-list span {
      font-size: 0.75rem; color: #475569; line-height: 1.4;
      overflow-wrap: anywhere; word-break: break-word;
    }
    .nb-list time { font-size: 0.68rem; color: #94a3b8; }
    .nb-muted { margin: 0; padding: 0.85rem 1rem; color: #64748b; font-size: 0.8125rem; }
  `],
})
export class NotificationBellComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(NotificationApiService);

  @ViewChild('btn') btnRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('root') rootRef?: ElementRef<HTMLElement>;

  open = signal(false);
  loading = signal(false);
  unread = signal(0);
  items = signal<UserNotificationItem[]>([]);
  panelTop = signal(0);
  panelLeft = signal(0);

  private readonly panelWidth = 352;

  ngOnInit(): void {
    if (this.auth.isAuthenticated() && !this.auth.isGuest()) {
      this.refreshCount();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const root = this.rootRef?.nativeElement;
    if (root && !root.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.open()) this.placePanel();
  }

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) {
      queueMicrotask(() => this.placePanel());
      this.load();
    }
  }

  refreshCount(): void {
    this.api.unreadCount().subscribe({
      next: (r) => this.unread.set(r.count ?? 0),
      error: () => this.unread.set(0),
    });
  }

  load(): void {
    this.loading.set(true);
    this.api.list(20).subscribe({
      next: (r) => {
        this.items.set(r.items ?? []);
        this.unread.set(r.unreadCount ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openItem(n: UserNotificationItem): void {
    if (!n.isRead) {
      this.api.markRead(n.id).subscribe({
        next: () => {
          this.items.update(list => list.map(x => x.id === n.id ? { ...x, isRead: true } : x));
          this.unread.update(c => Math.max(0, c - 1));
        },
      });
    }
    this.open.set(false);
  }

  markAll(): void {
    this.api.markAllRead().subscribe({
      next: () => {
        this.items.update(list => list.map(x => ({ ...x, isRead: true })));
        this.unread.set(0);
      },
    });
  }

  private placePanel(): void {
    const btn = this.btnRef?.nativeElement;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const gap = 8;
    const width = Math.min(this.panelWidth, window.innerWidth - 16);
    let left = rect.left;
    // Prefer opening into the main content (to the right). Clamp to viewport.
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    if (left < 8) left = 8;
    this.panelTop.set(rect.bottom + gap);
    this.panelLeft.set(left);
  }
}
