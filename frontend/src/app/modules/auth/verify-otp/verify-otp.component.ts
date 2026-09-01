import {
  Component, OnInit, AfterViewInit, inject, signal, ViewChildren, QueryList, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  styles: [`
    :host { display: block; min-height: 100dvh; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .auth-page {
      min-height: 100dvh; display: flex; align-items: center; justify-content: center;
      padding: 1.25rem; background: #0B3D2E;
    }
    .auth-inner {
      width: 100%; max-width: 420px;
      background: #0F4C3A;
      border: 1px solid #2B6A55;
      border-radius: 14px;
      padding: 1.65rem;
      color: #EAF4EF;
      text-align: center;
      box-shadow: 0 16px 40px rgba(0,0,0,0.25);
    }
    .icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    h1 { margin: 0 0 0.5rem; font-size: 1.35rem; font-weight: 700; color: #fff; }
    .sub { margin: 0 0 1rem; font-size: 0.875rem; color: #C9D8D0; line-height: 1.5; }
    .email-chip {
      display: inline-block; margin-bottom: 1rem; padding: 0.35rem 0.75rem;
      border-radius: 999px; background: rgba(200,162,74,0.12);
      border: 1px solid rgba(200,162,74,0.35); color: #C8A24A; font-size: 0.8125rem;
    }
    .field { margin-bottom: 0.75rem; text-align: left; }
    .label { display: block; font-size: 0.75rem; color: #C9D8D0; margin-bottom: 0.35rem; font-weight: 600; }
    .input {
      width: 100%; box-sizing: border-box; padding: 0.65rem 0.75rem; border-radius: 10px;
      border: 1px solid #2B6A55; background: #0B3D2E; color: #fff; font-family: inherit;
    }
    .input:focus { outline: none; border-color: #C8A24A; }
    .otp-row {
      display: flex; gap: 0.5rem; justify-content: center; margin-top: 0.35rem;
    }
    .otp-cell {
      width: 2.75rem; height: 3rem; text-align: center; font-size: 1.35rem; font-weight: 700;
      border-radius: 10px; border: 1px solid #2B6A55;
      background: #0B3D2E; color: #fff; font-variant-numeric: tabular-nums;
      outline: none; transition: border-color 200ms ease, box-shadow 200ms ease;
      font-family: inherit;
    }
    .otp-cell:focus {
      border-color: #C8A24A;
      box-shadow: 0 0 0 3px rgba(200,162,74,0.18);
    }
    .otp-cell--filled { border-color: rgba(200,162,74,0.55); }
    .paste-hint { margin: 0.5rem 0 0; font-size: 0.6875rem; color: rgba(201,216,208,0.75); text-align: center; }
    .btn {
      width: 100%; margin-top: 0.25rem; min-height: 44px; padding: 0.875rem; border-radius: 10px;
      border: none; background: #C8A24A;
      color: #0B3D2E; font-family: inherit; font-weight: 700; cursor: pointer;
      transition: background 200ms ease;
    }
    .btn:hover:not(:disabled) { background: #D4B56A; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-ghost {
      margin-top: 0.5rem; background: transparent; border: 1px solid #2B6A55; color: #EAF4EF;
    }
    .btn-ghost:hover:not(:disabled) { background: #16624A; border-color: transparent; }
    .msg { margin-top: 0.75rem; font-size: 0.8125rem; color: #C9D8D0; }
    .msg--err { color: #fca5a5; }
    .msg--ok { color: #86efac; }
    .footer { margin-top: 1.25rem; font-size: 0.8125rem; color: #C9D8D0; }
    .footer a { color: #C8A24A; font-weight: 700; text-decoration: none; }
    .footer a:hover { color: #D4B56A; text-decoration: underline; }
    .dev-hint {
      margin-top: 0.75rem; padding: 0.65rem; border-radius: 10px;
      background: rgba(200,162,74,0.1); border: 1px dashed rgba(200,162,74,0.35);
      font-size: 0.75rem; color: #C8A24A; text-align: left; line-height: 1.45;
    }
  `],
  template: `
    <div class="auth-page">
      <div class="auth-inner">
        <div class="icon" aria-hidden="true">🔐</div>
        <h1>Verify your email</h1>
        <p class="sub">Enter the 6-digit code we sent to your email. It expires in 10 minutes.</p>
        <p *ngIf="email()" class="email-chip">{{ email() }}</p>

        <div class="field">
          <label class="label" for="otp-email">Email</label>
          <input class="input" id="otp-email" type="email" [(ngModel)]="emailInput"
            autocomplete="email" placeholder="you@example.com">
        </div>

        <div class="field">
          <label class="label" id="otp-label">Verification code</label>
          <!-- Visible first cell carries autocomplete so Mail/SMS OTP autofills all 6 digits -->
          <div class="otp-row" role="group" aria-labelledby="otp-label" (paste)="onPaste($event)">
            <input *ngFor="let d of digits; let i = index" #otpCell
              class="otp-cell" [class.otp-cell--filled]="digits[i]"
              type="text" inputmode="numeric" pattern="[0-9]*"
              [attr.maxlength]="i === 0 ? 6 : 1"
              [attr.autocomplete]="i === 0 ? 'one-time-code' : 'off'"
              [attr.name]="i === 0 ? 'one-time-code' : null"
              [value]="digits[i]"
              [attr.aria-label]="'Digit ' + (i + 1) + ' of 6'"
              (input)="onDigitInput(i, $event)"
              (keydown)="onDigitKeydown(i, $event)"
              (focus)="onDigitFocus($event)">
          </div>
          <p class="paste-hint">Code autofills from email when suggested, or paste / type the 6 digits.</p>
        </div>

        <button type="button" class="btn" (click)="verify()" [disabled]="verifying()">
          {{ verifying() ? 'Verifying…' : 'Verify email' }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="resend()" [disabled]="sending()">
          {{ sending() ? 'Sending…' : 'Resend code' }}
        </button>

        <p *ngIf="msg()" class="msg" [class.msg--err]="msgErr()" [class.msg--ok]="msgOk()">{{ msg() }}</p>

        <p class="dev-hint">
          Check inbox and spam for the 6-digit code from MosqueOS. In local/dev the code is also printed in the API terminal.
        </p>

        <p class="footer">
          Verified? <a routerLink="/login">Log in</a>
        </p>
      </div>
    </div>
  `
})
export class VerifyOtpComponent implements OnInit, AfterViewInit {
  @ViewChildren('otpCell') otpCells!: QueryList<ElementRef<HTMLInputElement>>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  email = signal('');
  emailInput = '';
  digits = ['', '', '', '', '', ''];
  verifying = signal(false);
  sending = signal(false);
  msg = signal('');
  msgErr = signal(false);
  msgOk = signal(false);

  get otpCode(): string {
    return this.digits.join('');
  }

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('email') ?? '';
    this.email.set(q);
    this.emailInput = q;
  }

  ngAfterViewInit(): void {
    // Focus first cell so browser OTP autofill targets autocomplete="one-time-code".
    setTimeout(() => this.otpCells?.first?.nativeElement?.focus(), 100);
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    this.applyOtpString(text);
  }

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');

    // Autofill / paste into one box often delivers the full 6-digit code at once.
    if (raw.length > 1) {
      this.applyOtpString(raw);
      return;
    }

    const char = raw.slice(-1);
    const next = [...this.digits];
    next[index] = char;
    this.digits = next;
    input.value = char;

    if (char && index < 5) {
      this.focusCell(index + 1);
    }
    if (this.otpCode.length === 6) {
      void this.verify();
    }
  }

  onDigitKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      const next = [...this.digits];
      next[index - 1] = '';
      this.digits = next;
      this.syncCellValues();
      this.focusCell(index - 1);
      event.preventDefault();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      this.focusCell(index - 1);
      event.preventDefault();
    }
    if (event.key === 'ArrowRight' && index < 5) {
      this.focusCell(index + 1);
      event.preventDefault();
    }
  }

  onDigitFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  private applyOtpString(raw: string): void {
    const code = raw.replace(/\D/g, '').slice(0, 6);
    if (!code) return;
    this.digits = Array.from({ length: 6 }, (_, i) => code[i] ?? '');
    this.syncCellValues();
    if (code.length === 6) {
      this.focusCell(5);
      void this.verify();
    } else {
      this.focusCell(Math.min(code.length, 5));
    }
  }

  private syncCellValues(): void {
    const cells = this.otpCells?.toArray() ?? [];
    cells.forEach((ref, i) => { ref.nativeElement.value = this.digits[i] ?? ''; });
  }

  private focusCell(index: number): void {
    const cells = this.otpCells?.toArray() ?? [];
    cells[index]?.nativeElement.focus();
  }

  async verify(): Promise<void> {
    const email = this.emailInput.trim().toLowerCase();
    const code = this.otpCode;
    if (!email || code.length !== 6) {
      this.setMsg('Enter your email and the 6-digit code.', true, false);
      return;
    }
    if (this.verifying()) return;
    this.verifying.set(true);
    try {
      const res = await this.auth.verifyOtp(email, code);
      this.setMsg(res.message, false, true);
      setTimeout(() => this.router.navigate(['/login'], { queryParams: { email } }), 1200);
    } catch (e: unknown) {
      const err = e as { error?: { message?: string } };
      this.setMsg(err.error?.message || 'Invalid or expired code.', true, false);
      this.digits = ['', '', '', '', '', ''];
      this.syncCellValues();
      this.focusCell(0);
    } finally {
      this.verifying.set(false);
    }
  }

  async resend(): Promise<void> {
    const email = this.emailInput.trim().toLowerCase();
    if (!email) {
      this.setMsg('Please enter your email address.', true, false);
      return;
    }
    this.sending.set(true);
    try {
      const res = await this.auth.resendOtp(email);
      this.setMsg(res.message, false, true);
      this.digits = ['', '', '', '', '', ''];
      this.syncCellValues();
      this.focusCell(0);
    } catch {
      this.setMsg('Could not resend code. Try again later.', true, false);
    } finally {
      this.sending.set(false);
    }
  }

  private setMsg(text: string, err: boolean, ok: boolean): void {
    this.msg.set(text);
    this.msgErr.set(err);
    this.msgOk.set(ok);
  }
}
