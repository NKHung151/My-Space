import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
export class FriendsComponent implements OnInit, OnDestroy {
  private readonly friendsService = inject(FriendsService);

  tab: 'feed' | 'friends' | 'requests' = 'feed';
  
  posts: Post[] = [];
  friends: FriendUser[] = [];
  requests: any[] = [];
  
  loading = true;
  loadingFeed = false;
  
  page = 1;
  hasMorePosts = true;

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {}

  setTab(newTab: 'feed' | 'friends' | 'requests') {
    this.tab = newTab;
    this.loadData();
  }

  loadData() {
    this.loading = true;
    if (this.tab === 'feed') {
      this.page = 1;
      this.friendsService.getFeed(this.page, 20).subscribe(res => {
        this.posts = res.items;
        this.hasMorePosts = res.meta.page < res.meta.totalPages;
        this.loading = false;
      });
    } else if (this.tab === 'friends') {
      this.friendsService.getFriends().subscribe(res => {
        this.friends = res;
        this.loading = false;
      });
    } else if (this.tab === 'requests') {
      this.friendsService.getRequests().subscribe(res => {
        this.requests = res;
        this.loading = false;
      });
    }
  }

  loadMoreFeed() {
    if (this.loadingFeed || !this.hasMorePosts) return;
    this.loadingFeed = true;
    this.page++;
    this.friendsService.getFeed(this.page, 20).subscribe(res => {
      this.posts = [...this.posts, ...res.items];
      this.hasMorePosts = res.meta.page < res.meta.totalPages;
      this.loadingFeed = false;
    });
  }
}
