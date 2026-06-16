import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { ContentService } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-member-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Personalisation" title="My Preferences"
      subtitle="Tariqa path, level, display mode — tailor your spiritual experience." />

    <div class="pref-layout">
      <section class="pref-card">
        <div class="pref-card__head">
          <span class="pref-icon">⚙️</span>
          <div>
            <h3 class="pref-card__title">Spiritual profile</h3>
            <p class="pref-card__sub">These settings personalise wird, duas and content</p>
          </div>
        </div>

        <div class="pref-section">
          <span class="pref-label">Tariqa path</span>
          <div class="chips">
            <button type="button" class="chip" [class.chip--on]="tariqa === 'General'"
              (click)="tariqa = 'General'">General</button>
            <button type="button" class="chip" [class.chip--on]="tariqa === 'BaAlawi'"
              (click)="tariqa = 'BaAlawi'">Ba'Alawi</button>
            <button type="button" class="chip" [class.chip--on]="tariqa === 'Shadhili'"
              (click)="tariqa = 'Shadhili'">Shadhili</button>
          </div>
        </div>

        <div class="pref-section">
          <span class="pref-label">Level</span>
          <div class="chips">
            <button type="button" class="chip" [class.chip--on]="level === 'Beginner'"
              (click)="level = 'Beginner'">Beginner</button>
            <button type="button" class="chip" [class.chip--on]="level === 'Regular'"
              (click)="level = 'Regular'">Regular</button>
            <button type="button" class="chip" [class.chip--on]="level === 'Advanced'"
              (click)="level = 'Advanced'">Advanced</button>
          </div>
        </div>

        <div class="pref-section">
          <span class="pref-label">Wird mode</span>
          <div class="chips">
            <button type="button" class="chip" [class.chip--on]="wirdMode === 'Full'"
              (click)="wirdMode = 'Full'">Full</button>
            <button type="button" class="chip" [class.chip--on]="wirdMode === 'Quick'"
              (click)="wirdMode = 'Quick'">Quick</button>
          </div>
        </div>

        <div class="pref-section">
          <span class="pref-label">Display</span>
          <div class="chips chips--stack">
            <button type="button" class="chip chip--block" [class.chip--on]="display === 'ArabicOnly'"
              (click)="display = 'ArabicOnly'">Arabic only</button>
            <button type="button" class="chip chip--block" [class.chip--on]="display === 'ArabicTransliteration'"
              (click)="display = 'ArabicTransliteration'">Arabic + transliteration</button>
            <button type="button" class="chip chip--block" [class.chip--on]="display === 'ArabicTranslation'"
              (click)="display = 'ArabicTranslation'">Arabic + translation</button>
          </div>
        </div>

        <div class="pref-footer">
          <button type="button" class="btn-save" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save preferences' }}
          </button>
          <p *ngIf="msg()" class="pref-msg" [class.pref-msg--err]="msgErr()">{{ msg() }}</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .pref-layout { max-width: 32rem; }
    .pref-card {
      padding: 1.125rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.95), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.28); border-radius: 0.75rem;
      box-shadow: 0 10px 32px rgba(0,0,0,0.2);
    }
    .pref-card__head {
      display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.25rem;
      padding-bottom: 0.875rem; border-bottom: 1px solid rgba(212,175,55,0.12);
    }
    .pref-icon { font-size: 1.35rem; }
    .pref-card__title { margin: 0; font-size: 0.9375rem; font-weight: 700; color: #fff; }
    .pref-card__sub { margin: 0.15rem 0 0; font-size: 0.75rem; color: rgba(167,243,208,0.65); }

    .pref-section { margin-bottom: 1rem; }
    .pref-label {
      display: block; margin-bottom: 0.5rem; font-size: 0.625rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em; color: rgba(212,175,55,0.9);
    }
    .chips { display: flex; flex-wrap: wrap; gap: 0.375rem; }
    .chips--stack { flex-direction: column; }
    .chip {
      font-size: 0.75rem; font-weight: 600; color: rgba(167,243,208,0.9);
      background: rgba(0,0,0,0.3); border: 1px solid rgba(16,185,129,0.25);
      border-radius: 9999px; padding: 0.4rem 0.75rem; cursor: pointer; text-align: left;
    }
    .chip--block { border-radius: 0.5rem; width: 100%; }
    .chip--on {
      color: #022c22; background: linear-gradient(180deg, #fcd34d, #D4AF37);
      border-color: rgba(212,175,55,0.6);
    }

    .pref-footer { margin-top: 1.25rem; padding-top: 0.875rem; border-top: 1px solid rgba(212,175,55,0.1); }
    .btn-save {
      width: 100%; font-size: 0.8125rem; font-weight: 700; color: #022c22;
      background: linear-gradient(180deg, #fcd34d, #D4AF37); border: 1px solid rgba(212,175,55,0.6);
      border-radius: 0.5rem; padding: 0.65rem; cursor: pointer;
    }
    .btn-save:disabled { opacity: 0.55; cursor: not-allowed; }
    .pref-msg { margin: 0.5rem 0 0; font-size: 0.75rem; color: #6ee7b7; text-align: center; }
    .pref-msg--err { color: #fecaca; }
  `]
})
export class MemberPreferencesComponent {
  private auth = inject(AuthService);
  private content = inject(ContentService);
  msg = signal('');
  msgErr = signal(false);
  saving = signal(false);
  tariqa = this.auth.user()?.tariqa || 'General';
  level = this.auth.user()?.level || 'Beginner';
  wirdMode = this.auth.user()?.wirdMode || 'Full';
  display = this.auth.user()?.displayPreference || 'ArabicTranslation';

  save(): void {
    this.saving.set(true);
    this.msg.set('');
    this.content.updatePreferences({
      tariqa: this.tariqa, level: this.level, wirdMode: this.wirdMode, displayPreference: this.display
    }).subscribe({
      next: () => { this.saving.set(false); this.msgErr.set(false); this.msg.set('Preferences saved.'); },
      error: () => { this.saving.set(false); this.msgErr.set(true); this.msg.set('Could not save.'); },
    });
  }
}
