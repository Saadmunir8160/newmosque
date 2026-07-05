import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { PlatformService, MosqueDetailResponse, PendingOwnershipClaim } from '../../../core/services/platform.service';
import { ROLES } from '../../../core/constants/roles';
import { formatMosqueStatus, isMosquePubliclyVisible, statusClass } from '../../../core/utils/mosque-status.util';
import { MosqueProfileCompleteness } from '../../../core/utils/mosque-profile.util';
import { slugifyMosqueName } from '../../../core/utils/mosque-slug.util';
import { Mosque } from '../../../core/models';

@Component({
  selector: 'app-super-mosque-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './super-mosque-detail.component.html',
  styleUrls: ['./mosque-profile.shared.css'],
})
export class SuperMosqueDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private platform = inject(PlatformService);

  detail = signal<MosqueDetailResponse | null>(null);
  loading = signal(false);
  error = signal('');
  inviteEmail = signal('');
  inviteName = signal('');
  inviting = signal(false);
  inviteMsg = signal('');
  lastInviteLink = signal('');
  readonly formatStatus = formatMosqueStatus;
  readonly statusClass = statusClass;
  readonly isPublicVisible = isMosquePubliclyVisible;

  profileCompleteness = computed(() => {
    const m = this.detail()?.mosque;
    return m ? MosqueProfileCompleteness.calculate(m) : 0;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(p => {
      const id = Number(p.get('id'));
      if (!Number.isFinite(id)) {
        this.error.set('Invalid mosque id.');
        return;
      }
      this.load(id);
    });
  }

  completenessHint(): string {
    const pct = this.profileCompleteness();
    if (pct >= 80) return 'Profile is well filled out.';
    if (pct >= 50) return 'Add more contact and media details.';
    return 'Profile needs more information before going live.';
  }

  load(id: number): void {
    this.loading.set(true);
    this.error.set('');
    this.platform.getMosqueDetail(id).subscribe({
      next: (raw) => {
        this.detail.set(this.normalizeDetail(raw as MosqueDetailResponse & { pendingClaim?: Record<string, unknown> | null }));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load mosque.');
        this.loading.set(false);
      },
    });
  }

  activate(id: number): void {
    this.platform.activateMosque(id).subscribe({
      next: () => this.load(id),
      error: (err) => this.error.set(err?.error?.message ?? 'Activation failed.'),
    });
  }

  deactivate(id: number): void {
    this.platform.deactivateMosque(id).subscribe({
      next: () => this.load(id),
      error: (err) => this.error.set(err?.error?.message ?? 'Deactivation failed.'),
    });
  }

  canInviteOwner(status: string): boolean {
    return status === 'Unclaimed' || status === 'Invited';
  }

  sendInvite(mosqueId: number): void {
    const email = this.inviteEmail().trim();
    if (!email) {
      this.inviteMsg.set('Enter an email address.');
      return;
    }
    this.inviting.set(true);
    this.inviteMsg.set('');
    this.platform.sendMosqueInvite(mosqueId, {
      email,
      name: this.inviteName().trim() || undefined,
      role: ROLES.MosqueOwner,
    }).subscribe({
      next: (res) => {
        this.inviting.set(false);
        this.inviteMsg.set(res.message || 'Invitation sent.');
        if (res.acceptLink) {
          this.lastInviteLink.set(res.acceptLink);
          void navigator.clipboard?.writeText(res.acceptLink);
        }
        this.load(mosqueId);
      },
      error: (err) => {
        this.inviting.set(false);
        this.inviteMsg.set(err?.error?.message ?? 'Could not send invitation.');
      },
    });
  }

  resolvePublicSlug(mosque: Mosque): string {
    const slug = mosque.slug?.trim();
    if (slug) return slug;
    return slugifyMosqueName(mosque.name ?? '') || `mosque-${mosque.id}`;
  }

  publicPreviewQuery(mosque: Mosque): Record<string, string> {
    return { preview: 'admin', mosqueId: String(mosque.id) };
  }

  claimLabel(c: PendingOwnershipClaim & { applicantName?: string }): string {
    return c.claimantName || c.applicantName || 'Claimant';
  }

  private normalizeDetail(raw: MosqueDetailResponse & { pendingClaim?: Record<string, unknown> | null }): MosqueDetailResponse {
    const pc = raw.pendingClaim;
    if (!pc) return raw;
    const claimId = Number(pc['claimId'] ?? pc['ClaimId'] ?? 0);
    return {
      ...raw,
      pendingClaim: {
        claimId,
        claimReference: String(pc['claimReference'] ?? pc['ClaimReference'] ?? ''),
        mosqueId: Number(pc['mosqueId'] ?? pc['MosqueId'] ?? raw.mosque.id),
        mosqueName: String(pc['mosqueName'] ?? pc['MosqueName'] ?? raw.mosque.name),
        city: String(pc['city'] ?? pc['City'] ?? raw.mosque.city),
        slug: String(pc['slug'] ?? pc['Slug'] ?? raw.mosque.slug),
        claimantId: String(pc['applicantUserId'] ?? pc['ApplicantUserId'] ?? ''),
        claimantName: String(pc['applicantName'] ?? pc['ApplicantName'] ?? ''),
        mosqueStatus: String(pc['mosqueStatus'] ?? pc['MosqueStatus'] ?? raw.mosque.status),
        submittedAt: String(pc['submittedDate'] ?? pc['SubmittedDate'] ?? ''),
      },
    };
  }
}
