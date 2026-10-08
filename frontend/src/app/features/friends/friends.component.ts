import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FriendsService } from './services/friends.service';
import { PostCardComponent } from '../posts/components/post-card/post-card.component';
import { AuthorTooltipComponent } from '../users/components/author-tooltip/author-tooltip.component';
import { FriendButtonComponent } from './components/friend-button/friend-button.component';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';
import { Post } from '../posts/models/post.model';
import { FriendUser } from './models/friend.model';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PostCardComponent, AuthorTooltipComponent, FriendButtonComponent, AssetImageDirective],
  templateUrl: './friends.component.html',
  styleUrl: './friends.component.scss'
})
export class FriendsComponent implements OnInit {
  private readonly friendsService = inject(FriendsService);
  private readonly route = inject(ActivatedRoute);

  tab: 'feed' | 'friends' | 'requests' = 'feed';
  
  posts: Post[] = [];
  friends: FriendUser[] = [];
  requests: any[] = [];
  
  loading = true;
  loadingFeed = false;
  
  page = 1;
  hasMorePosts = true;

  ngOnInit(): void {
    // Theo dõi query params để mở đúng tab (ví dụ: ?tab=requests)
    this.route.queryParams.subscribe(params => {
      const tabParam = params['tab'];
      if (tabParam === 'requests' || tabParam === 'friends' || tabParam === 'feed') {
        this.tab = tabParam;
      }
      this.loadData();
    });
  }

  setTab(newTab: 'feed' | 'friends' | 'requests') {
    this.tab = newTab;
    this.loadData();
  }

  loadData() {
    this.loading = true;
    if (this.tab === 'feed') {
      this.page = 1;
      this.friendsService.getFeed(this.page, 20).subscribe({
        next: (res) => {
          this.posts = res.items;
          this.hasMorePosts = res.meta.page < res.meta.totalPages;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    } else if (this.tab === 'friends') {
      this.friendsService.getFriends().subscribe({
        next: (res) => {
          this.friends = res;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    } else if (this.tab === 'requests') {
      this.friendsService.getRequests().subscribe({
        next: (res) => {
          this.requests = res;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    }
  }

  loadMoreFeed() {
    if (this.loadingFeed || !this.hasMorePosts) return;
    this.loadingFeed = true;
    this.page++;
    this.friendsService.getFeed(this.page, 20).subscribe({
      next: (res) => {
        this.posts = [...this.posts, ...res.items];
        this.hasMorePosts = res.meta.page < res.meta.totalPages;
        this.loadingFeed = false;
      },
      error: () => {
        this.loadingFeed = false;
      }
    });
  }
}
