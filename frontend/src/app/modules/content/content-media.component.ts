import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentEditorService, MediaAsset, MediaAssetType } from '../../core/services/content-editor.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-content-media',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <div class="media-dash">
      <app-page-header badge="Content Editor" title="Media Uploads"
        subtitle="Audio, images, and videos for Islamic content." />

      <section class="upload-panel">
        <label class="upload-zone" [class.upload-zone--busy]="uploading()">
          <input type="file" hidden (change)="onFile($event)" [disabled]="uploading()">
          <span class="upload-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </span>
          <span class="upload-title">{{ uploading() ? 'Uploading…' : 'Choose file to upload' }}</span>
          <span class="upload-hint">Audio, image, or video — max 50 MB</span>
        </label>

        <div class="type-chips" role="group" aria-label="Filter by media type">
          <button type="button" *ngFor="let t of types" class="chip"
            [class.chip--on]="filter === t" (click)="setFilter(t)">{{ t }}</button>
          <button type="button" class="chip" [class.chip--on]="!filter" (click)="setFilter('')">All</button>
        </div>
      </section>

      <div *ngIf="loading()" class="state-msg">
        <span class="pulse-dot"></span> Loading media…
      </div>

      <div class="grid" *ngIf="!loading() && assets().length">
        <article *ngFor="let m of assets()" class="media-card">
          <div class="preview" [attr.data-type]="m.mediaType">
            <img *ngIf="m.mediaType === 'Image'" [src]="url(m)" [alt]="m.originalFileName">
            <audio *ngIf="m.mediaType === 'Audio'" [src]="url(m)" controls></audio>
            <video *ngIf="m.mediaType === 'Video'" [src]="url(m)" controls></video>
          </div>
          <div class="meta">
            <span class="type-badge" [attr.data-type]="m.mediaType">{{ m.mediaType }}</span>
            <p class="name">{{ m.originalFileName }}</p>
            <p class="detail">{{ sizeLabel(m.sizeBytes) }}</p>
            <button type="button" class="del" (click)="remove(m.id)">Remove</button>
          </div>
        </article>
      </div>

      <p *ngIf="!loading() && !assets().length" class="empty-state">No media uploaded yet.</p>
    </div>
  `,
  styles: [`
    :host {
      --med-primary: var(--mos-primary, #0F4C3A);
      --med-gold: var(--mos-gold, #D4AF37);
      --med-bg: var(--mos-bg, #F8FAF9);
      --med-surface: var(--mos-surface, #FFFFFF);
      --med-text: var(--mos-text-primary, #0F172A);
      --med-muted: var(--mos-text-secondary, #64748B);
      --med-border: var(--mos-border, #E2E8F0);
      --med-radius: var(--mos-radius-card, 16px);
      --med-shadow: var(--mos-shadow-card);
      display: block;
    }

    :host ::ng-deep app-page-header .text-mos-primary {
      color: var(--med-primary) !important;
    }

    .media-dash { padding-bottom: 1.5rem; }

    .upload-panel {
      margin-bottom: 1.25rem;
      padding: 1rem;
      background: var(--med-surface);
      border: 1px solid var(--med-border);
      border-radius: var(--med-radius);
      box-shadow: var(--med-shadow);
    }

    .upload-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.375rem;
      padding: 1.75rem 1.25rem;
      border: 2px dashed rgba(15, 76, 58, 0.28);
      border-radius: 12px;
      background: linear-gradient(180deg, #F0FDFA 0%, var(--med-bg) 100%);
      color: var(--med-text);
      cursor: pointer;
      text-align: center;
      transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    }
    .upload-zone:hover {
      border-color: rgba(212, 175, 55, 0.55);
      background: linear-gradient(180deg, #FFFBEB 0%, #F0FDFA 100%);
      box-shadow: 0 0 0 4px rgba(15, 76, 58, 0.06);
    }
    .upload-zone--busy {
      opacity: 0.7;
      cursor: wait;
      border-color: var(--med-gold);
    }

    .upload-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(15, 76, 58, 0.08);
      border: 1px solid rgba(15, 76, 58, 0.14);
      color: var(--med-primary);
      margin-bottom: 0.25rem;
    }
    .upload-zone:hover .upload-icon {
      background: var(--med-gold-soft, rgba(212, 175, 55, 0.15));
      border-color: rgba(212, 175, 55, 0.35);
      color: #92680A;
    }

    .upload-title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--med-primary);
    }
    .upload-hint {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--med-muted);
    }

    .type-chips {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.875rem;
      flex-wrap: wrap;
    }
    .chip {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.4rem 0.875rem;
      border-radius: 9999px;
      border: 1px solid var(--med-border);
      background: var(--med-bg);
      color: var(--med-muted);
      cursor: pointer;
      transition: background 0.18s, color 0.18s, border-color 0.18s, transform 0.15s;
    }
    .chip:hover {
      border-color: rgba(15, 76, 58, 0.28);
      color: var(--med-primary);
      transform: translateY(-1px);
    }
    .chip--on {
      background: var(--med-primary);
      border-color: var(--med-primary);
      color: #fff;
    }

    .state-msg {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--med-muted);
      padding: 1rem;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--med-gold);
      animation: pulse 1s infinite;
    }
    @keyframes pulse { 50% { opacity: 0.35; } }

    .empty-state {
      margin: 0;
      padding: 2.5rem 1rem;
      text-align: center;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--med-muted);
      background: var(--med-surface);
      border: 1px dashed var(--med-border);
      border-radius: var(--med-radius);
    }

    .grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }

    .media-card {
      background: var(--med-surface);
      border: 1px solid var(--med-border);
      border-radius: var(--med-radius);
      overflow: hidden;
      box-shadow: var(--med-shadow);
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }
    .media-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--mos-shadow-card-hover, 0 4px 12px rgba(15, 23, 42, 0.08));
      border-color: rgba(212, 175, 55, 0.35);
    }

    .preview {
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--med-bg);
      border-bottom: 1px solid var(--med-border);
    }
    .preview[data-type="Audio"] { background: linear-gradient(180deg, #F0FDFA, var(--med-bg)); }
    .preview[data-type="Video"] { background: linear-gradient(180deg, #EFF6FF, var(--med-bg)); }
    .preview img, .preview video { max-width: 100%; max-height: 140px; object-fit: contain; }
    .preview audio { width: calc(100% - 1rem); padding: 0.5rem; }

    .meta { padding: 0.75rem 0.875rem; }
    .type-badge {
      display: inline-block;
      font-size: 0.5625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-bottom: 6px;
      background: rgba(15, 76, 58, 0.08);
      color: var(--med-primary);
      border: 1px solid rgba(15, 76, 58, 0.12);
    }
    .type-badge[data-type="Audio"] { background: #F0FDFA; color: #047857; border-color: #A7F3D0; }
    .type-badge[data-type="Image"] { background: #FFFBEB; color: #92680A; border-color: rgba(212, 175, 55, 0.35); }
    .type-badge[data-type="Video"] { background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }

    .name {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--med-text);
      word-break: break-all;
      line-height: 1.35;
    }
    .detail {
      margin: 0.25rem 0 0.625rem;
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--med-muted);
    }
    .del {
      font-size: 0.6875rem;
      font-weight: 600;
      color: #B91C1C;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 8px;
      cursor: pointer;
      padding: 4px 10px;
      transition: background 0.18s, border-color 0.18s;
    }
    .del:hover {
      background: #FEE2E2;
      border-color: #FCA5A5;
    }
  `]
})
export class ContentMediaComponent implements OnInit {
  private editor = inject(ContentEditorService);

  assets = signal<MediaAsset[]>([]);
  loading = signal(true);
  uploading = signal(false);
  filter: MediaAssetType | '' = '';
  types: MediaAssetType[] = ['Audio', 'Image', 'Video'];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const type = this.filter || undefined;
    this.editor.getMedia(type).subscribe({
      next: v => { this.assets.set(v); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setFilter(t: MediaAssetType | ''): void {
    this.filter = t;
    this.load();
  }

  url(m: MediaAsset): string {
    return this.editor.mediaUrl(m);
  }

  sizeLabel(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.editor.uploadMedia(file, this.filter || undefined).subscribe({
      next: () => { this.uploading.set(false); input.value = ''; this.load(); },
      error: () => { this.uploading.set(false); input.value = ''; },
    });
  }

  remove(id: number): void {
    if (!confirm('Delete this media file?')) return;
    this.editor.deleteMedia(id).subscribe(() => this.load());
  }
}
