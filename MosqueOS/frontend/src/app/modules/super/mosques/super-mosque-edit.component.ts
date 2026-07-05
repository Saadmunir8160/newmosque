import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PlatformService, PlatformUser } from '../../../core/services/platform.service';
import { Mosque } from '../../../core/models';
import { formatMosqueStatus, statusClass } from '../../../core/utils/mosque-status.util';
import {
  MosqueSeedFormComponent,
  MosqueSeedSavedEvent,
} from './mosque-seed-form.component';

@Component({
  selector: 'app-super-mosque-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, MosqueSeedFormComponent],
  templateUrl: './super-mosque-edit.component.html',
  styleUrls: ['./mosque-profile.shared.css', './super-mosque-edit.component.css'],
})
export class SuperMosqueEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platform = inject(PlatformService);

  mosque = signal<Mosque | null>(null);
  users = signal<PlatformUser[]>([]);
  loading = signal(true);
  error = signal('');
  toast = signal('');
  readonly formatStatus = formatMosqueStatus;
  readonly statusClass = statusClass;

  ngOnInit(): void {
    this.route.paramMap.subscribe(p => {
      const id = Number(p.get('id'));
      if (!Number.isFinite(id)) {
        this.error.set('Invalid mosque id.');
        this.loading.set(false);
        return;
      }
      this.load(id);
    });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set('');
    this.mosque.set(null);

    forkJoin({
      detail: this.platform.getMosqueDetail(id),
      users: this.platform.getUsers(),
    }).subscribe({
      next: ({ detail, users }) => {
        this.mosque.set(detail.mosque);
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load mosque.');
        this.loading.set(false);
      },
    });
  }

  onSaved(event: MosqueSeedSavedEvent): void {
    this.toast.set('Mosque updated successfully.');
    if (event.uploadWarning) {
      setTimeout(() => this.toast.set(event.uploadWarning!), 600);
    }
    setTimeout(() => {
      void this.router.navigate(['/dashboard/super/mosques', event.mosque.id]);
    }, event.uploadWarning ? 1200 : 400);
  }

  onCancel(): void {
    const m = this.mosque();
    if (m) {
      void this.router.navigate(['/dashboard/super/mosques', m.id]);
      return;
    }
    void this.router.navigate(['/dashboard/super/mosques']);
  }
}
