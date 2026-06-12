import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { ContentService } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-member-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Personalisation" title="My Preferences" subtitle="Tariqa path, level, display mode (spec §4)" />
    <app-card>
      <label class="label">Tariqa Path</label>
      <select class="input mb-3" [(ngModel)]="tariqa">
        <option value="General">General</option><option value="BaAlawi">Ba'Alawi</option><option value="Shadhili">Shadhili</option>
      </select>
      <label class="label">Level</label>
      <select class="input mb-3" [(ngModel)]="level">
        <option value="Beginner">Beginner</option><option value="Regular">Regular</option><option value="Advanced">Advanced</option>
      </select>
      <label class="label">Wird Mode</label>
      <select class="input mb-3" [(ngModel)]="wirdMode">
        <option value="Full">Full</option><option value="Quick">Quick</option>
      </select>
      <label class="label">Display</label>
      <select class="input mb-3" [(ngModel)]="display">
        <option value="ArabicOnly">Arabic only</option>
        <option value="ArabicTransliteration">Arabic + transliteration</option>
        <option value="ArabicTranslation">Arabic + translation</option>
      </select>
      <button class="btn" (click)="save()">Save Preferences</button>
      <p *ngIf="msg()" class="text-emerald-300 text-sm mt-2">{{ msg() }}</p>
    </app-card>
  `,
  styles: [`.label{display:block;color:#6ee7b7;font-size:12px;margin-bottom:4px}.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:10px 20px;border-radius:8px;border:none;cursor:pointer}`]
})
export class MemberPreferencesComponent {
  private auth = inject(AuthService);
  private content = inject(ContentService);
  msg = signal('');
  tariqa = this.auth.user()?.tariqa || 'General';
  level = this.auth.user()?.level || 'Beginner';
  wirdMode = this.auth.user()?.wirdMode || 'Full';
  display = this.auth.user()?.displayPreference || 'ArabicTranslation';

  save(): void {
    this.content.updatePreferences({
      tariqa: this.tariqa, level: this.level, wirdMode: this.wirdMode, displayPreference: this.display
    }).subscribe({ next: () => this.msg.set('Saved.'), error: () => this.msg.set('Failed.') });
  }
}
