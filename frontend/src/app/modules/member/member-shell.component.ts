import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-member-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="member-dash">
      <router-outlet />
    </div>
  `,
})
export class MemberShellComponent {}
