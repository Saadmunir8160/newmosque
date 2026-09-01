import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../core/services/admin.service';
import { PlatformService, PlatformDashboard } from '../../core/services/platform.service';
import { Mosque } from '../../core/models';
import { SuperAdminPageHeaderComponent } from '../../shared/ui/super-admin-page-header.component';

export interface ModuleHubDef {
  slug: string;
  title: string;
  subtitle: string;
  matIcon: string;
  featureKeys: string[];
  docHint: string;
}

const MODULE_DEFS: Record<string, ModuleHubDef> = {
  events: {
    slug: 'events',
    title: 'Events',
    subtitle: 'Platform oversight for mosque events across MOS.',
    matIcon: 'event',
    featureKeys: ['Events'],
    docHint: 'Create, publish, and monitor community events per mosque.',
  },
  madrassah: {
    slug: 'madrassah',
    title: 'Madrassah',
    subtitle: 'Classes, teachers, and student management oversight.',
    matIcon: 'school',
    featureKeys: ['Courses', 'VolunteerManagement'],
    docHint: 'Track which mosques have Madrassah enabled and class activity.',
  },
  communities: {
    slug: 'communities',
    title: 'Communities',
    subtitle: 'Spiritual circles and community groups across mosques.',
    matIcon: 'groups',
    featureKeys: ['CommunityServices'],
    docHint: 'Oversee community circles, membership, and participation.',
  },
  awrad: {
    slug: 'awrad',
    title: 'Awrad & Wird',
    subtitle: 'Wird collections and prayer-slot assignments.',
    matIcon: 'auto_stories',
    featureKeys: [],
    docHint: 'Content Editor builds collections; Super Admin monitors coverage.',
  },
  adhkar: {
    slug: 'adhkar',
    title: 'Daily Adhkar',
    subtitle: 'Morning and evening adhkar libraries platform-wide.',
    matIcon: 'wb_twilight',
    featureKeys: [],
    docHint: 'Monitor published daily adhkar content availability.',
  },
  duas: {
    slug: 'duas',
    title: 'Duas Library',
    subtitle: 'Dua collections and categories across mosques.',
    matIcon: 'menu_book',
    featureKeys: [],
    docHint: 'Oversee duas library publishing and mosque enablement.',
  },
  quran: {
    slug: 'quran',
    title: "Qur'an Reading",
    subtitle: 'Reading campaigns and portion tracking.',
    matIcon: 'import_contacts',
    featureKeys: [],
    docHint: "Track Qur'an reading campaigns and mosque participation.",
  },
  'ritual-guides': {
    slug: 'ritual-guides',
    title: 'Ritual Guides',
    subtitle: 'Wudu, ghusl, and salah step guides.',
    matIcon: 'water_drop',
    featureKeys: [],
    docHint: 'Monitor ritual guide publishing for guest and member portals.',
  },
  'death-readings': {
    slug: 'death-readings',
    title: 'Death Readings',
    subtitle: 'Community reading campaigns for the deceased.',
    matIcon: 'volunteer_activism',
    featureKeys: [],
    docHint: 'Oversee death-reading campaigns and progress monitoring.',
  },
  participation: {
    slug: 'participation',
    title: 'Community Participation',
    subtitle: 'Volunteer opportunities and registrations.',
    matIcon: 'handshake',
    featureKeys: ['VolunteerManagement', 'CommunityServices'],
    docHint: 'Track volunteer posts and community participation signals.',
  },
  'umrah-hajj': {
    slug: 'umrah-hajj',
    title: 'Umrah & Hajj',
    subtitle: 'Journey guides for Umrah and Hajj.',
    matIcon: 'flight_takeoff',
    featureKeys: [],
    docHint: 'Oversee Umrah & Hajj guide content across the platform.',
  },
};

@Component({
  selector: 'app-super-module-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, SuperAdminPageHeaderComponent],
  templateUrl: './super-module-hub.component.html',
  styleUrls: ['./claims/super-claims.component.css', './oversight/super-oversight.shared.css'],
})
export class SuperModuleHubComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private platform = inject(PlatformService);
  private admin = inject(AdminService);

  def = signal<ModuleHubDef | null>(null);
  dashboard = signal<PlatformDashboard | null>(null);
  mosques = signal<Mosque[]>([]);
  loading = signal(true);
  error = signal('');

  usageCount = computed(() => {
    const d = this.dashboard();
    const mod = this.def();
    if (!d || !mod) return 0;
    const usage = d.analytics?.featureUsage ?? [];
    const keys = new Set(mod.featureKeys.map(k => k.toLowerCase()));
    const byTitle = usage.find(u =>
      u.module.toLowerCase() === mod.title.toLowerCase()
      || keys.has(u.module.toLowerCase())
    );
    return byTitle?.count ?? usage.reduce((s, u) => s + (u.count || 0), 0);
  });

  contentHint = computed(() => {
    const d = this.dashboard();
    const slug = this.def()?.slug;
    if (!d?.content || !slug) return null;
    if (slug === 'events') return { label: 'Events logged', value: d.content.events };
    if (slug === 'ritual-guides' || slug === 'umrah-hajj') return { label: 'Guides', value: d.content.guides };
    if (slug === 'quran' || slug === 'death-readings') return { label: 'Campaigns', value: d.content.campaigns };
    return { label: 'Announcements', value: d.content.announcements };
  });

  activeMosques = computed(() => this.mosques().filter(m => m.status === 'Active').length);

  /** Mosques with matching module flag enabled (from embedded settings when present). */
  enabledMosqueCount = computed(() => {
    const keys = this.def()?.featureKeys ?? [];
    if (!keys.length) return null;
    const keySet = new Set(keys.map(k => k.toLowerCase()));
    return this.mosques().filter(m =>
      (m.settings ?? []).some(s => keySet.has(s.moduleKey.toLowerCase()) && s.isEnabled)
    ).length;
  });

  oversightLinks = computed(() => {
    const slug = this.def()?.slug;
    const links = [
      { label: 'Feature Flags', route: '/dashboard/super/features' },
      { label: 'All Mosques', route: '/dashboard/super/mosques' },
      { label: 'Usage Statistics', route: '/dashboard/super/reports/usage' },
    ];
    if (slug === 'events') {
      links.unshift({ label: 'Announcements oversight', route: '/dashboard/super/oversight/announcements' });
    }
    if (slug === 'death-readings' || slug === 'participation') {
      links.unshift({ label: 'Janaza oversight', route: '/dashboard/super/oversight/janaza' });
    }
    return links;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(p => {
      const slug = p.get('slug') || '';
      const found = MODULE_DEFS[slug] ?? null;
      this.def.set(found);
      if (!found) {
        this.error.set('Unknown module. Use the sidebar Modules list.');
        this.loading.set(false);
        return;
      }
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      dashboard: this.platform.getDashboard(),
      mosques: this.admin.getAllMosques(),
    }).subscribe({
      next: ({ dashboard, mosques }) => {
        this.dashboard.set(dashboard);
        this.mosques.set(mosques ?? []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Failed to load module oversight.');
        this.loading.set(false);
      },
    });
  }
}
