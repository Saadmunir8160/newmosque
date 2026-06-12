import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';
import { Dua } from '../../core/models';

@Component({
  selector: 'app-member-duas',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Member" title="Duas Library" subtitle="Browse by category" />
    <div class="flex flex-wrap gap-2 mb-6">
      <button *ngFor="let c of categories()" class="chip" [class.active]="cat() === c" (click)="filter(c)">{{ c }}</button>
    </div>
    <app-card *ngFor="let d of duas()" class="block mb-4">
      <h4 class="text-white font-bold">{{ d.title }}</h4>
      <p class="text-2xl text-white font-serif text-right my-3" dir="rtl">{{ d.arabicText }}</p>
      <p class="text-emerald-200 text-sm italic">{{ d.translation }}</p>
    </app-card>
  `,
  styles: [`.chip{background:#064e3b;border:1px solid #065f46;color:#d1fae5;padding:6px 12px;border-radius:20px;cursor:pointer;font-size:12px}.active{border-color:#f59e0b;color:#f59e0b}`]
})
export class MemberDuasComponent implements OnInit {
  private content = inject(ContentService);
  duas = signal<Dua[]>([]);
  categories = signal<string[]>([]);
  cat = signal('');
  ngOnInit(): void {
    this.content.getDuaCategories().subscribe(c => this.categories.set(c));
    this.content.getDuas().subscribe(d => this.duas.set(d));
  }
  filter(c: string): void {
    this.cat.set(c);
    this.content.getDuas(c).subscribe(d => this.duas.set(d));
  }
}
