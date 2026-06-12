import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentService, RitualGuide } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-content-ritual-guides',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Content Editor" title="Ritual Guides" subtitle="Wudu, Ghusl and step-by-step guides" />

    <app-card class="mb-6">
      <h3 class="text-white font-bold mb-4">Create Guide</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <input class="input" placeholder="Title" [(ngModel)]="form.title">
        <select class="input" [(ngModel)]="form.type">
          <option value="Wudu">Wudu</option>
          <option value="Ghusl">Ghusl</option>
          <option value="Salah">Salah</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <button class="btn" (click)="create()">Create Guide</button>
    </app-card>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <app-card *ngFor="let g of guides()" class="block">
        <div class="flex justify-between items-start gap-2">
          <div>
            <span class="text-sm bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded uppercase">{{ g.type }}</span>
            <h4 class="text-white font-bold mt-2">{{ g.title }}</h4>
          </div>
          <button class="text-amber-400 text-sm font-bold shrink-0" (click)="selected.set(g)">+ Step</button>
        </div>
      </app-card>
    </div>

    <app-card *ngIf="selected() as g" class="mt-6">
      <h4 class="text-white font-bold mb-3">Add step to "{{ g.title }}"</h4>
      <div class="grid grid-cols-1 gap-3">
        <input class="input" placeholder="Step title" [(ngModel)]="step.title">
        <textarea class="input" rows="2" placeholder="Instructions" [(ngModel)]="step.description"></textarea>
        <input class="input" type="number" placeholder="Order" [(ngModel)]="step.orderIndex">
      </div>
      <button class="btn mt-3" (click)="addStep(g.id)">Add Step</button>
    </app-card>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}`]
})
export class ContentRitualGuidesComponent implements OnInit {
  private content = inject(ContentService);
  guides = signal<RitualGuide[]>([]);
  selected = signal<RitualGuide | null>(null);
  form = { title: '', type: 'Wudu' };
  step = { title: '', description: '', orderIndex: 1 };

  ngOnInit(): void { this.load(); }
  load(): void { this.content.getRitualGuides().subscribe(g => this.guides.set(g)); }

  create(): void {
    this.content.createRitualGuide(this.form).subscribe(() => {
      this.form = { title: '', type: 'Wudu' };
      this.load();
    });
  }

  addStep(guideId: number): void {
    this.content.addRitualStep(guideId, this.step).subscribe(() => {
      this.step = { title: '', description: '', orderIndex: this.step.orderIndex + 1 };
      this.selected.set(null);
      this.load();
    });
  }
}
