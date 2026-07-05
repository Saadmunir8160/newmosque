import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { NavigationService } from '../services/navigation.service';
import { AuthService } from '../auth/auth.service';
import { ROLES } from '../constants/roles';

@Directive({ selector: '[appHasPermission]', standalone: true })
export class HasPermissionDirective {
  private nav = inject(NavigationService);
  private auth = inject(AuthService);
  private template = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private permission = '';

  @Input() set appHasPermission(value: string) {
    this.permission = value;
    this.render();
  }

  constructor() {
    effect(() => {
      this.nav.permissions();
      this.auth.roles();
      this.render();
    });
  }

  private render(): void {
    this.vcr.clear();
    if (!this.permission) return;
    if (this.auth.hasRole(ROLES.SuperAdmin) || this.nav.hasPermission(this.permission)) {
      this.vcr.createEmbeddedView(this.template);
    }
  }
}
