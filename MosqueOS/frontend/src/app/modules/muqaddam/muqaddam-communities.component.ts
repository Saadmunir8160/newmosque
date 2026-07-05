import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MuqaddamService, TariqaCommunity, CommunityMemberRow } from '../../core/services/muqaddam.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { CardComponent } from '../../shared/ui/card.component';

@Component({
  selector: 'app-muqaddam-communities',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Muqaddam" title="Communities" subtitle="Create and manage your tariqa circles" />

    <app-card class="block mb-4">
      <h3 class="section">Create community</h3>
      <input class="input mb-2" [(ngModel)]="form.name" placeholder="Community name">
      <textarea class="input mb-2" rows="2" [(ngModel)]="form.description" placeholder="Description"></textarea>
      <button class="btn" (click)="create()">Create Tariqa Circle</button>
    </app-card>

    <div class="toolbar">
      <input class="input" placeholder="Search…" [(ngModel)]="search" (ngModelChange)="load()">
    </div>

    <app-card *ngFor="let c of communities()" class="block mb-4">
      <div *ngIf="editingId() !== c.id; else editTpl">
        <h4 class="text-white font-bold">{{ c.name }}</h4>
        <p class="text-mos-muted text-sm">{{ c.memberCount }} murids · {{ c.isPublic ? 'Public' : 'Private' }}</p>
        <p class="text-mos-muted text-sm mt-1">{{ c.description }}</p>
        <div class="actions mt-3">
          <button class="btn-sm" (click)="selectCommunity(c)">Manage members</button>
          <button class="btn-sm muted" (click)="startEdit(c)">Edit</button>
        </div>
      </div>
      <ng-template #editTpl>
        <input class="input mb-2" [(ngModel)]="editForm.name">
        <textarea class="input mb-2" rows="2" [(ngModel)]="editForm.description"></textarea>
        <div class="actions">
          <button class="btn-sm" (click)="saveEdit(c.id)">Save</button>
          <button class="btn-sm muted" (click)="editingId.set(null)">Cancel</button>
        </div>
      </ng-template>
    </app-card>

    <app-card *ngIf="selectedId()" class="block mt-4">
      <h3 class="section">Members</h3>
      <div class="add-row">
        <input class="input" [(ngModel)]="memberEmail" placeholder="Member email to add">
        <button class="btn-sm" (click)="addMember()">Add</button>
      </div>
      <div *ngFor="let m of members()" class="member-row">
        <span>{{ m.fullName }} <span class="role">({{ m.role }})</span></span>
        <button *ngIf="m.role === 'Member'" class="btn-sm danger" (click)="removeMember(m.userId)">Remove</button>
      </div>
    </app-card>
  `,
  styles: [`
    .section { margin: 0 0 0.75rem; color: #fcd34d; font-size: 0.875rem; font-weight: 600; }
    .input { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }
    .toolbar { margin-bottom: 1rem; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; }
    .btn-sm { background: #10b981; color: #0F172A; font-weight: 700; border: none; border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; cursor: pointer; margin-right: 0.5rem; }
    .muted { background: transparent; border: 1px solid #F8FAFC; color: #6ee7b7; }
    .danger { background: #ef4444; color: #fff; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .add-row { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
    .member-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: #d1fae5; font-size: 0.875rem; }
    .role { color: #6ee7b7; font-size: 0.75rem; }
  `]
})
export class MuqaddamCommunitiesComponent implements OnInit {
  private muqaddam = inject(MuqaddamService);
  private mosqueCtx = inject(MosqueContextService);
  communities = signal<TariqaCommunity[]>([]);
  members = signal<CommunityMemberRow[]>([]);
  selectedId = signal<number | null>(null);
  editingId = signal<number | null>(null);
  form = { name: '', description: '' };
  editForm = { name: '', description: '' };
  memberEmail = '';
  search = '';
  mosqueId = 1;

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => { this.mosqueId = id; this.load(); });
  }

  load(): void {
    this.muqaddam.getCommunities(this.mosqueId, this.search).subscribe(c => this.communities.set(c));
  }

  create(): void {
    if (!this.form.name.trim()) return;
    this.muqaddam.createCommunity({ ...this.form, mosqueId: this.mosqueId, isPublic: true }).subscribe(() => {
      this.form = { name: '', description: '' };
      this.load();
    });
  }

  startEdit(c: TariqaCommunity): void {
    this.editingId.set(c.id);
    this.editForm = { name: c.name, description: c.description ?? '' };
  }

  saveEdit(id: number): void {
    this.muqaddam.updateCommunity(id, this.editForm).subscribe(() => {
      this.editingId.set(null);
      this.load();
    });
  }

  selectCommunity(c: TariqaCommunity): void {
    this.selectedId.set(c.id);
    this.muqaddam.getMembers(c.id).subscribe(m => this.members.set(m));
  }

  addMember(): void {
    const id = this.selectedId();
    if (!id || !this.memberEmail.trim()) return;
    this.muqaddam.addMember(id, this.memberEmail.trim()).subscribe(() => {
      this.memberEmail = '';
      this.muqaddam.getMembers(id).subscribe(m => this.members.set(m));
      this.load();
    });
  }

  removeMember(userId: string): void {
    const id = this.selectedId();
    if (!id) return;
    this.muqaddam.removeMember(id, userId).subscribe(() => {
      this.muqaddam.getMembers(id).subscribe(m => this.members.set(m));
      this.load();
    });
  }
}
