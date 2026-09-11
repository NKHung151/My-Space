import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PaginationMeta } from '../../../core/http/api-response.model';
import { ToastService } from '../../../core/notifications/toast.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { UiStateComponent } from '../../../shared/components/ui-state/ui-state.component';

import { AdminPost } from './models/admin-post.model';
import { AdminPostsService } from './services/admin-posts.service';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';
import { LocalizedDatePipe } from '../../../shared/pipes/localized-date.pipe';

@Component({
  selector: 'app-admin-posts',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, UiStateComponent, AssetImageDirective, LocalizedDatePipe],
  templateUrl: './admin-posts.component.html',
  styleUrl: './admin-posts.component.scss',
})
export class AdminPostsComponent implements OnInit, OnDestroy {
  private readonly postsService = inject(AdminPostsService);

  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  private detailRequestVersion = 0;

  readonly posts = signal<AdminPost[]>([]);

  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly selectedPost = signal<AdminPost | null>(null);
  readonly panelOpen = signal(false);
  readonly pagination = signal<PaginationMeta>({ total: 0, page: 1, limit: 8, totalPages: 0 });

  search = '';
  tag = '';

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.search = params.get('search') ?? '';
    this.tag = params.get('tag') ?? '';
    this.loadPosts(this.readPage(params.get('page')));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPosts(page = 1): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.syncQueryParams(page);
    this.postsService.getPosts({
      search: this.search.trim(),
      tag: this.tag || undefined,
      page,
      limit: this.pagination().limit,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.posts.set(response.data);
        if (response.meta) this.pagination.set(response.meta);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không thể tải bài viết');
        this.loading.set(false);
      },
    });
  }

  openPanel(post: AdminPost): void {
    const requestVersion = ++this.detailRequestVersion;
    this.panelOpen.set(true);
    this.detailLoading.set(true);
    this.selectedPost.set(post);

    this.postsService.getPost(post.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        if (requestVersion !== this.detailRequestVersion || !this.panelOpen()) return;
        this.selectedPost.set(response.data);
        this.detailLoading.set(false);
      },
      error: () => {
        if (requestVersion !== this.detailRequestVersion || !this.panelOpen()) return;
        this.detailLoading.set(false);
        this.closePanel();
        this.toastService.showError('Không thể tải bài viết này.');
      },
    });
  }

  openFromKeyboard(event: KeyboardEvent, post: AdminPost): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPanel(post);
    }
  }

  closePanel(event?: Event): void {
    event?.stopPropagation();
    if (this.saving()) return;
    this.detailRequestVersion += 1;
    this.panelOpen.set(false);
    this.detailLoading.set(false);
    this.selectedPost.set(null);
  }

  deletePost(): void {
    const post = this.selectedPost();
    if (!post || this.saving()) return;
    this.saving.set(true);
    this.postsService.deletePost(post.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closePanel();
        this.toastService.showSuccess('Đã xóa bài viết.');
        this.loadPosts(this.pagination().page);
      },
      error: () => {
        this.saving.set(false);
        this.toastService.showError('Không thể xóa bài viết này.');
      },
    });
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.panelOpen()) this.closePanel();
  }

  private syncQueryParams(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        search: this.search.trim() || null,
        tag: this.tag || null,
        page: page > 1 ? page : null,
      },
    });
  }

  private readPage(value: string | null): number {
    const page = Number(value);
    return Number.isInteger(page) && page > 0 ? page : 1;
  }
}
