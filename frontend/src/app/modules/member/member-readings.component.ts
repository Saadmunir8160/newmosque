import { Component, OnInit, OnDestroy, inject, signal, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AuthService } from '../../core/auth/auth.service';
import { ParaListItem, QuranService, QuranParaContent } from '../../core/services/quran.service';
import { MemberService, ReadingAllocationMine } from '../../core/services/member.service';
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

    <p *ngIf="msg()" class="member-toast" [class.member-toast--err]="msgErr()">{{ msg() }}</p>

    <!-- Qur'an para library -->
    <section class="member-card">
      <h3 class="member-section-title">Qur'an — select para (1–30)</h3>
      <div class="member-library__row">
        <div class="member-para-picker" (click)="$event.stopPropagation()">
          <button type="button" class="member-para-picker__trigger" (click)="toggleParaMenu($event)">
            <span>{{ selectedParaLabel() }}</span>
            <span class="member-para-picker__chev" [class.member-para-picker__chev--open]="paraMenuOpen()">▾</span>
          </button>
          <ul *ngIf="paraMenuOpen()" class="member-para-picker__menu" role="listbox">
            <li *ngFor="let p of paraList()" role="option">
              <button type="button" class="member-para-picker__item" [class.member-para-picker__item--on]="p.number === selectedPara()"
                (click)="pickPara(p.number)">{{ p.label }}</button>
            </li>
          </ul>
        </div>
        <button type="button" class="member-btn-secondary" [disabled]="!paraList().length || readerLoading()"
          (click)="openPara(selectedPara())">Read selected para</button>
      </div>
      <button type="button" class="member-btn-link" (click)="openYaseen()">Read full Surah Yaseen</button>
    </section>

    <div *ngIf="!campaigns().length" class="member-empty">No reading campaigns at this time.</div>

    <article *ngFor="let c of campaigns()" class="member-card">
      <header class="member-campaign__head">
        <h3 class="member-title">{{ c.title }}</h3>
        <p *ngIf="c.description" class="member-meta">{{ c.description }}</p>
      </header>

      <div *ngFor="let a of c.allocations" class="member-row">
        <div>
          <span class="member-tag">{{ typeLabel(a.type) }}</span>
          <p class="member-desc" style="margin-top: 0.25rem;">{{ a.description }}</p>
          <p *ngIf="a.userId && a.userId !== myId()" class="member-row__hint">Assigned to another member</p>
        </div>
        <div class="member-row__actions">
          <button *ngIf="canRead(a)" type="button" class="member-btn-secondary" (click)="openReading(a)">
            {{ readLabel(a) }}
          </button>
          <button *ngIf="canComplete(a)" type="button" class="member-btn-primary" [disabled]="busyId() === a.id"
            (click)="complete(a.id)">
            {{ busyId() === a.id ? 'Saving…' : 'Mark complete' }}
          </button>
          <span *ngIf="isCompleted(a)" class="member-done-text">✓ Completed</span>
        </div>
      </div>
    </article>

    <div *ngIf="reader()" class="member-reader-backdrop" (click)="closeReader()">
      <div class="member-reader" (click)="$event.stopPropagation()">
        <button type="button" class="member-reader__close" (click)="closeReader()" aria-label="Close">✕</button>
        <div class="member-reader__head">
          <h3 class="member-reader__title">{{ reader()!.title }}</h3>
          <p *ngIf="reader()!.subtitle" class="member-reader__sub">{{ reader()!.subtitle }}</p>
          <p *ngIf="reader()!.source" class="member-reader__source">Source: {{ reader()!.source }}</p>
        </div>
        <div class="member-reader__body">
          <div *ngIf="reader()!.mode === 'para'">
            <label class="member-label" for="reader-para">Change para</label>
            <div class="member-para-picker member-para-picker--full" (click)="$event.stopPropagation()">
              <button id="reader-para" type="button" class="member-para-picker__trigger" (click)="toggleReaderParaMenu($event)">
                <span>{{ selectedParaLabel() }}</span>
                <span class="member-para-picker__chev" [class.member-para-picker__chev--open]="readerParaMenuOpen()">▾</span>
              </button>
              <ul *ngIf="readerParaMenuOpen()" class="member-para-picker__menu" role="listbox">
                <li *ngFor="let p of paraList()" role="option">
                  <button type="button" class="member-para-picker__item" [class.member-para-picker__item--on]="p.number === selectedPara()"
                    (click)="pickPara(p.number, true)">{{ p.label }}</button>
                </li>
              </ul>
            </div>
          </div>

          <div *ngIf="readerLoading()" class="member-reader__loading">Loading Qur'an text…</div>

          <p *ngIf="!readerLoading()" class="member-reader__arabic" dir="rtl">{{ reader()!.arabic }}</p>
          <p *ngIf="!readerLoading() && reader()!.mode === 'adhkar' && reader()!.translation" class="member-reader__trans">
            {{ reader()!.translation }}
          </p>
          <p *ngIf="reader()!.instruction" class="member-reader__instruction">{{ reader()!.instruction }}</p>

          <button *ngIf="readerAllocationId()" type="button" class="member-btn-primary member-reader__done"
            (click)="complete(readerAllocationId()!)">
            Mark complete after reading
          </button>
        </div>
      </div>
    </div>
  `,
})
export class MemberReadingsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private quran = inject(QuranService);
  private memberService = inject(MemberService);
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
  private mosqueId = environment.defaultMosqueId;
  private completeBase = `${environment.apiUrl}/mosques/${environment.defaultMosqueId}/reading-campaigns`;

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
    this.memberService.getMyReadingAllocations(this.mosqueId).subscribe({
      next: rows => this.campaigns.set(this.groupAllocations(rows)),
      error: () => this.showErr('Could not load your reading assignments.'),
    });
  }

  private groupAllocations(rows: ReadingAllocationMine[]): CampaignView[] {
    const map = new Map<number, CampaignView>();
    for (const row of rows) {
      const existing = map.get(row.campaignId);
      const allocation: Allocation = {
        id: row.id,
        description: row.description,
        status: row.status,
        type: row.type,
        userId: this.myId(),
      };
      if (existing) {
        existing.allocations.push(allocation);
      } else {
        map.set(row.campaignId, {
          id: row.campaignId,
          title: row.deceasedName || 'Reading campaign',
          allocations: [allocation],
        });
      }
    }
    return Array.from(map.values());
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
    this.http.post(`${this.completeBase}/allocations/${allocationId}/complete`, {}).subscribe({
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
