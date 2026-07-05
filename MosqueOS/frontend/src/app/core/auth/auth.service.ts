import { Injectable, Injector, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { roleDisplayName, ROLES } from '../constants/roles';
import { homeRouteForRoles } from '../config/nav.config';
import { NavigationService } from '../services/navigation.service';
import { MosqueContextService } from '../services/mosque-context.service';
import { AdminService } from '../services/admin.service';
import { LoginResponse, UserProfile } from '../models';
import { InvitePreview } from '../services/platform.service';

const GUEST_KEY = 'mosque_os_guest';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private navigation = inject(NavigationService);
  private injector = inject(Injector);

  readonly roles = signal<string[]>([]);
  readonly isAuthenticated = signal(false);
  readonly isGuest = signal(false);
  readonly user = signal<UserProfile | null>(null);
  readonly loading = signal(true);
  readonly currentUser$ = toObservable(this.user);

  constructor() {
    this.restoreSession();
  }

  private mosqueContext(): MosqueContextService {
    return this.injector.get(MosqueContextService);
  }

  private adminService(): AdminService {
    return this.injector.get(AdminService);
  }

  /** Post-login route for authenticated users. */
  async resolveHomeRoute(returnUrl?: string | null): Promise<string> {
    if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//')) return returnUrl;
    return homeRouteForRoles(this.roles());
  }

  private normalizeRoles(roles: string[] | null | undefined): string[] {
    return Array.isArray(roles) ? roles.filter(Boolean) : [];
  }

  private applyRoles(roles: string[] | null | undefined, fallback: string[] = []): void {
    const next = this.normalizeRoles(roles);
    this.roles.set(next.length ? next : fallback);
  }

  private async restoreSession(): Promise<void> {
    const token = localStorage.getItem('mosque_os_token');
    if (!token) {
      this.isGuest.set(sessionStorage.getItem(GUEST_KEY) === '1');
      this.loading.set(false);
      return;
    }
    try {
      const profile = await firstValueFrom(
        this.http.get<UserProfile>(`${environment.apiUrl}/auth/me`)
      );
      this.user.set(profile);
      this.applyRoles(profile.roles);
      this.isAuthenticated.set(true);
      await this.navigation.load();
      await this.mosqueContext().resolve(true);
    } catch {
      this.clearSession();
    } finally {
      this.loading.set(false);
    }
  }

  async login(emailOrUsername: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
        username: emailOrUsername.trim(),
        password,
      })
    );
    localStorage.setItem('mosque_os_token', res.token);
    this.clearGuestMode();
    const loginRoles = this.normalizeRoles(res.roles);
    this.applyRoles(loginRoles);
    this.isAuthenticated.set(true);
    this.user.set({
      id: '',
      userName: res.username,
      email: '',
      fullName: res.fullName,
      tariqa: '',
      level: '',
      displayPreference: '',
      wirdMode: '',
      homeMosqueId: null,
      searchRadiusKm: 0,
      interests: null,
      roles: loginRoles,
    });
    try {
      const profile = await firstValueFrom(
        this.http.get<UserProfile>(`${environment.apiUrl}/auth/me`)
      );
      this.user.set(profile);
      this.applyRoles(profile.roles, loginRoles);
    } catch {
      // keep login response profile
    }
    await this.navigation.load();
    await this.mosqueContext().resolve(true);
  }

  async register(data: {
    email: string;
    fullName: string;
    password: string;
    confirmPassword: string;
    registerAsMosqueOwner?: boolean;
  }): Promise<{ email: string; message: string }> {
    const res = await firstValueFrom(
      this.http.post<{ message: string; email: string; requiresVerification?: boolean }>(
        `${environment.apiUrl}/auth/register`, {
          email: data.email.trim().toLowerCase(),
          fullName: data.fullName.trim(),
          password: data.password,
          confirmPassword: data.confirmPassword,
          registerAsMosqueOwner: data.registerAsMosqueOwner ?? true,
        }
      )
    );
    return { email: res.email || data.email.trim().toLowerCase(), message: res.message };
  }

  async confirmEmail(userId: string, token: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.get<{ message: string }>(`${environment.apiUrl}/auth/verify-email`, {
        params: { userId, token },
      })
    );
  }

  async getInvitePreview(token: string): Promise<InvitePreview> {
    return firstValueFrom(
      this.http.get<InvitePreview>(
        `${environment.apiUrl}/auth/invite/${encodeURIComponent(token)}`
      )
    );
  }

  async acceptInvite(token: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${environment.apiUrl}/auth/accept-invite`, { token })
    );
  }

  async registerFromInvite(data: {
    token: string;
    password: string;
    confirmPassword: string;
    fullName?: string;
  }): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiUrl}/auth/register-from-invite`, {
        token: data.token,
        password: data.password,
        confirmPassword: data.confirmPassword,
        fullName: data.fullName,
      })
    );
    localStorage.setItem('mosque_os_token', res.token);
    this.clearGuestMode();
    const loginRoles = this.normalizeRoles(res.roles);
    this.applyRoles(loginRoles);
    this.isAuthenticated.set(true);
    this.user.set({
      id: '',
      userName: res.username,
      email: '',
      fullName: res.fullName,
      tariqa: '',
      level: '',
      displayPreference: '',
      wirdMode: '',
      homeMosqueId: null,
      searchRadiusKm: 0,
      interests: null,
      roles: loginRoles,
    });
    try {
      const profile = await firstValueFrom(
        this.http.get<UserProfile>(`${environment.apiUrl}/auth/me`)
      );
      this.user.set(profile);
      this.applyRoles(profile.roles, loginRoles);
    } catch {
      // keep login response profile
    }
    await this.navigation.load();
    await this.mosqueContext().resolve(true);
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${environment.apiUrl}/auth/resend-verification`, { email })
    );
  }

  async verifyOtp(email: string, otp: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${environment.apiUrl}/auth/verify-otp`, { email, otp })
    );
  }

  async resendOtp(email: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${environment.apiUrl}/auth/resend-otp`, { email })
    );
  }

  socialLoginUrl(provider: 'google' | 'facebook'): string {
    const base = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
    return `${base}/api/v1/auth/external/${provider}`;
  }

  async getSocialProviders(): Promise<{ google: boolean; facebook: boolean }> {
    return firstValueFrom(
      this.http.get<{ google: boolean; facebook: boolean }>(`${environment.apiUrl}/auth/external/providers`)
    );
  }

  async applyOAuthToken(token: string): Promise<void> {
    localStorage.setItem('mosque_os_token', token);
    this.clearGuestMode();
    this.isAuthenticated.set(true);
    const profile = await firstValueFrom(
      this.http.get<UserProfile>(`${environment.apiUrl}/auth/me`)
    );
    this.user.set(profile);
    this.applyRoles(profile.roles);
    await this.navigation.load();
    await this.mosqueContext().resolve(true);
  }

  enterGuestMode(): void {
    this.clearSession();
    sessionStorage.setItem(GUEST_KEY, '1');
    this.isGuest.set(true);
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/']);
  }

  private clearSession(): void {
    localStorage.removeItem('mosque_os_token');
    this.clearGuestMode();
    this.roles.set([]);
    this.user.set(null);
    this.isAuthenticated.set(false);
    this.navigation.reset();
    this.mosqueContext().reset();
  }

  private clearGuestMode(): void {
    sessionStorage.removeItem(GUEST_KEY);
    this.isGuest.set(false);
  }

  hasRole(role: string): boolean {
    if (this.isGuest() || !this.isAuthenticated()) return false;
    return this.roles().includes(role);
  }

  isSuperAdmin(): boolean {
    return this.hasRole(ROLES.SuperAdmin);
  }

  hasAnyRole(roles: string | string[]): boolean {
    const list = Array.isArray(roles) ? roles : [roles];
    return list.some(r => this.hasRole(r));
  }

  canEditMosque(mosqueId: string | number): boolean {
    if (!this.isAuthenticated()) return false;
    if (this.isSuperAdmin()) return true;

    const id = typeof mosqueId === 'string' ? Number(mosqueId) : mosqueId;
    if (!Number.isFinite(id)) return false;

    const profile = this.user();
    if (profile?.homeMosqueId === id && this.hasAnyRole([ROLES.MosqueAdmin, ROLES.MosqueOwner])) {
      return true;
    }

    const scopedMosque = this.mosqueContext().mosque();
    if (scopedMosque?.id === id) {
      if (scopedMosque.ownerId && profile?.id && scopedMosque.ownerId === profile.id) return true;
      if (profile?.homeMosqueId === id && this.hasRole(ROLES.MosqueAdmin)) return true;
    }

    return false;
  }

  primaryRoleName(): string {
    return roleDisplayName(this.roles());
  }

  async refreshProfile(): Promise<void> {
    if (!this.isAuthenticated()) return;
    const profile = await firstValueFrom(
      this.http.get<UserProfile>(`${environment.apiUrl}/auth/me`)
    );
    this.user.set(profile);
    this.applyRoles(profile.roles);
    await this.mosqueContext().resolve(true);
  }
}
