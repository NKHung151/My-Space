import { Component, HostListener, OnInit, OnDestroy, computed, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, of, Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CurrentUser } from '../../core/auth/current-user.model';
import { ToastService } from '../../core/notifications/toast.service';
import { getApiErrorMessage } from '../../core/http/api-error.util';
import { Post } from '../posts/models/post.model';
import { AuthorPostsService } from '../posts/services/author-posts.service';
import { FeedPostsService } from '../posts/services/feed-posts.service';
import { FriendUser } from '../friends/models/friend.model';
import { FriendsService } from '../friends/services/friends.service';
import { User } from '../users/models/user.model';
import { UsersService } from '../users/services/users.service';
import { EditorUploadsService } from '../workspace/services/editor-uploads.service';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';
import { FriendButtonComponent } from '../friends/components/friend-button/friend-button.component';
import { PostCardComponent } from '../posts/components/post-card/post-card.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AssetImageDirective, FriendButtonComponent, PostCardComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  host: { class: 'feature-page-profile' },
})
export class ProfileComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private postsService = inject(AuthorPostsService);
  private feedPostsService = inject(FeedPostsService);
  private usersService = inject(UsersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private friendsService = inject(FriendsService);
  private uploadsService = inject(EditorUploadsService);
  private toast = inject(ToastService);

  private observer?: IntersectionObserver;
  private routeSubscription?: Subscription;
  private feedSubscription?: Subscription;
  viewedUserId: string | null = null;
  user = signal<CurrentUser | null>(this.authService.currentUser());
  isOwnProfile = signal(true);

  profileForm = {
    displayName: '',
    username: '',
    bio: ''
  };

  posts = signal<Post[]>([]);
  page = 1;
  feedLoading = signal(false);
  publicPostsCount = signal(0);

  friendsCount = signal(0);
  loadingProfile = signal(true);
  

  // Modals state
  showFriendsModal = signal(false);
  peopleModalMode = signal<'friends'>('friends');
  people = signal<FriendUser[]>([]);
  peopleLoading = signal(false);
  peopleSearch = signal('');
  failedPeopleAvatarIds = signal<Set<string>>(new Set());
  filteredPeople = computed(() => {
    const query = this.peopleSearch().trim().toLowerCase();
    if (!query) {
      return this.people();
    }

    return this.people().filter(person =>
      [person.displayName, person.username, person.bio]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(query)),
    );
  });



  ngOnInit() {


    this.routeSubscription = this.route.paramMap.subscribe(params => {
      this.loadProfile(params.get('id'));
    });
  }

  ngOnDestroy() {
    this.routeSubscription?.unsubscribe();
    this.feedSubscription?.unsubscribe();
    this.observer?.disconnect();
    document.body.classList.remove('profile-modal-open');
  }

  get avatarUrl(): string {
    const url = this.user()?.avatarUrl;
    return url ? this.uploadsService.toAbsoluteUrl(url) : '';
  }

  @ViewChild('scrollTrigger') set scrollTrigger(el: ElementRef<HTMLElement> | undefined) {
    if (el) {
      if (!this.observer) {
        this.observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting && !this.feedLoading() && this.posts().length < this.publicPostsCount()) {
            this.page++;
            this.loadPosts();
          }
        }, { rootMargin: '200px' });
      }
      this.observer.observe(el.nativeElement);
    } else {
      this.observer?.disconnect();
      this.observer = undefined;
    }
  }

  openPeopleModal(mode: 'friends', event?: Event): void {
    event?.preventDefault();
    this.peopleModalMode.set(mode);
    this.peopleSearch.set('');
    this.people.set([]);
    this.failedPeopleAvatarIds.set(new Set());
    this.peopleLoading.set(true);
    this.showFriendsModal.set(true);
    document.body.classList.add('profile-modal-open');

    const request: Observable<Array<any>> = this.isOwnProfile()
      ? this.friendsService.getFriends()
      : of([]);
    request.subscribe({
      next: people => {
        if (this.showFriendsModal() && this.peopleModalMode() === mode) {
          this.people.set(people.map(person => this.toFriendUser(person)));
        }
        this.peopleLoading.set(false);
      },
      error: err => {
        this.peopleLoading.set(false);
        this.toast.showError(this.formatError(err));
      },
    });
  }

  closePeopleModal(): void {
    this.showFriendsModal.set(false);
    this.peopleSearch.set('');
    document.body.classList.remove('profile-modal-open');
  }

  peopleModalTitle(): string {
    return 'Bạn bè';
  }

  peopleSearchPlaceholder(): string {
    return 'Tìm kiếm bạn bè...';
  }

  personDisplayName(person: FriendUser): string {
    return person.displayName || person.username;
  }

  personAvatar(person: FriendUser): string {
    return person.avatarUrl && !this.failedPeopleAvatarIds().has(person.id)
      ? this.uploadsService.toAbsoluteUrl(person.avatarUrl)
      : 'assets/images/default-avatar.svg';
  }

  handlePeopleAvatarError(personId: string): void {
    this.failedPeopleAvatarIds.update(ids => new Set(ids).add(personId));
  }

  @HostListener('document:click', ['$event'])
  closeFloatingMenus(): void {
  }

  @HostListener('document:keydown.escape')
  closeProfileOverlays(): void {
    this.closePeopleModal();
  }

  deletePost(post: Post): void {
    this.postsService.deleteAuthorPostPermanently(post.id).subscribe({
      next: () => {
        this.posts.update(posts => posts.filter(p => p.id !== post.id));
        this.publicPostsCount.update(count => count - 1);
        this.toast.showSuccess('Đã xóa bài viết.');
      },
      error: (err: any) => this.toast.showError(this.formatError(err), 'Không thể xóa bài viết')
    });
  }

  private loadProfile(routeUserId: string | null): void {
    const currentUser = this.authService.currentUser();
    const ownProfile = !routeUserId || String(currentUser?.id) === routeUserId;
    this.isOwnProfile.set(ownProfile);
    this.viewedUserId = routeUserId || (currentUser ? String(currentUser.id) : null);
    this.loadingProfile.set(true);
    this.page = 1;
    this.posts.set([]);
    this.publicPostsCount.set(0);
    this.friendsCount.set(0);

    if (ownProfile) {
      this.user.set(currentUser);
      this.setProfileForm(currentUser);
      this.loadOwnProfile();
      return;
    }

    const publicUserId = routeUserId;
    if (!publicUserId) {
      this.loadingProfile.set(false);
      this.toast.showError('Không tìm thấy hồ sơ.');
      void this.router.navigate(['/home']);
      return;
    }

    this.usersService.getPublicProfile(publicUserId).subscribe({
      next: profile => {
        const user: CurrentUser = {
          id: profile.id,
          email: '',
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl || undefined,
          bio: profile.bio,
          accentColor: profile.accentColor,
          role: profile.role,
        };
        this.user.set(user);
        this.setProfileForm(user);
        this.friendsCount.set(profile.friendsCount || 0);
        this.loadingProfile.set(false);
      },
      error: err => {
        this.loadingProfile.set(false);
        this.toast.showError(this.formatError(err));
      },
    });

    this.loadPosts();
  }

  private loadPosts(): void {
    if (!this.viewedUserId) return;
    this.feedSubscription?.unsubscribe();
    this.feedLoading.set(true);
    this.feedSubscription = this.feedPostsService.list({
      authorId: Number(this.viewedUserId),
      limit: 10,
      page: this.page,
    }).subscribe({
      next: response => {
        if (this.page === 1) {
          this.posts.set(response.items);
        } else {
          this.posts.set([...this.posts(), ...response.items]);
        }
        this.publicPostsCount.set(response.meta.total);
        this.feedLoading.set(false);
      },
      error: err => {
        this.toast.showError(this.formatError(err));
        this.feedLoading.set(false);
      },
    });
  }

  private loadOwnProfile(): void {
    this.authService.getMe().subscribe({
      next: user => {
        this.user.set(user);
        this.viewedUserId = String(user.id);
        this.setProfileForm(user);
        this.loadingProfile.set(false);

        // Read counts directly from the getMe() response (no extra API call needed)
        this.friendsCount.set(user.friendsCount ?? 0);

        this.loadPosts();
      },
      error: err => {
        this.toast.showError(this.formatError(err));
        this.loadingProfile.set(false);
      },
    });
  }
  private toFriendUser(person: FriendUser | User): FriendUser {
    return {
      id: person.id,
      username: person.username,
      displayName: person.displayName,
      avatarUrl: person.avatarUrl || null,
      bio: person.bio || null,
    };
  }

  private setProfileForm(user: CurrentUser | User | null): void {
    if (!user) {
      return;
    }
    const dName = user.displayName;
    const uName = user.username;
    
    this.profileForm = {
      displayName: dName || uName,
      username: `@${uName.replace(/^@/, '')}`,
      bio: user.bio || '',
    };
  }





  private formatError(error: unknown): string {
    return getApiErrorMessage(error, 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.', true);
  }
}
