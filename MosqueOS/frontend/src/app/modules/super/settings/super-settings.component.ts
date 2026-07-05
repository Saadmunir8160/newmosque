import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ContentService } from '../../../core/services/content.service';
import { PlatformService } from '../../../core/services/platform.service';
import { environment } from '../../../../environments/environment';

interface SocialProviders {
  google?: boolean;
  facebook?: boolean;
  devMode?: boolean;
}

@Component({
  selector: 'app-super-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './super-settings.component.html',
  styleUrl: './super-settings.component.css',
})
export class SuperSettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private content = inject(ContentService);
  private platform = inject(PlatformService);

  apiUrl = environment.apiUrl;
  defaultMosqueId = environment.defaultMosqueId;
  providers = signal<SocialProviders | null>(null);
  baAlawiCollections = signal<{ name: string }[]>([]);
  shadhiliCollections = signal<{ name: string }[]>([]);
  baAlawiDefault = '';
  shadhiliDefault = '';
  bannerText = '';
  loading = signal(true);
  savingMap = signal(false);
  savingBanner = signal(false);
  toast = signal('');
  toastOk = signal(true);

  ngOnInit(): void {
    this.content.getCollections().subscribe({
      next: list => {
        this.baAlawiCollections.set(list.filter(c => c.tariqa === 'BaAlawi'));
        this.shadhiliCollections.set(list.filter(c => c.tariqa === 'Shadhili'));
      },
    });
    this.http.get<SocialProviders>(`${environment.apiUrl}/auth/external/providers`).subscribe({
      next: p => this.providers.set(p),
      error: () => this.providers.set({ google: false, facebook: false, devMode: false }),
    });
    this.platform.getPlatformSettings().subscribe({
      next: s => {
        this.baAlawiDefault = s.baAlawiDefault;
        this.shadhiliDefault = s.shadhiliDefault;
        this.bannerText = s.globalBanner;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showToast('Could not load platform settings.', false);
      },
    });
  }

  saveTariqaMapping(): void {
    this.savingMap.set(true);
    this.platform.saveTariqaMapping(this.baAlawiDefault, this.shadhiliDefault).subscribe({
      next: () => {
        this.savingMap.set(false);
        this.showToast('Tariqa mapping saved to database.', true);
      },
      error: () => {
        this.savingMap.set(false);
        this.showToast('Could not save tariqa mapping.', false);
      },
    });
  }

  saveBanner(): void {
    this.savingBanner.set(true);
    this.platform.saveGlobalBanner(this.bannerText).subscribe({
      next: () => {
        this.savingBanner.set(false);
        this.showToast('Global banner saved.', true);
      },
      error: () => {
        this.savingBanner.set(false);
        this.showToast('Could not save banner.', false);
      },
    });
  }

  private showToast(msg: string, ok: boolean): void {
    this.toastOk.set(ok);
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3200);
  }
}
