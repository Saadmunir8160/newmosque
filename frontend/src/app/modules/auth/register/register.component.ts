import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { passwordStrength, validateRegistrationForm } from '../../../core/utils/auth-password.util';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  acceptedTerms = false;

  submitting = signal(false);
  error = signal<string | null>(null);
  fieldErrors = signal<Record<string, string>>({});
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  toast = signal('');
  toastOk = signal(true);

  strength = computed(() => passwordStrength(this.password));

  private authService = inject(AuthService);
  private router = inject(Router);

  clearField(field: string): void {
    const next = { ...this.fieldErrors() };
    delete next[field];
    this.fieldErrors.set(next);
    this.error.set(null);
  }

  async onRegister(): Promise<void> {
    this.error.set(null);
    const errors = validateRegistrationForm({
      fullName: this.fullName,
      email: this.email,
      password: this.password,
      confirmPassword: this.confirmPassword,
      acceptedTerms: this.acceptedTerms,
    });
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) return;

    this.submitting.set(true);
    try {
      const res = await this.authService.register({
        fullName: this.fullName.trim(),
        email: this.email.trim().toLowerCase(),
        password: this.password,
        confirmPassword: this.confirmPassword,
        registerAsMosqueOwner: true,
      });
      void this.router.navigate(['/auth/login'], { queryParams: { email: res.email } });
    } catch (err) {
      this.error.set(this.readRegisterError(err));
    } finally {
      this.submitting.set(false);
    }
  }

  private readRegisterError(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return 'Unable to create account. Please try again.';
    }
    const body = err.error as { message?: string; errors?: string[] } | null;
    if (body?.message) return body.message;
    if (body?.errors?.length) return body.errors.join(' ');
    if (err.status === 409) return 'Email already registered.';
    if (err.status === 0) {
      return 'Cannot reach the server. Please try again later.';
    }
    return 'Unable to create account. Please try again.';
  }
}
