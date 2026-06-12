import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="bg-[#064e3b] rounded-xl sm:rounded-2xl border border-emerald-800 p-4 sm:p-6 w-full"><ng-content></ng-content></div>`
})
export class CardComponent {}
