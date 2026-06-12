import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<div class="app-viewport"><router-outlet /></div>',
  styles: [`:host { display: block; width: 100%; min-height: 100dvh; }`]
})
export class AppComponent {}
