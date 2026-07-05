import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-auth-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()" role="presentation"></div>
    <div class="modal" role="dialog" aria-labelledby="login-modal-title">
      <div class="modal__header">
        <h2 id="login-modal-title">Log in to continue</h2>
        <button type="button" class="modal__close" (click)="close.emit()" aria-label="Close">×</button>
      </div>
      <p class="modal__hint">Sign in with your mosque owner account to submit a claim.</p>
      <form (ngSubmit)="submit()" class="modal__form">
        <label class="field">
          <span>Email or username</span>
          <input type="text" [(ngModel)]="username" name="username" autocomplete="username" required>
        </label>
        <label class="field">
          <span>Password</span>
          <input type="password" [(ngModel)]="password" name="password" autocomplete="current-password" required>
        </label>
        <p *ngIf="error()" class="error">{{ error() }}</p>
        <button type="submit" class="btn-primary" [disabled]="submitting()">
          {{ submitting() ? 'Signing in…' : 'Log in' }}
        </button>
      </form>
    </div>
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(2, 44, 34, 0.72);
      backdrop-filter: blur(4px);
    }
    .modal {
      position: relative;
      z-index: 1;
      width: min(100%, 420px);
      background: #fff;
      border-radius: 16px;
      padding: 1.25rem 1.5rem 1.5rem;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.28);
    }
    .modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .modal__header h2 {
      margin: 0;
      font-size: 1.125rem;
      color: #065f46;
    }
    .modal__close {
      border: none;
      background: transparent;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: #64748b;
    }
    .modal__hint {
      margin: 0.75rem 0 1rem;
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
    }
    .modal__form { display: grid; gap: 0.75rem; }
    .field { display: grid; gap: 0.35rem; }
    .field span {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .field input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 0.65rem 0.75rem;
      font-size: 0.875rem;
    }
    .field input:focus {
      outline: none;
      border-color: #059669;
      box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15);
    }
    .btn-primary {
      margin-top: 0.25rem;
      border: none;
      border-radius: 10px;
      padding: 0.75rem 1rem;
      background: linear-gradient(135deg, #059669, #047857);
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
    .error { margin: 0; color: #dc2626; font-size: 0.8125rem; font-weight: 600; }
  `]
})
export class AuthLoginModalComponent {
  @Input() mosqueName = '';
  @Output() close = new EventEmitter<void>();
  @Output() loggedIn = new EventEmitter<void>();

  private auth = inject(AuthService);

  username = '';
  password = '';
  submitting = signal(false);
  error = signal('');

  async submit(): Promise<void> {
    if (this.submitting()) return;
    this.error.set('');
    this.submitting.set(true);
    try {
      await this.auth.login(this.username, this.password);
      this.loggedIn.emit();
      this.close.emit();
    } catch {
      this.error.set('Invalid credentials. Try owner / Owner@123 or your registered account.');
    } finally {
      this.submitting.set(false);
    }
  }
}
