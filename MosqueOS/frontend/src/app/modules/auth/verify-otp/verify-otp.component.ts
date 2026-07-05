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
    :host { display: block; min-height: 100dvh; }
    .auth-page {
      min-height: 100dvh; display: flex; align-items: center; justify-content: center;
      padding: 1.25rem; background: linear-gradient(165deg, #022c22 0%, #064e3b 100%);
    }
    .auth-inner {
      width: 100%; max-width: 420px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(212,175,55,0.28);
      border-radius: 1.25rem;
      padding: 1.65rem;
      color: #ecfdf5;
      text-align: center;
    }
    .icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    h1 { margin: 0 0 0.5rem; font-size: 1.35rem; color: #fff; }
    .sub { margin: 0 0 1rem; font-size: 0.875rem; color: rgba(167,243,208,0.85); line-height: 1.5; }
    .email-chip {
      display: inline-block; margin-bottom: 1rem; padding: 0.35rem 0.75rem;
      border-radius: 999px; background: rgba(212,175,55,0.12);
      border: 1px solid rgba(212,175,55,0.35); color: #fcd34d; font-size: 0.8125rem;
    }
    .field { margin-bottom: 0.75rem; text-align: left; }
    .label { display: block; font-size: 0.75rem; color: #6ee7b7; margin-bottom: 0.35rem; }
    .input {
      width: 100%; box-sizing: border-box; padding: 0.65rem 0.75rem; border-radius: 0.75rem;
      border: 1px solid rgba(212,175,55,0.35); background: rgba(2,44,34,0.55); color: #fff;
    }
    .otp-row {
      display: flex; gap: 0.5rem; justify-content: center; margin-top: 0.35rem;
    }
    .otp-cell {
      width: 2.75rem; height: 3rem; text-align: center; font-size: 1.35rem; font-weight: 700;
      border-radius: 0.65rem; border: 1px solid rgba(212,175,55,0.35);
      background: rgba(2,44,34,0.55); color: #fff; font-variant-numeric: tabular-nums;
      outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    }
    .otp-cell:focus {
      border-color: #D4AF37;
      box-shadow: 0 0 0 3px rgba(212,175,55,0.15);
    }
    .otp-cell--filled { border-color: rgba(212,175,55,0.55); }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }
    .paste-hint { margin: 0.5rem 0 0; font-size: 0.6875rem; color: rgba(167,243,208,0.65); text-align: center; }
    .btn {
      width: 100%; margin-top: 0.25rem; padding: 0.875rem; border-radius: 0.75rem;
      border: 1px solid rgba(212,175,55,0.45); background: linear-gradient(180deg, rgba(6,78,59,0.95), rgba(2,44,34,0.98));
      color: #fff; font-weight: 700; cursor: pointer;
    }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-ghost {
      margin-top: 0.5rem; background: transparent; border-color: rgba(212,175,55,0.35);
    }
    .msg { margin-top: 0.75rem; font-size: 0.8125rem; color: #6ee7b7; }
    .msg--err { color: #fca5a5; }
    .msg--ok { color: #34d399; }
    .footer { margin-top: 1.25rem; font-size: 0.8125rem; }
    .footer a { color: #D4AF37; font-weight: 700; }
    .dev-hint {
      margin-top: 0.75rem; padding: 0.65rem; border-radius: 0.5rem;
      background: rgba(212,175,55,0.1); border: 1px dashed rgba(212,175,55,0.35);
      font-size: 0.75rem; color: rgba(252,211,77,0.9); text-align: left; line-height: 1.45;
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
          <label class="label">Verification code</label>
          <!-- Hidden input helps iOS/Android suggest OTP from Mail -->
          <input class="sr-only" type="text" inputmode="numeric" autocomplete="one-time-code"
            [value]="otpCode" (input)="onAutofillInput($event)" tabindex="-1" aria-hidden="true">
          <div class="otp-row" (paste)="onPaste($event)">
            <input *ngFor="let d of digits; let i = index" #otpCell
              class="otp-cell" [class.otp-cell--filled]="digits[i]"
              type="text" inputmode="numeric" maxlength="1"
              [value]="digits[i]"
              [attr.aria-label]="'Digit ' + (i + 1)"
              (input)="onDigitInput(i, $event)"
              (keydown)="onDigitKeydown(i, $event)"
              (focus)="onDigitFocus($event)">
          </div>
          <p class="paste-hint">Tap a box and paste the code from your email, or type each digit.</p>
        </div>

        <button type="button" class="btn" (click)="verify()" [disabled]="verifying()">
          {{ verifying() ? 'Verifying…' : 'Verify email' }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="resend()" [disabled]="sending()">
          {{ sending() ? 'Sending…' : 'Resend code' }}
        </button>

        <p *ngIf="msg()" class="msg" [class.msg--err]="msgErr()" [class.msg--ok]="msgOk()">{{ msg() }}</p>

        <p class="dev-hint">
          No email yet? Add Gmail SMTP in <code>appsettings.Local.json</code>, or check the API terminal for the OTP in dev mode.
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
    setTimeout(() => this.otpCells?.first?.nativeElement?.focus(), 100);
  }

  onAutofillInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.applyOtpString(val);
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    this.applyOtpString(text);
  }

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const char = input.value.replace(/\D/g, '').slice(-1);
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
