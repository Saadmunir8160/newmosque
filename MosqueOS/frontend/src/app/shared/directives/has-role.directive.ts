import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Directive({ selector: '[appHasRole]', standalone: true })
export class HasRoleDirective {
  private auth = inject(AuthService);
  private template = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private roles: string[] = [];

  @Input() set appHasRole(value: string | string[]) {
    this.roles = Array.isArray(value) ? value : [value];
    this.render();
  }

  constructor() {
    effect(() => {
      this.auth.roles();
      this.auth.isAuthenticated();
      this.render();
    });
  }

  private render(): void {
    this.vcr.clear();
    if (!this.roles.length) return;
    if (this.auth.hasAnyRole(this.roles)) {
      this.vcr.createEmbeddedView(this.template);
    }
  }
}
