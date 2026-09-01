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
const TOKEN_KEY = 'mosque_os_token';
const REFRESH_KEY = 'mosque_os_refresh';

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

  private refreshInFlight: Promise<boolean> | null = null;

  constructor() {
    this.restoreSession();
  }

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  private mosqueContext(): MosqueContextService {
    return this.injector.get(MosqueContextService);
  }

  private adminService(): AdminService {
    return this.injector.get(AdminService);
  }

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

  private storeTokens(res: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    if (res.refreshToken) {
      localStorage.setItem(REFRESH_KEY, res.refreshToken);
    }
  }

  private async applyLoginResponse(res: LoginResponse): Promise<void> {
    this.storeTokens(res);
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

  private async restoreSession(): Promise<void> {
    const token = localStorage.getItem(TOKEN_KEY);
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
      const refreshed = await this.tryRefreshToken();
      if (!refreshed) this.clearSession();
      else {
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
        }
      }
    } finally {
      this.loading.set(false);
    }
  }

  async login(emailOrUsername: string, password: string, rememberMe = false): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
        username: emailOrUsername.trim(),
        password,
        rememberMe,
      })
    );
    await this.applyLoginResponse(res);
  }

  async tryRefreshToken(): Promise<boolean> {
    if (this.refreshInFlight) return this.refreshInFlight;

    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) return false;

    this.refreshInFlight = (async () => {
      try {
        const res = await firstValueFrom(
          this.http.post<LoginResponse>(`${environment.apiUrl}/auth/refresh`, {
            refreshToken: refresh,
          })
        );
        this.storeTokens(res);
        this.isAuthenticated.set(true);
        return true;
      } catch {
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }

  async register(data: {
    email: string;
    fullName: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ email: string; message: string; requiresVerification: boolean }> {
    const res = await firstValueFrom(
      this.http.post<{ message: string; email: string; requiresVerification?: boolean }>(
        `${environment.apiUrl}/auth/register`, {
          email: data.email.trim().toLowerCase(),
          fullName: data.fullName.trim(),
          password: data.password,
          confirmPassword: data.confirmPassword,
          registerAsMosqueOwner: false,
        }
      )
    );
    return {
      email: res.email || data.email.trim().toLowerCase(),
      message: res.message,
      requiresVerification: res.requiresVerification !== false,
    };
  }

  async forgotPassword(email: string, preferOtp = false): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, {
        email: email.trim().toLowerCase(),
        preferOtp,
      })
    );
  }

  async resetPassword(data: {
    email: string;
    password: string;
    confirmPassword: string;
    token?: string;
    otp?: string;
  }): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${environment.apiUrl}/auth/reset-password`, {
        email: data.email.trim().toLowerCase(),
        password: data.password,
        confirmPassword: data.confirmPassword,
        token: data.token,
        otp: data.otp,
      })
    );
  }

  async logoutAllDevices(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout-all`, {}));
    } catch { /* still clear local */ }
    this.clearSession();
    void this.router.navigate(['/auth/login']);
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
    await this.applyLoginResponse(res);
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
    localStorage.setItem(TOKEN_KEY, token);
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
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (this.isAuthenticated()) {
      void firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken: refresh })
      ).catch(() => undefined);
    }
    this.clearSession();
    void this.router.navigate(['/']);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
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
