import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, UserProfile } from '../models';

const GUEST_KEY = 'mosque_os_guest';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly roles = signal<string[]>([]);
  readonly isAuthenticated = signal(false);
  readonly isGuest = signal(false);
  readonly user = signal<UserProfile | null>(null);
  readonly loading = signal(true);

  constructor() {
    this.restoreSession();
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
      this.roles.set(profile.roles);
      this.isAuthenticated.set(true);
    } catch {
      this.clearSession();
    } finally {
      this.loading.set(false);
    }
  }

  async login(username: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
        username: username.trim(),
        password,
      })
    );
    localStorage.setItem('mosque_os_token', res.token);
    this.clearGuestMode();
    this.roles.set(res.roles);
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
      roles: res.roles,
    });
    try {
      const profile = await firstValueFrom(
        this.http.get<UserProfile>(`${environment.apiUrl}/auth/me`)
      );
      this.user.set(profile);
      this.roles.set(profile.roles);
    } catch {
      // keep login response profile
    }
  }

  async register(data: { username: string; email: string; fullName: string; password: string }): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/auth/register`, data)
    );
    await this.login(data.username, data.password);
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
    this.roles.set(profile.roles);
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
  }

  private clearGuestMode(): void {
    sessionStorage.removeItem(GUEST_KEY);
    this.isGuest.set(false);
  }

  hasRole(role: string): boolean {
    if (this.isGuest() || !this.isAuthenticated()) return false;
    return this.roles().includes(role) || this.roles().includes('Super Admin');
  }
}
