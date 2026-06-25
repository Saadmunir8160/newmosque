import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DeathReadingMonitor, DeathReadingsService } from '../../../core/services/death-readings.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';

@Component({
  selector: 'app-admin-death-readings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-death-readings.component.html',
  styleUrl: './admin-death-readings.component.css',
})
export class AdminDeathReadingsComponent implements OnInit {
  private readings = inject(DeathReadingsService);
  private mosqueCtx = inject(MosqueContextService);
  private http = inject(HttpClient);

  data = signal<DeathReadingMonitor | null>(null);
  loading = signal(true);
  saving = signal(false);
  targetModal = signal(false);
  targetInput = 100_000;
  toast = signal('');
  toastOk = signal(true);

  dateFrom = '2026-01-01';
  dateTo = new Date().toISOString().slice(0, 10);
  mid = 1;

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => { this.mid = id; this.reload(); });
  }

  reload(): void {
    this.loading.set(true);
    this.readings.getMonitor(this.mid, this.dateFrom, this.dateTo).subscribe({
      next: d => { this.data.set(d); this.targetInput = d.targetReadings; this.loading.set(false); },
      error: () => { this.loading.set(false); this.showToast('Could not load monitor data.', false); },
    });
  }

  gaugeBg(percent: number): string {
    const p = Math.min(100, Math.max(0, percent));
    return `conic-gradient(#0D9488 ${p}%, #E2E8F0 ${p}%)`;
  }

  timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  openTargetModal(): void {
    this.targetInput = this.data()?.targetReadings ?? 100_000;
    this.targetModal.set(true);
  }

  saveTarget(): void {
    const id = this.data()?.campaignId;
    if (!id || this.targetInput <= 0) return;
    this.saving.set(true);
    this.readings.updateTarget(this.mid, id, this.targetInput).subscribe({
      next: () => {
        this.saving.set(false);
        this.targetModal.set(false);
        this.showToast('Target updated.', true);
        this.reload();
      },
      error: () => { this.saving.set(false); this.showToast('Could not update target.', false); },
    });
  }

  exportReport(): void {
    const id = this.data()?.campaignId;
    if (!id) return;
    const url = this.readings.exportUrl(this.mid, id);
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `death-readings-${id}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        this.showToast('Report exported.', true);
      },
      error: () => this.showToast('Export failed.', false),
    });
  }

  archiveCampaign(): void {
    const id = this.data()?.campaignId;
    if (!id || !confirm('Archive this campaign? It will no longer appear as active.')) return;
    this.readings.archive(this.mid, id).subscribe({
      next: () => { this.showToast('Campaign archived.', true); this.reload(); },
      error: () => this.showToast('Archive failed.', false),
    });
  }

  resetCampaign(): void {
    const id = this.data()?.campaignId;
    if (!id || !confirm('Reset all reading progress for this campaign? This cannot be undone.')) return;
    this.readings.reset(this.mid, id).subscribe({
      next: () => { this.showToast('Campaign reset.', true); this.reload(); },
      error: () => this.showToast('Reset failed.', false),
    });
  }

  private showToast(msg: string, ok: boolean): void {
    this.toastOk.set(ok);
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3200);
  }
}
