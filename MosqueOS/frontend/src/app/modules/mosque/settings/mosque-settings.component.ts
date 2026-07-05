import { Component, OnInit, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { AdminService } from '../../../core/services/admin.service';

import { CardComponent } from '../../../shared/ui/card.component';

import { AdminSettingsComponent } from '../../admin/settings/admin-settings.component';

import { Mosque } from '../../../core/models';

import { formatMosqueStatus } from '../../../core/utils/mosque-status.util';



@Component({

  selector: 'app-mosque-settings',

  standalone: true,

  imports: [CommonModule, FormsModule, CardComponent, AdminSettingsComponent],

  template: `

    <app-card *ngIf="mosque() as m">

      <section class="form-section">

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

        </div>

      </section>



      <section class="form-section">

        <h3 class="section-title">Timezone</h3>

        <label class="field">

          <span>Timezone</span>

          <input class="input" [(ngModel)]="m.timezone" placeholder="Europe/London" [disabled]="!canEdit()">

        </label>

      </section>



      <section class="form-section">

        <h3 class="section-title">Read-only</h3>

        <div class="readonly-grid">

          <div class="readonly-item">

            <span class="readonly-label">Status</span>

            <span class="readonly-value">{{ formatStatus(m.status) }}</span>

          </div>

          <div class="readonly-item">

            <span class="readonly-label">Owner ID</span>

            <span class="readonly-value readonly-value--mono">{{ m.ownerId || '—' }}</span>

          </div>

        </div>

      </section>



      <button class="btn mt-4" [disabled]="!canEdit() || saving()" (click)="save(m)">

        {{ saving() ? 'Saving…' : 'Save Settings' }}

      </button>

      <p *ngIf="msg()" class="text-mos-muted text-sm mt-2" [class.text-red-400]="msgError()">{{ msg() }}</p>

    </app-card>



    <section class="module-settings mt-6">

      <h3 class="section-title">Module Features</h3>

      <p class="section-desc">Enable or disable modules for your mosque. Disabled modules are hidden on the public profile.</p>

      <app-admin-settings [hideHeader]="true" />

    </section>

  `,

  styles: [`

    .form-section { margin-bottom: 1.5rem; padding-bottom: 1.25rem; border-bottom: 1px solid rgba(248,250,252,0.08); }

    .section-title { font-size: 0.8125rem; font-weight: 700; color: #fbbf24; margin: 0 0 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }

    .section-desc { font-size: 0.8125rem; color: #94a3b8; margin: 0 0 1rem; }

    .field { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.75rem; color: #94a3b8; }

    .input { background: #0F172A; border: 1px solid #334155; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }

    .input:disabled { opacity: 0.6; }

    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; }

    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .readonly-grid { display: grid; gap: 0.75rem; }

    .readonly-item { display: flex; flex-direction: column; gap: 0.25rem; }

    .readonly-label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }

    .readonly-value { font-size: 0.875rem; color: #f8fafc; }

    .readonly-value--mono { font-family: ui-monospace, monospace; font-size: 0.75rem; word-break: break-all; }

    .module-settings .section-title { margin-bottom: 0.35rem; }

  `]

})

export class MosqueSettingsComponent implements OnInit {

  private admin = inject(AdminService);

  mosque = signal<Mosque | null>(null);

  msg = signal('');

  msgError = signal(false);

  saving = signal(false);

  formatStatus = formatMosqueStatus;



  canEdit(): boolean {

    const m = this.mosque();

    if (!m) return false;

    return m.status === 'ClaimPending' || m.status === 'Claimed' || m.status === 'Active';

  }



  ngOnInit(): void {

    this.admin.getOwnerMosque().subscribe(res => this.mosque.set(res.mosque));

  }



  save(m: Mosque): void {

    if (!this.canEdit() || this.saving()) return;

    this.saving.set(true);

    this.admin.updateMosque(m.id, m).subscribe({

      next: () => {

        this.msg.set('Settings saved.');

        this.msgError.set(false);

        this.saving.set(false);

      },

      error: () => {

        this.msg.set('Save failed.');

        this.msgError.set(true);

        this.saving.set(false);

      }

    });

  }

}

