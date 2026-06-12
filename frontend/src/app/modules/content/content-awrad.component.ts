import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentService } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';
import { WirdCollection } from '../../core/models';

@Component({
  selector: 'app-content-awrad',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Content Editor" title="Awrad & Wird Collections" />
    <app-card>
      <input class="input mb-2" placeholder="Collection name" [(ngModel)]="form.name">
      <select class="input mb-2" [(ngModel)]="form.tariqa">
        <option value="General">General</option><option value="BaAlawi">Ba'Alawi</option><option value="Shadhili">Shadhili</option>
      </select>
      <select class="input mb-2" [(ngModel)]="form.type">
        <option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Event">Event</option>
      </select>
      <button class="btn" (click)="create()">Create Collection</button>
    </app-card>
    <app-card *ngFor="let c of collections()" class="block mt-3">
      <h4 class="text-white font-bold">{{ c.name }}</h4>
      <p class="text-emerald-300 text-sm">{{ c.tariqa }} · {{ c.type }}</p>
    </app-card>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}`]
})
export class ContentAwradComponent implements OnInit {
  private content = inject(ContentService);
  collections = signal<WirdCollection[]>([]);
  form = { name: '', tariqa: 'General', type: 'Daily' };
  ngOnInit(): void { this.content.getCollections().subscribe(c => this.collections.set(c)); }
  create(): void {
    this.content.createCollection(this.form).subscribe(() => this.content.getCollections().subscribe(c => this.collections.set(c)));
  }
}
