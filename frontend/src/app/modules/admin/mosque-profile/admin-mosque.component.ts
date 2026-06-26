import { Component, OnInit, inject, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { AuthService } from '../../../core/auth/auth.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { ROLES } from '../../../core/constants/roles';
import { Mosque } from '../../../core/models';
import { MosqueLeadership } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-mosque',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header *ngIf="!hideHeader" [useAuthRole]="true" title="Mosque Profile" subtitle="Edit mosque details and public information" />

    <div *ngIf="isOwner() && ownerChecked() && !mosque()" class="admin-empty mb-4">
      <p class="admin-empty-title">No mosque linked yet</p>
      <p class="admin-empty-desc">Contact your super admin to link your account to a mosque.</p>
    </div>

    <div *ngIf="!canEdit() && mosque()" class="admin-empty mb-4">
      <p class="admin-empty-title">Editing locked</p>
      <p class="admin-empty-desc">{{ editLockMessage() }}</p>
    </div>

    <app-card *ngIf="mosque() as m">
      <div class="sections" [class.sections--locked]="!canEdit()">
        <section class="form-section" *ngIf="showSection('basic')">
          <h3 class="section-title">Basic Info</h3>
          <div class="grid md:grid-cols-2 gap-3">
            <label class="field">
              <span>Name *</span>
              <input class="input" [(ngModel)]="m.name" placeholder="Masjid Al-Noor" [disabled]="!canEdit()">
            </label>
            <label class="field">
              <span>City *</span>
              <input class="input" [(ngModel)]="m.city" placeholder="Bradford" [disabled]="!canEdit()">
            </label>
            <label class="field md:col-span-2">
              <span>Description</span>
              <textarea class="input" rows="3" [(ngModel)]="m.description" placeholder="About this mosque…" [disabled]="!canEdit()"></textarea>
            </label>
          </div>
        </section>

        <section class="form-section" *ngIf="showSection('address')">
          <h3 class="section-title">Address</h3>
          <div class="grid md:grid-cols-2 gap-3">
            <label class="field md:col-span-2">
              <span>Street address</span>
              <input class="input" [(ngModel)]="m.address" placeholder="12 Manningham Lane" [disabled]="!canEdit()">
            </label>
            <label class="field">
              <span>Postcode</span>
              <input class="input" [(ngModel)]="m.postcode" placeholder="BD1 3EA" [disabled]="!canEdit()">
            </label>
            <label class="field">
              <span>Country</span>
              <input class="input" [(ngModel)]="m.country" placeholder="United Kingdom" [disabled]="!canEdit()">
            </label>
          </div>
        </section>

        <section class="form-section" *ngIf="showSection('contact')">
          <h3 class="section-title">Contact</h3>
          <div class="grid md:grid-cols-2 gap-3">
            <label class="field">
              <span>Phone</span>
              <input class="input" [(ngModel)]="m.phone" placeholder="+44 1274 555000" [disabled]="!canEdit()">
            </label>
            <label class="field">
              <span>Email</span>
              <input class="input" type="email" [(ngModel)]="m.email" placeholder="info@mosque.org" [disabled]="!canEdit()">
            </label>
            <label class="field md:col-span-2">
              <span>Website</span>
              <input class="input" [(ngModel)]="m.website" placeholder="https://…" [disabled]="!canEdit()">
            </label>
          </div>
        </section>

        <section class="form-section" *ngIf="showSection('social')">
          <h3 class="section-title">Social Links</h3>
          <div class="grid md:grid-cols-2 gap-3">
            <label class="field">
              <span>Facebook</span>
              <input class="input" [(ngModel)]="m.facebookUrl" placeholder="https://facebook.com/…" [disabled]="!canEdit()">
            </label>
            <label class="field">
              <span>Instagram</span>
              <input class="input" [(ngModel)]="m.instagramUrl" placeholder="https://instagram.com/…" [disabled]="!canEdit()">
            </label>
            <label class="field">
              <span>YouTube</span>
              <input class="input" [(ngModel)]="m.youtubeUrl" placeholder="https://youtube.com/…" [disabled]="!canEdit()">
            </label>
            <label class="field">
              <span>Twitter / X</span>
              <input class="input" [(ngModel)]="m.twitterUrl" placeholder="https://x.com/…" [disabled]="!canEdit()">
            </label>
          </div>
        </section>

        <section class="form-section" *ngIf="showSection('location')">
          <h3 class="section-title">Location</h3>
          <div class="grid md:grid-cols-2 gap-3">
            <label class="field md:col-span-2">
              <span>Map link or embed URL</span>
              <input class="input" [(ngModel)]="m.mapLocation" placeholder="https://maps.google.com/…" [disabled]="!canEdit()">
            </label>
            <label class="field">
              <span>Latitude</span>
              <input class="input" type="number" step="any" [(ngModel)]="m.latitude" placeholder="53.7960" [disabled]="!canEdit()">
            </label>
            <label class="field">
              <span>Longitude</span>
              <input class="input" type="number" step="any" [(ngModel)]="m.longitude" placeholder="-1.7594" [disabled]="!canEdit()">
            </label>
            <label class="field md:col-span-2">
              <span>Timezone</span>
              <input class="input" [(ngModel)]="m.timezone" placeholder="Europe/London" [disabled]="!canEdit()">
            </label>
          </div>
        </section>

        <section class="form-section" *ngIf="showSection('media')">
          <h3 class="section-title">Logo &amp; Banner</h3>
          <div class="media-grid">
            <div class="media-card">
              <p class="media-label">Logo</p>
              <img *ngIf="m.logoUrl" [src]="mediaUrl(m.logoUrl)" alt="Mosque logo" class="media-preview">
              <input type="file" accept="image/*" (change)="onFile($event, m, 'logo')" [disabled]="!canEdit()">
            </div>
            <div class="media-card">
              <p class="media-label">Banner</p>
              <img *ngIf="m.bannerUrl" [src]="mediaUrl(m.bannerUrl)" alt="Mosque banner" class="media-preview media-preview--banner">
              <input type="file" accept="image/*" (change)="onFile($event, m, 'banner')" [disabled]="!canEdit()">
            </div>
          </div>
        </section>

        <section class="form-section" *ngIf="showSection('profile')">
          <h3 class="section-title">Public Profile</h3>
          <div class="grid md:grid-cols-2 gap-3">
            <label class="field">
              <span>Established year</span>
              <input class="input" type="number" [(ngModel)]="m.establishedYear" [disabled]="!canEdit()">
            </label>
            <label class="field">
              <span>Capacity</span>
              <input class="input" type="number" [(ngModel)]="m.capacity" [disabled]="!canEdit()">
            </label>
            <label class="field md:col-span-2">
              <span>Vision</span>
              <textarea class="input" rows="2" [(ngModel)]="m.vision" [disabled]="!canEdit()"></textarea>
            </label>
            <label class="field md:col-span-2">
              <span>History</span>
              <textarea class="input" rows="3" [(ngModel)]="m.history" [disabled]="!canEdit()"></textarea>
            </label>
            <label class="field md:col-span-2">
              <span>Parking info</span>
              <textarea class="input" rows="2" [(ngModel)]="m.parkingInfo" [disabled]="!canEdit()"></textarea>
            </label>
            <label class="field md:col-span-2">
              <span>Services (comma-separated keys)</span>
              <input class="input" [ngModel]="(m.services || []).join(', ')" (ngModelChange)="setServices(m, $event)" [disabled]="!canEdit()" placeholder="DailyPrayers, Jumuah, QuranClasses">
            </label>
          </div>
        </section>

        <section class="form-section" *ngIf="showSection('gallery')">
          <h3 class="section-title">Gallery</h3>
          <p class="hint">Add image URLs (one per line) or upload photos.</p>
          <textarea class="input" rows="4" [ngModel]="(m.gallery || []).join('\n')" (ngModelChange)="setGallery(m, $event)" [disabled]="!canEdit()"></textarea>
          <input type="file" accept="image/*" multiple (change)="onGalleryFiles($event, m)" [disabled]="!canEdit()">
        </section>

        <section class="form-section" *ngIf="showSection('leadership')">
          <h3 class="section-title">Leadership</h3>
          <div *ngFor="let leader of leadership(); let i = index" class="leader-row">
            <input class="input" [(ngModel)]="leader.name" placeholder="Name" [disabled]="!canEdit()">
            <input class="input" [(ngModel)]="leader.role" placeholder="Role" [disabled]="!canEdit()">
            <input class="input" [(ngModel)]="leader.photoUrl" placeholder="Photo URL" [disabled]="!canEdit()">
            <textarea class="input" rows="2" [(ngModel)]="leader.bio" placeholder="Bio" [disabled]="!canEdit()"></textarea>
            <button type="button" class="btn-sm" (click)="removeLeader(i)" [disabled]="!canEdit()">Remove</button>
          </div>
          <button type="button" class="btn-sm mt-2" (click)="addLeader()" [disabled]="!canEdit()">+ Add leader</button>
        </section>
      </div>

      <button class="btn mt-4" [disabled]="!canEdit() || saving()" (click)="save(m)">
        {{ saving() ? 'Saving…' : 'Save Changes' }}
      </button>
      <p *ngIf="msg()" class="text-mos-muted text-sm mt-2" [class.text-red-400]="msgError()">{{ msg() }}</p>
    </app-card>
  `,
  styles: [`
    .sections--locked { opacity: 0.55; pointer-events: none; }
    .form-section { margin-bottom: 1.5rem; padding-bottom: 1.25rem; border-bottom: 1px solid rgba(248,250,252,0.08); }
    .section-title { font-size: 0.8125rem; font-weight: 700; color: #fbbf24; margin: 0 0 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .field { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.75rem; color: #94a3b8; }
    .input { background: #0F172A; border: 1px solid #334155; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }
    .input:disabled { opacity: 0.6; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .preview-link { display: inline-block; margin-bottom: 1rem; font-size: 0.8125rem; font-weight: 600; color: #fbbf24; text-decoration: none; }
    .preview-link:hover { text-decoration: underline; }
    .media-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
    .media-card { background: #0b1220; border: 1px solid #334155; border-radius: 10px; padding: 0.75rem; }
    .media-label { font-size: 0.75rem; color: #94a3b8; margin: 0 0 0.5rem; }
    .media-preview { width: 100%; max-height: 80px; object-fit: contain; border-radius: 6px; margin-bottom: 0.5rem; background: #111827; }
    .media-preview--banner { max-height: 100px; object-fit: cover; }
    .hint { font-size: 0.75rem; color: #94a3b8; margin: 0 0 0.5rem; }
    .leader-row { display: grid; gap: 0.5rem; margin-bottom: 1rem; padding: 0.75rem; border: 1px solid #334155; border-radius: 8px; }
    .btn-sm { background: #334155; color: #fff; border: none; border-radius: 6px; padding: 6px 12px; font-size: 0.75rem; cursor: pointer; }
    .btn-sm:disabled { opacity: 0.5; }
  `]
})
export class AdminMosqueComponent implements OnInit {
  @Input() hideHeader = false;
  @Input() mode: 'full' | 'profile' | 'settings' = 'full';
  private admin = inject(AdminService);
  private mosqueService = inject(MosqueService);
  private auth = inject(AuthService);
  private mosqueCtx = inject(MosqueContextService);
  private route = inject(ActivatedRoute);
  private apiOrigin = environment.apiUrl.replace(/\/api\/v1\/?$/, '');

  mosque = signal<Mosque | null>(null);
  ownerChecked = signal(false);
  leadership = signal<MosqueLeadership[]>([]);
  msg = signal('');
  msgError = signal(false);
  saving = signal(false);
  isOwner = computed(() => this.auth.hasRole(ROLES.MosqueOwner) && !this.auth.isSuperAdmin());
  isMosqueAdminOwner = computed(() =>
    this.auth.hasRole(ROLES.MosqueAdmin) && !this.auth.isSuperAdmin() && !this.auth.hasRole(ROLES.MosqueOwner));
  canEdit = computed(() => {
    const m = this.mosque();
    if (!m) return false;
    if (this.auth.isSuperAdmin()) return true;
    if (m.status !== 'Active') return false;
    const uid = this.auth.user()?.id;
    if (this.isOwner()) {
      return !!uid && m.ownerId === uid;
    }
    if (this.isMosqueAdminOwner()) {
      return this.auth.user()?.homeMosqueId === m.id;
    }
    return true;
  });

  editLockMessage = computed(() => {
    const m = this.mosque();
    if (!m) return 'Load your mosque profile to continue.';
    if (this.canEdit()) return '';
    if (m.status === 'ClaimPending') {
      return 'Your ownership claim is awaiting super admin review. You can edit after approval.';
    }
    if (m.status === 'Unclaimed') {
      return 'Claim this mosque before editing the profile.';
    }
    if (m.status === 'Claimed') {
      return 'Your claim was approved. The mosque will be editable once it is activated (Active status).';
    }
    return 'Your mosque must be active before you can edit the profile.';
  });

  showSection(section: 'basic' | 'address' | 'contact' | 'social' | 'location' | 'media' | 'profile' | 'gallery' | 'leadership'): boolean {
    if (this.mode === 'full') return true;
    if (this.mode === 'profile') {
      return section === 'basic' || section === 'address' || section === 'contact' || section === 'media'
        || section === 'profile' || section === 'gallery' || section === 'leadership';
    }
    return section === 'social' || section === 'location';
  }

  private hydrateMosque(m: Mosque): void {
    this.mosqueService.getById(m.id).subscribe({
      next: (profile) => {
        this.mosque.set({ ...m, ...profile });
        this.leadership.set(profile.leadership ?? []);
      },
      error: () => this.mosque.set(m),
    });
  }

  ngOnInit(): void {
    const mosqueId = Number(this.route.snapshot.queryParamMap.get('mosqueId'));
    if (this.auth.isSuperAdmin() && Number.isFinite(mosqueId) && mosqueId > 0) {
      this.mosqueService.getById(mosqueId).subscribe({
        next: (m) => this.hydrateMosque(m),
        error: () => this.ownerChecked.set(true),
      });
      return;
    }

    if (this.isOwner() || this.isMosqueAdminOwner()) {
      this.admin.getOwnerMosque().subscribe(res => {
        if (res.mosque) this.hydrateMosque(res.mosque);
        this.ownerChecked.set(true);
      });
      return;
    }
    this.mosqueCtx.resolve().then(async () => {
      if (this.mosqueCtx.mosque()) {
        this.hydrateMosque(this.mosqueCtx.mosque()!);
        return;
      }
      this.admin.getOwnerMosque().subscribe(res => {
        if (res.mosque) this.hydrateMosque(res.mosque);
        else this.mosqueService.getBySlug(environment.defaultMosqueSlug).subscribe(m => this.hydrateMosque(m));
      });
    });
  }

  setGallery(m: Mosque, text: string): void {
    m.gallery = text.split('\n').map(s => s.trim()).filter(Boolean);
  }

  setServices(m: Mosque, text: string): void {
    m.services = text.split(',').map(s => s.trim()).filter(Boolean);
  }

  addLeader(): void {
    this.leadership.update(list => [...list, { name: '', role: '' }]);
  }

  removeLeader(i: number): void {
    this.leadership.update(list => list.filter((_, idx) => idx !== i));
  }

  save(m: Mosque): void {
    if (!this.canEdit() || this.saving()) return;
    if (!m.name?.trim() || m.name.trim().length < 3) {
      this.msg.set('Name must be at least 3 characters.');
      this.msgError.set(true);
      return;
    }
    if (!m.city?.trim()) {
      this.msg.set('City is required.');
      this.msgError.set(true);
      return;
    }
    this.saving.set(true);
    const payload = { ...m, leadership: this.leadership() };
    this.admin.updateMosque(m.id, payload).subscribe({
      next: () => {
        this.msg.set('Mosque profile updated successfully.');
        this.msgError.set(false);
        this.saving.set(false);
      },
      error: () => {
        this.msg.set('Update failed — check phone/email format.');
        this.msgError.set(true);
        this.saving.set(false);
      }
    });
  }

  onGalleryFiles(event: Event, m: Mosque): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length || !this.canEdit()) return;
    for (const file of Array.from(files)) {
      this.admin.uploadMosqueImage(m.id, file, 'banner').subscribe({
        next: (res) => {
          m.gallery = [...(m.gallery ?? []), res.url];
          this.mosque.set({ ...m });
        }
      });
    }
    input.value = '';
  }

  mediaUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.apiOrigin}${path}`;
  }

  onFile(event: Event, m: Mosque, field: 'logo' | 'banner'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.canEdit()) return;
    this.admin.uploadMosqueImage(m.id, file, field).subscribe({
      next: (res) => {
        if (field === 'logo') m.logoUrl = res.url;
        else m.bannerUrl = res.url;
        this.msg.set(`${field === 'logo' ? 'Logo' : 'Banner'} uploaded.`);
        this.msgError.set(false);
      },
      error: () => {
        this.msg.set('Image upload failed.');
        this.msgError.set(true);
      }
    });
    input.value = '';
  }
}
