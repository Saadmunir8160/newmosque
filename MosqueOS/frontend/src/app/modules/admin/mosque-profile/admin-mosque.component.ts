import { Component, OnInit, inject, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Globe2,
  Image,
  Link,
  Lock,
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-angular';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { AuthService } from '../../../core/auth/auth.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { ROLES } from '../../../core/constants/roles';
import { Mosque, MosqueLeadership } from '../../../core/models';
import { environment } from '../../../../environments/environment';

type ProfileSectionId = 'basic' | 'address' | 'contact' | 'social' | 'location' | 'media' | 'profile' | 'gallery' | 'leadership';

interface ProfileSectionNavItem {
  id: ProfileSectionId;
  label: string;
  eyebrow: string;
  icon: string;
}

@Component({
  selector: 'app-admin-mosque',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageHeaderComponent,
    LucideAngularModule,
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
      AlertTriangle,
      Building2,
      CheckCircle2,
      Clock3,
      ExternalLink,
      FileText,
      Globe2,
      Image,
      Link,
      Lock,
      Mail,
      MapPin,
      Navigation,
      Phone,
      Plus,
      Save,
      Share2,
      ShieldCheck,
      Sparkles,
      Trash2,
      Upload,
      Users,
      }),
    },
  ],
  templateUrl: './admin-mosque.component.html',
  styleUrls: ['./admin-mosque.component.css'],
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
  activeSection = signal<ProfileSectionId>('basic');

  readonly sections: ProfileSectionNavItem[] = [
    { id: 'basic', label: 'Identity', eyebrow: 'Core profile', icon: 'building-2' },
    { id: 'address', label: 'Address', eyebrow: 'Directory data', icon: 'map-pin' },
    { id: 'contact', label: 'Contact', eyebrow: 'Channels', icon: 'phone' },
    { id: 'social', label: 'Social', eyebrow: 'Distribution', icon: 'share-2' },
    { id: 'location', label: 'Location', eyebrow: 'Maps', icon: 'navigation' },
    { id: 'media', label: 'Brand assets', eyebrow: 'Logo and banner', icon: 'image' },
    { id: 'profile', label: 'Public story', eyebrow: 'About page', icon: 'file-text' },
    { id: 'gallery', label: 'Gallery', eyebrow: 'Visual proof', icon: 'globe-2' },
    { id: 'leadership', label: 'Leadership', eyebrow: 'Team', icon: 'users' },
  ];

  visibleSections = computed(() => this.sections.filter(section => this.showSection(section.id)));
  isOwner = computed(() => this.auth.hasRole(ROLES.MosqueOwner) && !this.auth.isSuperAdmin());
  isMosqueAdminOwner = computed(() =>
    this.auth.hasRole(ROLES.MosqueAdmin) && !this.auth.isSuperAdmin() && !this.auth.hasRole(ROLES.MosqueOwner));

  profileCompletion = computed(() => {
    const m = this.mosque();
    if (!m) return 0;
    const values = [
      m.name,
      m.city,
      m.address,
      m.country,
      m.phone,
      m.email,
      m.website,
      m.description,
      m.logoUrl,
      m.bannerUrl,
      m.timezone,
      m.services?.length,
      m.gallery?.length,
      this.leadership().length,
    ];
    const completed = values.filter(value => {
      if (typeof value === 'number') return value > 0;
      return !!String(value ?? '').trim();
    }).length;
    return Math.round((completed / values.length) * 100);
  });

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
      // homeMosqueId may be null on first render (before /auth/me resolves);
      // fall back to mosqueCtx which is resolved before the component loads.
      const homeMosqueId = this.auth.user()?.homeMosqueId ?? this.mosqueCtx.mosqueId();
      return homeMosqueId === m.id;
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
      return 'Your claim was approved. The mosque will be editable once it is activated.';
    }
    return 'Your mosque must be active before you can edit the profile.';
  });

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
      const mosqueId = this.mosqueCtx.mosqueId();
      this.admin.getOwnerMosque(mosqueId > 0 ? mosqueId : undefined).subscribe(res => {
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

  showSection(section: ProfileSectionId): boolean {
    if (this.mode === 'full') return true;
    if (this.mode === 'profile') {
      return section === 'basic' || section === 'address' || section === 'contact' || section === 'media'
        || section === 'profile' || section === 'gallery' || section === 'leadership';
    }
    return section === 'social' || section === 'location';
  }

  setActiveSection(section: ProfileSectionId): void {
    this.activeSection.set(section);
  }

  sectionStatus(section: ProfileSectionId, m: Mosque): 'complete' | 'partial' {
    const fields = this.sectionFields(section, m);
    return fields.every(Boolean) ? 'complete' : 'partial';
  }

  sectionProgress(section: ProfileSectionId, m: Mosque): number {
    const fields = this.sectionFields(section, m);
    if (!fields.length) return 0;
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
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
        this.msg.set('Update failed. Check phone and email format.');
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
        this.mosque.set({ ...m });
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

  private hydrateMosque(m: Mosque): void {
    this.mosqueService.getById(m.id).subscribe({
      next: (profile) => {
        this.mosque.set({ ...m, ...profile });
        this.leadership.set(profile.leadership ?? []);
      },
      error: () => this.mosque.set(m),
    });
  }

  private sectionFields(section: ProfileSectionId, m: Mosque): boolean[] {
    const leaderCount = this.leadership().filter(leader => leader.name?.trim() && leader.role?.trim()).length;
    const bySection: Record<ProfileSectionId, boolean[]> = {
      basic: [!!m.name?.trim(), !!m.city?.trim(), !!m.shortDescription?.trim() || !!m.description?.trim()],
      address: [!!m.address?.trim(), !!m.postcode?.trim(), !!m.country?.trim()],
      contact: [!!m.phone?.trim(), !!m.email?.trim(), !!m.website?.trim()],
      social: [!!m.facebookUrl?.trim() || !!m.instagramUrl?.trim() || !!m.youtubeUrl?.trim() || !!m.twitterUrl?.trim()],
      location: [!!m.mapLocation?.trim() || (!!m.latitude && !!m.longitude), !!m.timezone?.trim()],
      media: [!!m.logoUrl?.trim(), !!m.bannerUrl?.trim()],
      profile: [!!m.description?.trim(), !!m.vision?.trim(), !!m.history?.trim(), !!m.services?.length],
      gallery: [!!m.gallery?.length],
      leadership: [leaderCount > 0],
    };
    return bySection[section];
  }
}
