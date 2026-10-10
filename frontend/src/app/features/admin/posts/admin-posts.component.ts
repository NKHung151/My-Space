import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PageMeta } from '../../../core/http/api-response.model';
import { ToastService } from '../../../core/notifications/toast.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { UiStateComponent } from '../../../shared/components/ui-state/ui-state.component';

import { AdminPost } from './models/admin-post.model';
import { AdminPostsService } from './services/admin-posts.service';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';
import { LocalizedDatePipe } from '../../../shared/pipes/localized-date.pipe';
import { ConfirmModalService } from '../../../shared/services/confirm-modal.service';

@Component({
  selector: 'app-admin-posts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent, UiStateComponent, AssetImageDirective, LocalizedDatePipe],
  templateUrl: './admin-posts.component.html',
  styleUrl: './admin-posts.component.scss',
})
export class AdminPostsComponent implements OnInit {
  private readonly postsService = inject(AdminPostsService);
  private readonly toastService = inject(ToastService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private detailRequestVersion = 0;

  readonly posts = signal<AdminPost[]>([]);

  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly selectedPost = signal<AdminPost | null>(null);
  readonly panelOpen = signal(false);
  readonly pagination = signal<PageMeta>({ total: 0, page: 1, limit: 8, totalPages: 0 });

  readonly filterForm = this.fb.nonNullable.group({
    search: '',
    tag: '',
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.filterForm.setValue({
      search: params.get('search') ?? '',
      tag: params.get('tag') ?? '',
    }, { emitEvent: false });

    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.loadPosts(1));

    this.loadPosts(this.readPage(params.get('page')));
  }

  loadPosts(page = 1): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.syncQueryParams(page);
    const filters = this.filterForm.getRawValue();
    this.postsService.getPosts({
      search: filters.search.trim(),
      tag: filters.tag || undefined,
      page,
      limit: this.pagination().limit,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.posts.set(response.items);
        this.pagination.set(response.meta);
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

    this.postsService.getPost(post.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: post => {
        if (requestVersion !== this.detailRequestVersion || !this.panelOpen()) return;
        this.selectedPost.set(post);
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

  async deletePost(): Promise<void> {
    const post = this.selectedPost();
    if (!post || this.saving()) return;
    const confirmed = await this.confirmModal.open({
      title: 'Xóa bài viết?',
      message: `Bài viết "${post.title}" sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.`,
      confirmText: 'Xóa',
      danger: true,
    });
    if (!confirmed || this.selectedPost()?.id !== post.id) return;
    this.saving.set(true);
    this.postsService.deletePost(post.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    const filters = this.filterForm.getRawValue();
    void this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        search: filters.search.trim() || null,
        tag: filters.tag || null,
        page: page > 1 ? page : null,
      },
    });
  }

  private readPage(value: string | null): number {
    const page = Number(value);
    return Number.isInteger(page) && page > 0 ? page : 1;
  }
}
