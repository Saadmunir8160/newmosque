import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MosqueService } from '../../../core/services/mosque.service';
import { Mosque } from '../../../core/models';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-mosque-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mosque-directory.component.html',
  styleUrls: ['./mosque-directory.component.css'],
})
export class MosqueDirectoryComponent implements OnInit {
  private mosqueService = inject(MosqueService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seo = inject(SeoService);

  mosques = signal<Mosque[]>([]);
  loading = signal(false);
  searched = signal(false);
  error = signal('');
  total = signal(0);
  page = signal(1);
  totalPages = signal(1);

  name = '';
  city = '';
  postcode = '';
  country = '';
  statusFilter: 'all' | 'Active' | 'Unclaimed' = 'all';

  readonly pageSize = 12;
  readonly statusOptions: { value: 'all' | 'Active' | 'Unclaimed'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'Active', label: 'Active' },
    { value: 'Unclaimed', label: 'Unclaimed' },
  ];

  ngOnInit(): void {
    this.seo.setPage(
      'Mosque Directory',
      'Find mosque public profiles by name, city, postcode, country, and status.',
      'mosque directory, mosque near me, public mosque profile',
    );

    this.route.queryParams.subscribe(p => {
      this.name = p['name'] ?? '';
      this.city = p['city'] ?? '';
      this.postcode = p['postcode'] ?? '';
      this.country = p['country'] ?? '';
      this.statusFilter = this.toStatusFilter(p['status']);
      this.page.set(Math.max(1, Number(p['page'] ?? 1) || 1));
      this.doSearch();
    });
  }

  search(): void {
    this.navigateToPage(1);
  }

  navigateToPage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        name: this.name || null,
        city: this.city || null,
        postcode: this.postcode || null,
        country: this.country || null,
        status: this.statusFilter !== 'all' ? this.statusFilter : null,
        page: page > 1 ? page : null,
      },
    });
  }

  setStatus(value: 'all' | 'Active' | 'Unclaimed'): void {
    this.statusFilter = value;
    this.search();
  }

  clear(): void {
    this.name = '';
    this.city = '';
    this.postcode = '';
    this.country = '';
    this.statusFilter = 'all';
    this.search();
  }

  hasFilters(): boolean {
    return !!(this.name || this.city || this.postcode || this.country || this.statusFilter !== 'all');
  }

  initial(name: string): string {
    return name?.trim().charAt(0).toUpperCase() || 'M';
  }

  pageStart(): number {
    return this.total() ? ((this.page() - 1) * this.pageSize) + 1 : 0;
  }

  pageEnd(): number {
    return Math.min(this.page() * this.pageSize, this.total());
  }

  previousPage(): void {
    if (this.page() > 1) this.navigateToPage(this.page() - 1);
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) this.navigateToPage(this.page() + 1);
  }

  private toStatusFilter(value: unknown): 'all' | 'Active' | 'Unclaimed' {
    return value === 'Active' || value === 'Unclaimed' ? value : 'all';
  }

  private doSearch(): void {
    this.loading.set(true);
    this.error.set('');
    this.mosqueService.getMosqueDirectory({
      name: this.name,
      city: this.city,
      postcode: this.postcode,
      country: this.country,
      status: this.statusFilter !== 'all' ? this.statusFilter : undefined,
      page: this.page(),
      pageSize: this.pageSize,
    }).subscribe({
      next: (res) => {
        const totalPages = Math.max(1, res.totalPages);
        if (res.total > 0 && this.page() > totalPages) {
          this.navigateToPage(totalPages);
          return;
        }

        this.mosques.set(res.items);
        this.total.set(res.total);
        this.page.set(res.page);
        this.totalPages.set(totalPages);
        this.searched.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load mosque listings. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
