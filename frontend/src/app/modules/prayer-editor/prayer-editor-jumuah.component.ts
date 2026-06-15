import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AdminService } from '../../core/services/admin.service';
import { MosqueService } from '../../core/services/mosque.service';
import { JumuahTime } from '../../core/models';

@Component({
  selector: 'app-prayer-editor-jumuah',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="editor-page">
      <header class="editor-head">
        <p class="editor-badge">Prayer Times Editor</p>
        <h1 class="editor-title">Jumuah times</h1>
        <p class="editor-sub">Manage khutbah and jamaat slots.</p>
      </header>

      <section class="card">
        <div class="form">
          <input class="input" type="number" min="1" placeholder="Slot #" [(ngModel)]="slotNumber">
          <input class="input" type="time" [(ngModel)]="jamaatTime">
          <button class="btn" (click)="add()">Add slot</button>
        </div>
      </section>

      <section class="card">
        <div *ngFor="let j of jumuah()" class="row">
          <span>Slot {{ j.slotNumber }} - {{ j.jamaatTime.slice(0,5) }}</span>
          <button class="btn btn-red" (click)="remove(j.id)">Remove</button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .editor-page { display: flex; flex-direction: column; gap: 1rem; }
    .editor-badge { margin: 0; font-size: 0.7rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; }
    .editor-title { margin: 0.25rem 0 0; color: #fff; font-size: 1.5rem; }
    .editor-sub { margin: 0.25rem 0 0; color: #6ee7b7; font-size: 0.85rem; }
    .card { background: #064e3b; border: 1px solid #065f46; border-radius: 0.75rem; padding: 1rem; }
    .form { display: grid; grid-template-columns: 120px 1fr auto; gap: 0.5rem; }
    .input { background: #022c22; border: 1px solid #065f46; color: #fff; border-radius: 0.5rem; padding: 0.5rem 0.75rem; }
    .btn { background: #f59e0b; color: #022c22; border: none; border-radius: 0.5rem; padding: 0.5rem 1rem; font-weight: 700; cursor: pointer; }
    .btn-red { background: #7f1d1d; color: #fecaca; font-size: 0.78rem; padding: 0.35rem 0.7rem; }
    .row { display: flex; justify-content: space-between; align-items: center; color: #d1fae5; padding: 0.5rem 0; border-bottom: 1px solid rgba(6,95,70,0.6); }
  `]
})
export class PrayerEditorJumuahComponent implements OnInit {
  private admin = inject(AdminService);
  private mosque = inject(MosqueService);
  private mosqueId = environment.defaultMosqueId;

  jumuah = signal<JumuahTime[]>([]);
  slotNumber = 1;
  jamaatTime = '13:00';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.mosque.getJumuahTimes(this.mosqueId).subscribe(d => this.jumuah.set(d));
  }

  add(): void {
    const t = this.jamaatTime.length === 5 ? `${this.jamaatTime}:00` : this.jamaatTime;
    this.admin.addJumuahSlot(this.mosqueId, { slotNumber: this.slotNumber, jamaatTime: t }).subscribe(() => this.load());
  }

  remove(id: number): void {
    this.admin.deleteJumuahSlot(this.mosqueId, id).subscribe(() => this.load());
  }
}
