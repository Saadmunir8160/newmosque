import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ROLES } from '../constants/roles';
import { Mosque } from '../models';

export interface OwnedMosqueSummary {
  id: number;
  name: string;
  slug: string;
  city: string;
  status: string;
  profileCompleteness: number;
}

const ACTIVE_MOSQUE_KEY = 'mosqueos:activeMosqueId';

@Injectable({ providedIn: 'root' })
export class MosqueContextService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  readonly mosqueId = signal<number>(environment.defaultMosqueId);
  readonly mosque = signal<Mosque | null>(null);
  readonly ownedMosques = signal<OwnedMosqueSummary[]>([]);
  readonly loading = signal(false);
  readonly ready = signal(false);
  /** Mosque Owner logged in but has not linked a mosque yet. */
  readonly ownerNeedsSetup = signal(false);

  async resolve(force = false): Promise<number> {
    if (this.ready() && !force) return this.mosqueId();

    this.loading.set(true);
    try {
      const profile = this.auth.user();
      const isOwnerOrAdmin = this.auth.hasRole(ROLES.MosqueOwner) || this.auth.hasRole(ROLES.MosqueAdmin);

      if (isOwnerOrAdmin) {
        await this.loadOwnedMosques();
        const storedId = this.readStoredMosqueId();
        const owned = this.ownedMosques();
        const active = storedId && owned.some(m => m.id === storedId)
          ? storedId
          : owned[0]?.id;

        if (active) {
          await this.loadMosqueContext(active);
        } else if (this.auth.hasRole(ROLES.MosqueAdmin)) {
          // MosqueAdmin has no owned mosques — resolve via my-mosque (homeMosqueId)
          try {
            const res = await firstValueFrom(
              this.http.get<{ mosque: Mosque | null }>(`${environment.apiUrl}/mosques/my-mosque`)
            );
            if (res.mosque?.id) {
              this.mosqueId.set(res.mosque.id);
              this.mosque.set(res.mosque);
              this.ownerNeedsSetup.set(false);
              sessionStorage.setItem(ACTIVE_MOSQUE_KEY, String(res.mosque.id));
            }
          } catch { /* keep default */ }
        } else {
          this.ownerNeedsSetup.set(this.auth.hasRole(ROLES.MosqueOwner));
          this.mosque.set(null);
        }
      } else if (profile?.homeMosqueId) {
        this.mosqueId.set(profile.homeMosqueId);
        this.ownerNeedsSetup.set(false);
      } else if (this.auth.isAuthenticated() && (
        this.auth.hasRole(ROLES.Member) || this.auth.hasRole(ROLES.Parent)
        || this.auth.hasRole(ROLES.PrayerTimesEditor) || this.auth.hasRole(ROLES.Muqaddam)
      )) {
        try {
          const res = await firstValueFrom(
            this.http.get<{ mosque: Mosque | null }>(`${environment.apiUrl}/mosques/my-mosque`)
          );
          if (res.mosque?.id) {
            this.mosqueId.set(res.mosque.id);
            this.mosque.set(res.mosque);
            this.ownerNeedsSetup.set(false);
          }
        } catch { /* keep default */ }
      }
      this.ready.set(true);
      return this.mosqueId();
    } finally {
      this.loading.set(false);
    }
  }

  async setActiveMosqueId(id: number): Promise<void> {
    sessionStorage.setItem(ACTIVE_MOSQUE_KEY, String(id));
    this.mosqueId.set(id);
    await this.loadMosqueContext(id);
  }

  reset(): void {
    this.ready.set(false);
    this.mosque.set(null);
    this.ownedMosques.set([]);
    this.ownerNeedsSetup.set(false);
    this.mosqueId.set(environment.defaultMosqueId);
    sessionStorage.removeItem(ACTIVE_MOSQUE_KEY);
  }

  private readStoredMosqueId(): number | null {
    const raw = sessionStorage.getItem(ACTIVE_MOSQUE_KEY);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private async loadOwnedMosques(): Promise<void> {
    try {
      const list = await firstValueFrom(
        this.http.get<OwnedMosqueSummary[]>(`${environment.apiUrl}/mosques/my-mosques`)
      );
      this.ownedMosques.set(list ?? []);
    } catch {
      this.ownedMosques.set([]);
    }
  }

  private async loadMosqueContext(mosqueId: number): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ mosque: Mosque | null; profileCompleteness?: number; missingFields?: string[] }>(
          `${environment.apiUrl}/mosques/my-mosque`,
          { params: { mosqueId: String(mosqueId) } }
        )
      );
      if (res.mosque?.id) {
        this.mosqueId.set(res.mosque.id);
        this.mosque.set(res.mosque);
        this.ownerNeedsSetup.set(false);
        sessionStorage.setItem(ACTIVE_MOSQUE_KEY, String(res.mosque.id));
      } else {
        this.ownerNeedsSetup.set(this.auth.hasRole(ROLES.MosqueOwner));
        this.mosque.set(null);
      }
    } catch {
      this.ownerNeedsSetup.set(this.auth.hasRole(ROLES.MosqueOwner));
      this.mosque.set(null);
    }
  }
}
