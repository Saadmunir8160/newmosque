import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);

  setPage(title: string, description?: string, keywords?: string, imageUrl?: string): void {
    const full = title.includes('MosqueOS') ? title : `${title} | MosqueOS`;
    this.title.setTitle(full);
    if (description) {
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ property: 'og:description', content: description });
    }
    if (keywords) this.meta.updateTag({ name: 'keywords', content: keywords });
    this.meta.updateTag({ property: 'og:title', content: full });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    if (imageUrl) this.meta.updateTag({ property: 'og:image', content: imageUrl });
  }
}
