import { Component, OnInit, OnDestroy, inject, signal, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AuthService } from '../../core/auth/auth.service';
import { ParaListItem, QuranService, QuranParaContent } from '../../core/services/quran.service';
import { environment } from '../../../environments/environment';

interface Allocation {
  id: number;
  description: string;
  status: string;
  type: string;
  userId?: string | null;
}

interface CampaignView {
  id: number;
  title: string;
  description?: string;
  allocations: Allocation[];
}

interface ReaderView {
  title: string;
  subtitle?: string;
  arabic: string;
  translation: string;
  instruction?: string;
  source?: string;
  mode: 'para' | 'yaseen' | 'adhkar';
}

@Component({
  selector: 'app-member-readings',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Member" title="Death Readings"
      subtitle="Select a para, read Surah Yaseen or adhkar, then mark your portion complete." />

    <p *ngIf="msg()" class="toast" [class.toast--err]="msgErr()">{{ msg() }}</p>

    <!-- Qur'an para library -->
    <section class="library">
      <h3 class="library__title">Qur'an — select para (1–30)</h3>
      <div class="library__row">
        <div class="para-picker" (click)="$event.stopPropagation()">
          <button type="button" class="para-picker__trigger" (click)="toggleParaMenu($event)">
            <span>{{ selectedParaLabel() }}</span>
            <span class="para-picker__chev" [class.para-picker__chev--open]="paraMenuOpen()">▾</span>
          </button>
          <ul *ngIf="paraMenuOpen()" class="para-picker__menu" role="listbox">
            <li *ngFor="let p of paraList()" role="option">
              <button type="button" class="para-picker__item" [class.para-picker__item--on]="p.number === selectedPara()"
                (click)="pickPara(p.number)">{{ p.label }}</button>
            </li>
          </ul>
        </div>
        <button type="button" class="btn-read" [disabled]="!paraList().length || readerLoading()"
          (click)="openPara(selectedPara())">Read selected para</button>
      </div>
      <button type="button" class="btn-link" (click)="openYaseen()">Read full Surah Yaseen</button>
    </section>

    <div *ngIf="!campaigns().length" class="empty">No reading campaigns at this time.</div>

    <article *ngFor="let c of campaigns()" class="campaign">
      <header class="campaign__head">
        <h3 class="campaign__title">{{ c.title }}</h3>
        <p *ngIf="c.description" class="campaign__sub">{{ c.description }}</p>
      </header>

      <div *ngFor="let a of c.allocations" class="row">
        <div class="row__main">
          <span class="type-tag">{{ typeLabel(a.type) }}</span>
          <p class="row__desc">{{ a.description }}</p>
          <p *ngIf="a.userId && a.userId !== myId()" class="row__hint">Assigned to another member</p>
        </div>
        <div class="row__actions">
          <button *ngIf="canRead(a)" type="button" class="btn-read" (click)="openReading(a)">
            {{ readLabel(a) }}
          </button>
          <button *ngIf="canComplete(a)" type="button" class="btn-done" [disabled]="busyId() === a.id"
            (click)="complete(a.id)">
            {{ busyId() === a.id ? 'Saving…' : 'Mark complete' }}
          </button>
          <span *ngIf="isCompleted(a)" class="done">✓ Completed</span>
        </div>
      </div>
    </article>

    <div *ngIf="reader()" class="reader-backdrop" (click)="closeReader()">
      <div class="reader" (click)="$event.stopPropagation()">
        <button type="button" class="reader__close" (click)="closeReader()">✕</button>
        <h3 class="reader__title">{{ reader()!.title }}</h3>
        <p *ngIf="reader()!.subtitle" class="reader__sub">{{ reader()!.subtitle }}</p>
        <p *ngIf="reader()!.source" class="reader__source">Source: {{ reader()!.source }}</p>

        <div *ngIf="readerLoading()" class="reader__loading">Loading Qur'an text…</div>

        <div *ngIf="reader()!.mode === 'para'" class="reader__picker">
          <label class="picker-label" for="reader-para">Change para</label>
          <div class="para-picker para-picker--reader" (click)="$event.stopPropagation()">
            <button id="reader-para" type="button" class="para-picker__trigger" (click)="toggleReaderParaMenu($event)">
              <span>{{ selectedParaLabel() }}</span>
              <span class="para-picker__chev" [class.para-picker__chev--open]="readerParaMenuOpen()">▾</span>
            </button>
            <ul *ngIf="readerParaMenuOpen()" class="para-picker__menu" role="listbox">
              <li *ngFor="let p of paraList()" role="option">
                <button type="button" class="para-picker__item" [class.para-picker__item--on]="p.number === selectedPara()"
                  (click)="pickPara(p.number, true)">{{ p.label }}</button>
              </li>
            </ul>
          </div>
        </div>

        <p *ngIf="!readerLoading()" class="reader__arabic" dir="rtl">{{ reader()!.arabic }}</p>
        <p *ngIf="!readerLoading() && reader()!.mode === 'adhkar' && reader()!.translation" class="reader__trans">
          {{ reader()!.translation }}
        </p>
        <p *ngIf="reader()!.instruction" class="reader__instruction">{{ reader()!.instruction }}</p>

        <button *ngIf="readerAllocationId()" type="button" class="btn-done reader__done"
          (click)="complete(readerAllocationId()!)">
          Mark complete after reading
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast { margin-bottom: 0.75rem; font-size: 0.8125rem; color: #6ee7b7; }
    .toast--err { color: #fecaca; }
    .library { margin-bottom: 1rem; padding: 1rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.9), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.28); border-radius: 0.75rem; }
    .library__title { margin: 0 0 0.75rem; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .library__row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
    .para-picker { position: relative; flex: 1; min-width: 12rem; }
    .para-picker--reader { width: 100%; min-width: 0; margin-bottom: 0.75rem; }
    .para-picker__trigger {
      width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;
      background: linear-gradient(180deg, rgba(6,78,59,0.98), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.45); border-radius: 0.5rem;
      padding: 0.55rem 0.65rem; font-size: 0.8125rem; font-weight: 600; color: #fff; cursor: pointer;
    }
    .para-picker__trigger:hover { border-color: rgba(212,175,55,0.65); }
    .para-picker__chev { color: #fcd34d; font-size: 0.875rem; transition: transform 0.15s ease; }
    .para-picker__chev--open { transform: rotate(180deg); }
    .para-picker__menu {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;
      max-height: 14rem; overflow-y: auto; margin: 0; padding: 0.35rem; list-style: none;
      background: linear-gradient(180deg, #065f46, #022c22);
      border: 1px solid rgba(212,175,55,0.45); border-radius: 0.5rem;
      box-shadow: 0 14px 36px rgba(0,0,0,0.5);
    }
    .para-picker__menu::-webkit-scrollbar { width: 6px; }
    .para-picker__menu::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.45); border-radius: 9999px; }
    .para-picker__item {
      width: 100%; text-align: left; border: none; background: transparent;
      color: #ecfdf5; font-size: 0.8125rem; padding: 0.5rem 0.65rem;
      border-radius: 0.375rem; cursor: pointer;
    }
    .para-picker__item:hover { background: rgba(212,175,55,0.18); color: #fcd34d; }
    .para-picker__item--on {
      background: linear-gradient(180deg, #fcd34d, #D4AF37); color: #022c22; font-weight: 700;
    }
    .btn-link { background: none; border: none; color: #fcd34d; font-size: 0.75rem; font-weight: 600; cursor: pointer; padding: 0; }
    .empty { padding: 2rem; text-align: center; color: rgba(167,243,208,0.65);
      border: 1px dashed rgba(212,175,55,0.25); border-radius: 0.75rem; }
    .campaign { margin-bottom: 1rem; padding: 1rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.9), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.22); border-radius: 0.75rem; }
    .campaign__title { margin: 0; font-size: 1rem; font-weight: 700; color: #fff; }
    .campaign__sub { margin: 0.25rem 0 0; font-size: 0.75rem; color: rgba(167,243,208,0.65); }
    .row { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: space-between; align-items: center;
      padding: 0.875rem 0; border-top: 1px solid rgba(16,185,129,0.15); }
    .row__desc { margin: 0.25rem 0 0; font-size: 0.875rem; color: #ecfdf5; }
    .row__hint { margin: 0.25rem 0 0; font-size: 0.6875rem; color: rgba(148,163,184,0.8); }
    .type-tag { font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      color: #fcd34d; background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.3);
      padding: 0.15rem 0.45rem; border-radius: 9999px; }
    .row__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .btn-read, .btn-done { font-size: 0.75rem; font-weight: 700; border-radius: 0.5rem; padding: 0.45rem 0.85rem; cursor: pointer; border: none; }
    .btn-read { color: #ecfdf5; background: rgba(0,0,0,0.35); border: 1px solid rgba(16,185,129,0.35); }
    .btn-done { color: #022c22; background: linear-gradient(180deg, #fcd34d, #D4AF37); }
    .btn-done:disabled { opacity: 0.55; cursor: not-allowed; }
    .done { font-size: 0.8125rem; font-weight: 700; color: #6ee7b7; }
    .reader-backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.65);
      display: flex; align-items: center; justify-content: center; padding: 1rem; overflow: hidden; }
    .reader { max-width: 42rem; width: 100%; max-height: 90vh; overflow-y: auto; padding: 1.25rem;
      background: linear-gradient(160deg, #064e3b, #022c22); border: 1px solid rgba(212,175,55,0.35);
      border-radius: 0.75rem; position: relative; scrollbar-color: rgba(212,175,55,0.45) #022c22; scrollbar-width: thin; }
    .reader::-webkit-scrollbar { width: 6px; }
    .reader::-webkit-scrollbar-track { background: #022c22; }
    .reader::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.45); border-radius: 9999px; }
    .reader__close { position: absolute; top: 0.75rem; right: 0.75rem; background: transparent; border: none;
      color: rgba(167,243,208,0.8); font-size: 1rem; cursor: pointer; }
    .reader__title { margin: 0 2rem 0.25rem 0; font-size: 1.125rem; font-weight: 700; color: #fff; }
    .reader__sub { margin: 0 0 0.75rem; font-size: 0.75rem; color: rgba(167,243,208,0.7); }
    .reader__source { margin: 0 0 0.75rem; font-size: 0.625rem; color: rgba(148,163,184,0.75); }
    .reader__loading { padding: 2rem 0; text-align: center; color: #fcd34d; font-size: 0.875rem; }
    .picker-label { display: block; font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
      color: rgba(212,175,55,0.85); margin-bottom: 0.35rem; }
    .reader__arabic { margin: 0 0 1rem; font-size: 1.35rem; line-height: 2.2; color: #fff; white-space: pre-wrap;
      font-family: 'Traditional Arabic', 'Scheherazade New', serif; }
    .reader__trans { margin: 0 0 0.75rem; font-size: 0.875rem; line-height: 1.65; color: rgba(167,243,208,0.9); white-space: pre-wrap; }
    .reader__instruction { margin: 0 0 1rem; font-size: 0.75rem; line-height: 1.5; color: #fcd34d;
      padding: 0.625rem; background: rgba(212,175,55,0.08); border-radius: 0.5rem; border: 1px solid rgba(212,175,55,0.2); }
    .reader__done { width: 100%; }
  `]
})
export class MemberReadingsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private quran = inject(QuranService);
  campaigns = signal<CampaignView[]>([]);
  paraList = signal<ParaListItem[]>([]);
  selectedPara = signal(1);
  busyId = signal<number | null>(null);
  msg = signal('');
  msgErr = signal(false);
  reader = signal<ReaderView | null>(null);
  readerLoading = signal(false);
  readerAllocationId = signal<number | null>(null);
  paraMenuOpen = signal(false);
  readerParaMenuOpen = signal(false);
  myId = signal('');
  private base = `${environment.apiUrl}/mosques/${environment.defaultMosqueId}/reading-campaigns`;

  constructor() {
    effect(() => {
      document.body.style.overflow = this.reader() ? 'hidden' : '';
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  @HostListener('document:click')
  closeParaMenus(): void {
    this.paraMenuOpen.set(false);
    this.readerParaMenuOpen.set(false);
  }

  selectedParaLabel(): string {
    const match = this.paraList().find(p => p.number === this.selectedPara());
    return match?.label ?? `Para ${this.selectedPara()}`;
  }

  toggleParaMenu(event: Event): void {
    event.stopPropagation();
    this.readerParaMenuOpen.set(false);
    this.paraMenuOpen.update(v => !v);
  }

  toggleReaderParaMenu(event: Event): void {
    event.stopPropagation();
    this.paraMenuOpen.set(false);
    this.readerParaMenuOpen.update(v => !v);
  }

  pickPara(n: number, reloadReader = false): void {
    this.selectedPara.set(n);
    this.paraMenuOpen.set(false);
    this.readerParaMenuOpen.set(false);
    if (reloadReader) this.loadParaIntoReader(n);
  }

  ngOnInit(): void {
    this.myId.set(this.auth.user()?.id ?? '');
    this.paraList.set(fallbackParaList());
    this.quran.getParas().subscribe({
      next: list => {
        this.paraList.set(list);
        if (list.length) this.selectedPara.set(list[0].number);
      },
      error: () => this.showErr('Could not load para list. Check that the API is running on port 5000.'),
    });
    this.load();
  }

  load(): void {
    this.http.get<{ id: number }[]>(this.base).subscribe({
      next: list => {
        if (!list.length) { this.campaigns.set([]); return; }
        forkJoin(list.map(c => this.http.get<{ campaign: Record<string, unknown> }>(`${this.base}/${c.id}`)))
          .subscribe({
            next: details => this.campaigns.set(details.map(d => this.mapCampaign(d.campaign))),
            error: () => this.showErr('Could not load reading campaign.'),
          });
      },
      error: () => this.showErr('Could not load campaigns.'),
    });
  }

  private mapCampaign(raw: Record<string, unknown>): CampaignView {
    const c = raw as { id: number; deceasedName?: string; title?: string; description?: string; allocations?: Allocation[] };
    return {
      id: c.id,
      title: c.deceasedName || c.title || 'Reading campaign',
      description: c.description,
      allocations: (c.allocations ?? []).map(a => ({
        ...a,
        status: String(a.status),
        type: String(a.type),
      })),
    };
  }

  typeLabel(type: string): string {
    if (type === 'Para') return 'Qur\'an para';
    if (type === 'Yaseen') return 'Surah Yaseen';
    if (type === 'Adhkar') return 'Adhkar';
    return type;
  }

  isCompleted(a: Allocation): boolean {
    return a.status === 'Completed';
  }

  canComplete(a: Allocation): boolean {
    if (this.isCompleted(a)) return false;
    if (!a.userId || a.userId === this.myId()) return true;
    return false;
  }

  canRead(a: Allocation): boolean {
    return a.type === 'Para' || a.type === 'Yaseen' || a.type === 'Adhkar';
  }

  readLabel(a: Allocation): string {
    if (a.type === 'Yaseen') return 'Read Surah Yaseen';
    if (a.type === 'Adhkar') return 'Read adhkar';
    const n = this.paraNumber(a.description);
    return n ? `Read Para ${n}` : 'Read para';
  }

  openPara(n: number): void {
    this.readerAllocationId.set(null);
    this.selectedPara.set(n);
    this.paraMenuOpen.set(false);
    this.loadParaIntoReader(n);
  }

  openYaseen(): void {
    this.readerAllocationId.set(null);
    this.reader.set({ title: 'Surah Yaseen (36)', arabic: '', translation: '', mode: 'yaseen', source: 'alquran.cloud' });
    this.readerLoading.set(true);
    this.quran.getYaseen().subscribe({
      next: y => {
        this.readerLoading.set(false);
        this.reader.set({
          title: y.name,
          arabic: y.arabic,
          translation: y.translation,
          source: (y as { source?: string }).source ?? 'alquran.cloud',
          mode: 'yaseen',
        });
      },
      error: () => { this.readerLoading.set(false); this.showErr('Could not load Surah Yaseen.'); },
    });
  }

  openReading(a: Allocation): void {
    this.readerAllocationId.set(a.id);
    if (a.type === 'Yaseen') {
      this.reader.set({ title: 'Surah Yaseen (36)', arabic: '', translation: '', mode: 'yaseen' });
      this.readerLoading.set(true);
      this.quran.getYaseen().subscribe({
        next: y => {
          this.readerLoading.set(false);
          this.reader.set({
            title: y.name,
            arabic: y.arabic,
            translation: y.translation,
            source: (y as { source?: string }).source,
            mode: 'yaseen',
          });
        },
        error: () => { this.readerLoading.set(false); this.showErr('Could not load Surah Yaseen.'); },
      });
      return;
    }
    if (a.type === 'Adhkar') {
      const key = this.adhkarKey(a.description);
      this.quran.getAdhkar(key).subscribe({
        next: d => this.reader.set({
          title: d.title,
          subtitle: a.description,
          arabic: d.arabic,
          translation: `${d.transliteration}\n\n${d.translation}`,
          instruction: d.instruction,
          mode: 'adhkar',
        }),
        error: () => this.showErr('Could not load adhkar text.'),
      });
      return;
    }
    const n = this.paraNumber(a.description) ?? 1;
    this.selectedPara.set(n);
    this.loadParaIntoReader(n);
  }

  private loadParaIntoReader(n: number): void {
    const existing = this.reader();
    this.reader.set({
      title: `Para ${n}`,
      arabic: '',
      translation: '',
      mode: 'para',
      subtitle: existing?.subtitle,
      source: 'alquran.cloud',
    });
    this.readerLoading.set(true);
    this.quran.getPara(n).subscribe({
      next: (p: QuranParaContent) => {
        this.readerLoading.set(false);
        const isFallback = p.source === 'local-fallback';
        this.reader.set({
          title: `Para ${p.number} — ${p.nameEn}`,
          subtitle: isFallback
            ? `${p.surahRange} (partial — retry in a moment for full text)`
            : p.surahRange,
          arabic: p.arabic,
          translation: p.translation,
          source: p.source,
          mode: 'para',
        });
        if (isFallback) this.showErr('Full para text is still loading. Wait a minute and try again.');
      },
      error: () => {
        this.readerLoading.set(false);
        this.showErr('Could not load para text. Ensure the API is running (port 5000) and refresh the page.');
      },
    });
  }

  closeReader(): void {
    this.reader.set(null);
    this.readerAllocationId.set(null);
  }

  complete(allocationId: number): void {
    this.busyId.set(allocationId);
    this.msg.set('');
    this.http.post(`${this.base}/allocations/${allocationId}/complete`, {}).subscribe({
      next: () => {
        this.busyId.set(null);
        this.msgErr.set(false);
        this.msg.set('Marked complete — jazakAllah khair.');
        this.closeReader();
        this.load();
      },
      error: err => {
        this.busyId.set(null);
        this.showErr(err.error?.message ?? 'Could not mark complete. Log in and try again.');
      },
    });
  }

  private paraNumber(description: string): number | null {
    const m = description.match(/para\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  private adhkarKey(description: string): string {
    if (/tahlil/i.test(description)) return 'tahlil';
    if (/salawat/i.test(description)) return 'salawat';
    if (/istighfar/i.test(description)) return 'istighfar';
    return 'general';
  }

  private showErr(text: string): void {
    this.msgErr.set(true);
    this.msg.set(text);
  }
}

function fallbackParaList(): ParaListItem[] {
  const names = [
    'Alif Lam Meem', 'Sayaqool', 'Tilkal Rusul', 'Lan Tanaloo', 'Wal Muhsanaat',
    'La Yuhibbullah', 'Wa Idha Sami\'oo', 'Wa Law Annana', 'Qalal Malao', 'Wa A\'lamu',
    'Yatazeroon', 'Wa Maa Min Daaabbah', 'Wa Maa Ubarri\'u', 'Rubama', 'Subhanalladhi',
    'Qala Alam', 'Iqtaraba', 'Qad Aflaha', 'Wa Qalalladheena', 'A\'man Khalaq',
    'Utlu Maa Oohiya', 'Wa Man Yaqnut', 'Faman Azlam', 'Fa Man Khair', 'Elahukum',
    'Ha Meem', 'Qala Fama Khatbukum', 'Qad Sami\'a', 'Tabarakalladhi', 'Amma Yatasaa\'aloon',
  ];
  return names.map((nameEn, i) => {
    const number = i + 1;
    return { number, nameEn, nameAr: '', surahRange: '', label: `Para ${number} — ${nameEn}` };
  });
}
