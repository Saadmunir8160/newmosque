import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentService, AdhkarItem } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-content-adhkar',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Content Editor" title="Adhkar Library" />
    <app-card>
      <input class="input mb-2" placeholder="Title" [(ngModel)]="form.title">
      <textarea class="input mb-2" dir="rtl" placeholder="Arabic" [(ngModel)]="form.arabicText"></textarea>
      <input class="input mb-2" type="number" placeholder="Default count" [(ngModel)]="form.defaultCount">
      <button class="btn" (click)="create()">Add Adhkar Item</button>
    </app-card>
    <app-card *ngFor="let a of items()" class="block mt-3">
      <h4 class="text-white font-bold">{{ a.title }} <span class="text-emerald-400 text-sm">×{{ a.defaultCount }}</span></h4>
      <p class="text-emerald-100" dir="rtl">{{ a.arabicText }}</p>
    </app-card>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}`]
})
export class ContentAdhkarComponent implements OnInit {
  private content = inject(ContentService);
  items = signal<AdhkarItem[]>([]);
  form = { title: '', arabicText: '', defaultCount: 33 };
  ngOnInit(): void { this.content.getAdhkarItems().subscribe(i => this.items.set(i)); }
  create(): void {
    this.content.createAdhkarItem(this.form).subscribe(() => this.content.getAdhkarItems().subscribe(i => this.items.set(i)));
  }
}
