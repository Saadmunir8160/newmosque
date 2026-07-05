import { Component, OnInit, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

import { InvitePreview } from '../../../core/services/platform.service';

import { validateRegistrationForm } from '../../../core/utils/auth-password.util';



@Component({

  selector: 'app-invite-accept',

  standalone: true,

  imports: [CommonModule, RouterModule, FormsModule],

  styles: [`

    :host { display: block; min-height: 100dvh; }

    .auth-page {

      min-height: 100dvh; display: flex; align-items: center; justify-content: center;

      padding: 1.25rem; background: linear-gradient(165deg, #022c22 0%, #064e3b 100%);

    }

    .auth-inner {

      width: 100%; max-width: 480px;

      background: rgba(255,255,255,0.07);

      border: 1px solid rgba(212,175,55,0.28);

      border-radius: 1.25rem;

      padding: 1.65rem;

      color: #ecfdf5;

    }

    h1 { margin: 0 0 0.5rem; font-size: 1.35rem; color: #fff; }

    .sub { margin: 0 0 1rem; font-size: 0.875rem; color: rgba(167,243,208,0.85); line-height: 1.5; }

    .meta { margin: 0 0 1rem; padding: 0.75rem 1rem; border-radius: 0.75rem; background: rgba(0,0,0,0.2); font-size: 0.8125rem; }

    .meta strong { color: #fff; }

    .field { display: block; margin-bottom: 0.75rem; }

    .field span { display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.35rem; color: rgba(167,243,208,0.9); }

    .field input {

      width: 100%; box-sizing: border-box; padding: 0.65rem 0.75rem; border-radius: 0.65rem;

      border: 1px solid rgba(212,175,55,0.35); background: rgba(0,0,0,0.25); color: #fff;

    }

    .field input:read-only { opacity: 0.85; }

    .field small { display: block; margin-top: 0.25rem; color: #fca5a5; font-size: 0.75rem; }

    .spinner {

      width: 2rem; height: 2rem; margin: 0 auto 1rem;

      border-radius: 999px; border: 2px solid rgba(212,175,55,0.25);

      border-top-color: #D4AF37; animation: spin 0.8s linear infinite;

    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .btn {

      display: inline-block; margin-top: 0.5rem; margin-right: 0.5rem; padding: 0.75rem 1.25rem;

      border-radius: 0.75rem; background: #D4AF37; color: #022c22;

      font-weight: 700; text-decoration: none; border: none; cursor: pointer;

    }

    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn--ghost { background: transparent; color: #D4AF37; border: 1px solid rgba(212,175,55,0.45); }

    .msg--err { color: #fca5a5; }

  `],

  template: `

    <div class="auth-page">

      <div class="auth-inner">

        <div *ngIf="loading()" class="spinner" aria-hidden="true"></div>

        <h1>{{ title() }}</h1>

        <p class="sub" [class.msg--err]="error()">{{ message() }}</p>



        <div *ngIf="preview() as p" class="meta">

          <p style="margin:0 0 0.35rem"><strong>{{ p.mosqueName }}</strong> · {{ p.mosqueCity }}</p>

          <p style="margin:0">Role: <strong>{{ p.role }}</strong></p>

          <p style="margin:0.35rem 0 0">Invited email: <strong>{{ p.inviteEmail }}</strong></p>

        </div>



        <ng-container *ngIf="!loading() && preview() && !error() && !accepted()">

          <button *ngIf="isLoggedIn()" type="button" class="btn" (click)="accept()" [disabled]="accepting()">

            {{ accepting() ? 'Accepting…' : 'Accept invitation' }}

          </button>



          <ng-container *ngIf="!isLoggedIn()">

            <p class="sub" style="margin-top:0">Set your password to create your owner account and accept this invitation.</p>

            <label class="field">

              <span>Email</span>

              <input type="email" [value]="preview()!.inviteEmail" readonly>

            </label>

            <label class="field">

              <span>Your name</span>

              <input type="text" [(ngModel)]="fullName" name="fullName" placeholder="Full name">

            </label>

            <label class="field">

              <span>Password</span>

              <input type="password" [(ngModel)]="password" name="password" autocomplete="new-password">

              <small *ngIf="fieldErrors()['password']">{{ fieldErrors()['password'] }}</small>

            </label>

            <label class="field">

              <span>Confirm password</span>

              <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" autocomplete="new-password">

              <small *ngIf="fieldErrors()['confirmPassword']">{{ fieldErrors()['confirmPassword'] }}</small>

            </label>

            <button type="button" class="btn" (click)="setupAndAccept()" [disabled]="accepting()">

              {{ accepting() ? 'Creating account…' : 'Set password & accept' }}

            </button>

            <a class="btn btn--ghost" [routerLink]="['/auth/login']" [queryParams]="loginQuery()">Already have an account? Log in</a>

          </ng-container>

        </ng-container>



        <a *ngIf="accepted()" routerLink="/dashboard/owner" class="btn">Go to owner dashboard</a>

      </div>

    </div>

  `

})

export class InviteAcceptComponent implements OnInit {

  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private auth = inject(AuthService);



  loading = signal(true);

  accepting = signal(false);

  accepted = signal(false);

  error = signal('');

  title = signal('Mosque invitation');

  message = signal('Loading invitation details…');

  preview = signal<InvitePreview | null>(null);

  fieldErrors = signal<Record<string, string>>({});

  fullName = '';

  password = '';

  confirmPassword = '';

  private token = '';



  ngOnInit(): void {

    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {

      this.loading.set(false);

      this.error.set('1');

      this.title.set('Invitation not found');

      this.message.set('This link is missing a token. Ask your administrator to resend the invitation.');

      return;

    }

    void this.loadPreview();

  }



  isLoggedIn(): boolean {

    return this.auth.isAuthenticated();

  }



  loginQuery(): Record<string, string> {

    const p = this.preview();

    return {

      returnUrl: `/invite/accept?token=${encodeURIComponent(this.token)}`,

      email: p?.inviteEmail ?? '',

    };

  }



  private async loadPreview(): Promise<void> {

    try {

      const p = await this.auth.getInvitePreview(this.token);

      this.preview.set(p);

      this.fullName = p.inviteName ?? '';

      this.title.set('You are invited');

      this.message.set('Accept this invitation to join the mosque on MosqueOS.');

    } catch (e: unknown) {

      const err = e as { error?: { message?: string } };

      this.error.set('1');

      this.title.set('Invitation unavailable');

      this.message.set(err.error?.message ?? 'Invalid or expired invitation.');

    } finally {

      this.loading.set(false);

    }

  }



  async setupAndAccept(): Promise<void> {

    const p = this.preview();

    if (!p) return;



    const errors = validateRegistrationForm({

      fullName: this.fullName || p.inviteName || p.inviteEmail.split('@')[0],

      email: p.inviteEmail,

      password: this.password,

      confirmPassword: this.confirmPassword,

      acceptedTerms: true,

    });

    this.fieldErrors.set(errors);

    if (Object.keys(errors).length) return;



    this.accepting.set(true);

    this.error.set('');

    try {

      await this.auth.registerFromInvite({

        token: this.token,

        password: this.password,

        confirmPassword: this.confirmPassword,

        fullName: (this.fullName || p.inviteName || '').trim() || undefined,

      });

      this.accepted.set(true);

      this.title.set('Welcome to MosqueOS');

      this.message.set('Your account is ready. Complete your mosque profile and submit for admin approval.');

      setTimeout(() => void this.router.navigate(['/dashboard/owner']), 2000);

    } catch (e: unknown) {

      const err = e as { error?: { message?: string } };

      this.error.set('1');

      this.message.set(err.error?.message ?? 'Could not create your account. Try logging in if you already registered.');

    } finally {

      this.accepting.set(false);

    }

  }



  async accept(): Promise<void> {

    this.accepting.set(true);

    this.error.set('');

    try {

      const res = await this.auth.acceptInvite(this.token);

      this.accepted.set(true);

      this.title.set('Invitation accepted');

      this.message.set(res.message || 'Complete your mosque profile and submit for admin approval.');

      setTimeout(() => void this.router.navigate(['/dashboard/owner']), 2000);

    } catch (e: unknown) {

      const err = e as { error?: { message?: string } };

      this.error.set('1');

      this.message.set(err.error?.message ?? 'Could not accept invitation.');

    } finally {

      this.accepting.set(false);

    }

  }

}


