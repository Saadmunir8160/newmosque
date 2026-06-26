import { Component, OnInit, inject, signal } from '@angular/core';
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

    <div class="member-pref-layout">
      <section class="member-card">
        <div class="member-pref-head">
          <span class="member-pref-icon">⚙️</span>
          <div>
            <h3 class="member-title">Spiritual profile</h3>
            <p class="member-meta">These settings personalise wird, duas and content</p>
          </div>
        </div>

        <div class="member-pref-section">
          <span class="member-label">Tariqa path</span>
          <div class="member-chips">
            <button type="button" class="member-chip" [class.member-chip--on]="tariqa === 'General'"
              (click)="tariqa = 'General'">General</button>
            <button type="button" class="member-chip" [class.member-chip--on]="tariqa === 'BaAlawi'"
              (click)="tariqa = 'BaAlawi'">Ba'Alawi</button>
            <button type="button" class="member-chip" [class.member-chip--on]="tariqa === 'Shadhili'"
              (click)="tariqa = 'Shadhili'">Shadhili</button>
          </div>
        </div>

        <div class="member-pref-section">
          <span class="member-label">Level</span>
          <div class="member-chips">
            <button type="button" class="member-chip" [class.member-chip--on]="level === 'Beginner'"
              (click)="level = 'Beginner'">Beginner</button>
            <button type="button" class="member-chip" [class.member-chip--on]="level === 'Regular'"
              (click)="level = 'Regular'">Regular</button>
            <button type="button" class="member-chip" [class.member-chip--on]="level === 'Advanced'"
              (click)="level = 'Advanced'">Advanced</button>
          </div>
        </div>

        <div class="member-pref-section">
          <span class="member-label">Wird mode</span>
          <div class="member-chips">
            <button type="button" class="member-chip" [class.member-chip--on]="wirdMode === 'Full'"
              (click)="wirdMode = 'Full'">Full</button>
            <button type="button" class="member-chip" [class.member-chip--on]="wirdMode === 'Quick'"
              (click)="wirdMode = 'Quick'">Quick</button>
          </div>
        </div>

        <div class="member-pref-section">
          <span class="member-label">Display</span>
          <div class="member-chips member-chips--stack">
            <button type="button" class="member-chip member-chip--block" [class.member-chip--on]="display === 'ArabicOnly'"
              (click)="display = 'ArabicOnly'">Arabic only</button>
            <button type="button" class="member-chip member-chip--block" [class.member-chip--on]="display === 'ArabicTransliteration'"
              (click)="display = 'ArabicTransliteration'">Arabic + transliteration</button>
            <button type="button" class="member-chip member-chip--block" [class.member-chip--on]="display === 'ArabicTranslation'"
              (click)="display = 'ArabicTranslation'">Arabic + translation</button>
          </div>
        </div>

        <div class="member-pref-footer">
          <button type="button" class="member-btn-primary member-btn-primary--block" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save preferences' }}
          </button>
          <p *ngIf="msg()" class="member-toast" [class.member-toast--err]="msgErr()" style="margin-top: 0.5rem;">{{ msg() }}</p>
        </div>
      </section>
    </div>
  `,
})
export class MemberPreferencesComponent implements OnInit {
  private auth = inject(AuthService);
  private content = inject(ContentService);
  msg = signal('');
  msgErr = signal(false);
  saving = signal(false);
  tariqa = 'General';
  level = 'Beginner';
  wirdMode = 'Full';
  display = 'ArabicTranslation';

  ngOnInit(): void {
    const u = this.auth.user();
    if (u) {
      this.tariqa = u.tariqa || 'General';
      this.level = u.level || 'Beginner';
      this.wirdMode = u.wirdMode || 'Full';
      this.display = u.displayPreference || 'ArabicTranslation';
    }
  }

  save(): void {
    this.saving.set(true);
    this.msg.set('');
    this.content.updatePreferences({
      tariqa: this.tariqa, level: this.level, wirdMode: this.wirdMode, displayPreference: this.display
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.msgErr.set(false);
        this.msg.set('Preferences saved.');
        this.auth.refreshProfile();
      },
      error: () => { this.saving.set(false); this.msgErr.set(true); this.msg.set('Could not save.'); },
    });
  }
}
