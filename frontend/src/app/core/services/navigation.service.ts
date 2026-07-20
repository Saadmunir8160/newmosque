import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NavItem } from '../config/nav.config';

export interface NavigationSection {
  section: string;
  items: NavItem[];
}

export interface UserAccessMenu {
  roles: string[];
  permissions: string[];
  navigation: NavigationSection[];
}

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private http = inject(HttpClient);
  readonly permissions = signal<string[]>([]);
  readonly sections = signal<NavigationSection[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<UserAccessMenu>(`${environment.apiUrl}/navigation`)
      );
      this.permissions.set(data.permissions ?? []);
      this.sections.set(
        (data.navigation ?? []).map(s => ({
          section: s.section,
          items: s.items
            .filter(i => {
              // Hide non-MVP modules from the sidebar
              const hiddenRoutes = [
                '/madrassah', '/communities', '/awrad', '/adhkar', '/duas', 
                '/quran', '/ritual-guides', '/death-readings', '/participation', 
                '/journey-guides', '/fundraising', '/memberships', '/nearby'
              ];
              return !hiddenRoutes.some(hr => i.route?.includes(hr));
            })
            .map(i => ({
              label: i.label,
              route: i.route,
              section: i.section,
              icon: i.icon,
            })),
        }))
      );
    } catch {
      this.sections.set([]);
      this.permissions.set([]);
    } finally {
      this.loaded.set(true);
    }
  }

  hasPermission(code: string): boolean {
    return this.permissions().includes(code);
  }

  reset(): void {
    this.loaded.set(false);
    this.sections.set([]);
    this.permissions.set([]);
  }
}
