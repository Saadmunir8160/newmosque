import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService, AdhkarItem } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-member-adhkar',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Member" title="Adhkar Counter" subtitle="+1 / +10 counter — build your daily dhikr list" />
    <app-card *ngFor="let item of mine()" class="block mb-4">
      <div class="flex justify-between items-center">
        <div>
          <h4 class="text-white font-bold">{{ item.userAdhkar.adhkarItem?.title || item.userAdhkar.customTitle }}</h4>
          <p class="text-amber-400 font-mono text-2xl">{{ item.todayCount }} / {{ item.userAdhkar.targetCount }}</p>
        </div>
        <div class="flex gap-2">
          <button class="btn" (click)="inc(item.userAdhkar.id, 1)">+1</button>
          <button class="btn" (click)="inc(item.userAdhkar.id, 10)">+10</button>
        </div>
      </div>
    </app-card>
    <app-card>
      <p class="text-emerald-300 text-sm mb-3">Add from library:</p>
      <button *ngFor="let a of library()" class="block w-full text-left text-emerald-100 py-2 border-b border-emerald-800 hover:text-amber-400" (click)="add(a)">
        {{ a.title }} ({{ a.defaultCount }})
      </button>
    </app-card>
  `,
  styles: [`.btn{background:#064e3b;border:1px solid #10b981;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer;font-weight:700}`]
})
export class MemberAdhkarComponent implements OnInit {
  private content = inject(ContentService);
  mine = signal<{ userAdhkar: { id: number; targetCount: number; adhkarItem?: AdhkarItem; customTitle?: string }; todayCount: number }[]>([]);
  library = signal<AdhkarItem[]>([]);
  ngOnInit(): void {
    this.load();
    this.content.getAdhkarItems().subscribe(l => this.library.set(l));
  }
  load(): void { this.content.getMyAdhkar().subscribe(m => this.mine.set(m)); }
  inc(id: number, by: number): void { this.content.incrementAdhkar(id, by).subscribe(() => this.load()); }
  add(a: AdhkarItem): void { this.content.addToMyAdhkar(a.id, a.defaultCount).subscribe(() => this.load()); }
}
