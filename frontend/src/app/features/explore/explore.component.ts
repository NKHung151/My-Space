import { Component, OnDestroy, OnInit, AfterViewInit, ElementRef, ViewChild, inject, DestroyRef } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Subject, debounceTime, distinctUntilChanged, Subscription, forkJoin, map, switchMap, tap, of, catchError } from 'rxjs';
import { FeedPostsService } from '../posts/services/feed-posts.service';
import { UsersService } from '../users/services/users.service';

import { CommonModule } from '@angular/common';
import { PostCardComponent } from '../posts/components/post-card/post-card.component';
import { User } from '../users/models/user.model';
import { Post } from '../posts/models/post.model';
import { FormsModule } from '@angular/forms';
import { AuthorTooltipComponent } from '../users/components/author-tooltip/author-tooltip.component';
import { FriendButtonComponent } from '../friends/components/friend-button/friend-button.component';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent, FormsModule, AuthorTooltipComponent, FriendButtonComponent, AssetImageDirective],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss'
})
export class ExploreComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('stickyHeader') stickyHeaderRef!: ElementRef<HTMLElement>;
  
  @ViewChild('infiniteScrollTrigger') set infiniteScrollTrigger(el: ElementRef<HTMLElement> | undefined) {
    if (el && this.scrollObserver) {
      this.scrollObserver.disconnect();
      this.scrollObserver.observe(el.nativeElement);
    }
  }
  
  private headerObserver?: IntersectionObserver;
  private scrollObserver?: IntersectionObserver;

  private readonly postsService = inject(FeedPostsService);
  private readonly userService = inject(UsersService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  query = '';
  tab: 'top' | 'posts' | 'people' = 'top';

  topPosts: Post[] = [];
  featuredPeople: User[] = [];

  posts: Post[] = [];
  people: User[] = [];
  onlyVideo = false;
  popularTags: Array<{tag: string, count: number}> = [];


  loading = false;
  error = '';
  
  page = 1;
  totalPages = 1;
  loadingMore = false;
  
  selectedTag?: string;

  private readonly filterSubject = new BehaviorSubject<{query: string, tab: string, tag?: string, video?: boolean}>({
    query: '',
    tab: 'top',
    video: false
  });
  private readonly loadMoreSubject = new Subject<{ page: number }>();
  private searchSubscription?: Subscription;

  hasInitialized = false;

  constructor() {}

  ngAfterViewInit() {
    if (this.stickyHeaderRef) {
      const sentinel = document.createElement('div');
      this.stickyHeaderRef.nativeElement.parentElement?.insertBefore(
        sentinel, this.stickyHeaderRef.nativeElement
      );
      this.headerObserver = new IntersectionObserver(
        ([entry]) => {
          this.stickyHeaderRef.nativeElement.classList.toggle('is-stuck', !entry.isIntersecting);
        },
        { threshold: 1 }
      );
      this.headerObserver.observe(sentinel);
    }
    
    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this.loading && !this.loadingMore) {
          this.loadMore();
        }
      },
      { rootMargin: '200px' }
    );
  }

  ngOnInit(): void {
    // Load popular tags for the "Chủ đề" tab
    this.postsService.getPopularTags(20).subscribe(tags => {
      this.popularTags = tags;
    });

    this.route.queryParamMap.pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(params => {
        const urlQuery = params.get('query') || '';
        if (urlQuery !== this.query) {
          this.query = urlQuery;
        }

        const urlTab = this.parseTab(params.get('tab'));
        const hasExplicitTab = params.has('tab');
        const urlTag = params.get('tag');
        const urlVideo = params.get('video') === 'true';

        if (urlVideo !== this.onlyVideo) {
          this.onlyVideo = urlVideo;
        }

        if (urlTag) {
          this.selectedTag = urlTag;
          this.tab = hasExplicitTab ? urlTab : 'posts';
          this.emitFilters(this.selectedTag);
        } else {
          this.selectedTag = undefined;
          this.tab = urlTab;
          this.emitFilters();
        }
      })
    ).subscribe();

    this.searchSubscription = this.filterSubject.pipe(
      debounceTime(300),
      distinctUntilChanged((prev, curr) => prev.query === curr.query
        && prev.tab === curr.tab
        && prev.tag === curr.tag
        && prev.video === curr.video),
      tap(() => {
        this.loading = true;
        this.error = '';
        this.page = 1;
      }),
      switchMap(({ query, tab, tag, video }) => {
        const q = query.trim().toLowerCase();
        
        if (tab === 'top') {
          return forkJoin({
            posts: this.postsService.list({ q, tag, limit: 10, sort: 'trending' }).pipe(map(res => res.items)),
            people: this.userService.getRecommended(q, 2, 1).pipe(map(res => res.items))
          }).pipe(map(res => ({ tab, data: res })));
        } else if (tab === 'posts') {
          return this.postsService.list({ q, tag, hasVideo: video ? true : undefined, limit: 20, sort: 'trending', page: 1 }).pipe(
            map(res => ({ tab, data: res }))
          );
        } else if (tab === 'people') {
          return this.userService.getRecommended(q, 20, 1).pipe(
            map(res => ({ tab, data: res }))
          );
        }
        return of(null);
      }),
      catchError(() => {
        this.handleError();
        return of(null);
      })
    ).subscribe((result: any) => {
      if (!result) return;
      this.loading = false;
      const { tab, data } = result;
      this.hasInitialized = true; 

      if (tab === 'top') {
        this.topPosts = data.posts;
        this.featuredPeople = data.people;
      } else if (tab === 'posts') {
        this.posts = data.items;
        this.totalPages = data.meta.totalPages;
      } else if (tab === 'people') {
        this.people = data.items;
        this.totalPages = data.meta.totalPages;
      }
    });

    this.loadMoreSubject.pipe(
      debounceTime(300),
      switchMap(({ page }) => {
        this.loadingMore = true;
        const q = this.query.trim().toLowerCase();
        if (this.tab === 'posts') {
          return this.postsService.list({
            q,
            tag: this.selectedTag,
            hasVideo: this.onlyVideo ? true : undefined,
            limit: 20, sort: 'trending', page,
          }).pipe(map(res => ({ kind: 'posts' as const, res })));
        } else if (this.tab === 'people') {
          return this.userService.getRecommended(q, 20, page).pipe(
            map(res => ({ kind: 'people' as const, res }))
          );
        }
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef),
      catchError(() => { this.loadingMore = false; return of(null); })
    ).subscribe((result) => {
      if (!result) { this.loadingMore = false; return; }
      
      if (result.kind === 'posts') {
        this.posts = [...this.posts, ...result.res.items];
        this.totalPages = result.res.meta.totalPages;
      } else if (result.kind === 'people') {
        this.people = [...this.people, ...result.res.items];
        this.totalPages = result.res.meta.totalPages;
      }
      this.loadingMore = false;
    });
  }

  ngOnDestroy(): void {
    this.headerObserver?.disconnect();
    this.scrollObserver?.disconnect();
    this.searchSubscription?.unsubscribe();
  }

  loadMore(): void {
    if ((this.tab !== 'posts' && this.tab !== 'people') || this.page >= this.totalPages || this.loadingMore) return;
    this.loadingMore = true;
    this.page++;
    this.loadMoreSubject.next({ page: this.page });
  }

  updateQuery(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
    this.emitFilters(this.selectedTag);
    this.updateRoute({ query: this.query.trim() || null }, true);
  }

  clearQuery(): void {
    this.query = '';
    this.emitFilters(this.selectedTag);
    this.updateRoute({ query: null }, true);
  }

  setTab(tab: 'top' | 'posts' | 'people'): void {
    if (this.tab !== tab) {
      this.tab = tab;
      this.emitFilters(this.selectedTag);
      this.updateRoute({ tab });
    }
  }

  toggleVideo(): void {
    this.onlyVideo = !this.onlyVideo;
    this.emitFilters(this.selectedTag);
    this.updateRoute({ video: this.onlyVideo ? 'true' : null });
  }

  selectTag(tag: string): void {
    this.selectedTag = tag;
    this.tab = 'posts';
    this.emitFilters(this.selectedTag);
    this.updateRoute({ tag, tab: 'posts' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearTag(): void {
    this.selectedTag = undefined;
    this.emitFilters();
    this.updateRoute({ tag: null });
  }
  
  private emitFilters(tag?: string): void {
    this.filterSubject.next({
      query: this.query,
      tab: this.tab,
      tag,
      video: this.onlyVideo
    });
  }

  private parseTab(value: string | null): 'top' | 'posts' | 'people' {
    return value === 'posts' || value === 'people' ? value : 'top';
  }

  private updateRoute(
    queryParams: Record<string, string | null>,
    replaceUrl = false,
  ): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  private handleError(): void {
    this.error = 'Unable to load explore data.';
    this.loading = false;
  }

  isCurrentTabEmpty(): boolean {
    if (!this.hasInitialized) return false;

    switch (this.tab) {
      case 'top':
        return this.topPosts.length === 0 && this.featuredPeople.length === 0;
      case 'posts':
        return this.posts.length === 0;
      case 'people':
        return this.people.length === 0;
      default:
        return true;
    }
  }
}
