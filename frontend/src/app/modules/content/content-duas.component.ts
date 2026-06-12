import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentService } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';
import { Dua } from '../../core/models';

@Component({
  selector: 'app-content-duas',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Content Editor" title="Duas Library" />
    <app-card>
      <input class="input mb-2" placeholder="Title" [(ngModel)]="form.title">
      <input class="input mb-2" placeholder="Category (morning, wudu, sleep...)" [(ngModel)]="form.category">
      <textarea class="input mb-2" rows="2" dir="rtl" placeholder="Arabic" [(ngModel)]="form.arabicText"></textarea>
      <textarea class="input mb-2" rows="2" placeholder="Translation" [(ngModel)]="form.translation"></textarea>
      <button class="btn" (click)="create()">Add Dua</button>
    </app-card>
    <app-card *ngFor="let d of duas()" class="block mt-3">
      <h4 class="text-white font-bold">{{ d.title }}</h4>
      <p class="text-emerald-400 text-sm">{{ d.category }}</p>
      <p class="text-emerald-100 text-sm mt-1" dir="rtl">{{ d.arabicText }}</p>
    </app-card>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}`]
})
export class ContentDuasComponent implements OnInit {
  private content = inject(ContentService);
  duas = signal<Dua[]>([]);
  form = { title: '', category: 'general', arabicText: '', translation: '' };
  ngOnInit(): void { this.content.getDuas().subscribe(d => this.duas.set(d)); }
  create(): void {
    this.content.createDua(this.form).subscribe(() => this.content.getDuas().subscribe(d => this.duas.set(d)));
  }
}
