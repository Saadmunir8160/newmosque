import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommunitiesService, CommunityPost, CommunityEvent } from '../../core/services/communities.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-member-community-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, FormsModule],
  template: `
    <app-page-header badge="Community" title="Community Feed" subtitle="Stay updated with posts and events." />
    <div class="mt-4">
      <a routerLink=".." class="text-blue-500 mb-4 inline-block">&larr; Back to Communities</a>
      
      <div *ngIf="loading()" class="mt-4 text-gray-500">Loading feed...</div>
      
      <div *ngIf="!loading()">
        <!-- New Post (MVP text-only) -->
        <div class="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 class="font-bold mb-2">Write a Post</h3>
          <textarea [(ngModel)]="newPostContent" class="w-full p-2 border rounded" rows="3" placeholder="Share something with the community..."></textarea>
          <input [(ngModel)]="newPostHadithRef" type="text" class="w-full p-2 border rounded mt-2" placeholder="Hadith Reference (optional)">
          <button (click)="createPost()" [disabled]="!newPostContent.trim()" class="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Post</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="md:col-span-2 space-y-4">
            <h3 class="font-bold text-lg border-b pb-2">Recent Posts</h3>
            <p *ngIf="!posts().length" class="text-gray-500 italic">No posts yet.</p>
            
            <article *ngFor="let p of posts()" class="p-4 border rounded shadow-sm bg-white">
              <div class="text-sm text-gray-500 mb-2">{{ p.createdAt | date:'medium' }}</div>
              <p class="whitespace-pre-wrap">{{ p.content }}</p>
              <div *ngIf="p.hadithRef" class="mt-3 p-2 bg-green-50 border-l-4 border-green-500 text-sm italic text-gray-700">
                <span class="font-bold text-green-700">Hadith Ref:</span> {{ p.hadithRef }}
              </div>
            </article>
          </div>
          
          <div class="space-y-4">
            <h3 class="font-bold text-lg border-b pb-2">Upcoming Events</h3>
            <p *ngIf="!events().length" class="text-gray-500 italic">No linked events.</p>
            
            <div *ngFor="let ce of events()" class="p-3 border rounded shadow-sm bg-white">
              <h4 class="font-semibold">{{ ce.event?.title || 'Event #' + ce.eventId }}</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MemberCommunityDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(CommunitiesService);
  
  loading = signal(true);
  posts = signal<CommunityPost[]>([]);
  events = signal<CommunityEvent[]>([]);
  
  newPostContent = '';
  newPostHadithRef = '';
  communityId!: number;
  
  ngOnInit() {
    this.communityId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.communityId) {
      this.load();
    }
  }
  
  load() {
    this.loading.set(true);
    this.svc.getPosts(this.communityId).subscribe(p => {
      this.posts.set(p);
      this.svc.getEvents(this.communityId).subscribe(e => {
        this.events.set(e);
        this.loading.set(false);
      });
    });
  }
  
  createPost() {
    if (!this.newPostContent.trim()) return;
    this.svc.createPost(this.communityId, {
      content: this.newPostContent,
      hadithRef: this.newPostHadithRef || undefined
    }).subscribe(p => {
      this.posts.update(curr => [p, ...curr]);
      this.newPostContent = '';
      this.newPostHadithRef = '';
    });
  }
}
