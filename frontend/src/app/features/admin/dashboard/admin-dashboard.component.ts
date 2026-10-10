import { Component, computed, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiStateComponent } from '../../../shared/components/ui-state/ui-state.component';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';

import { AdminDashboardOverview } from './models/admin-dashboard.model';
import { AdminDashboardService } from './services/admin-dashboard.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, UiStateComponent, AssetImageDirective],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private readonly dashboardService = inject(AdminDashboardService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly overview = signal<AdminDashboardOverview | null>(null);
  readonly stats = computed(() => {
    const summary = this.overview()?.summary;
    return [
      { label: 'Tổng người dùng', icon: 'bi-people-fill', value: summary?.totalUsers ?? 0, route: '/admin/users' },
      { label: 'Tổng bài viết', icon: 'bi-journal-text', value: summary?.totalArticles ?? 0, route: '/admin/posts' },
      { label: 'Tổng bình luận', icon: 'bi-chat-dots-fill', value: summary?.totalComments ?? 0, route: null },
      { label: 'Tổng lượt thích', icon: 'bi-heart-fill', value: summary?.totalLikes ?? 0, route: null },
    ];
  });
  readonly growthChart = computed(() => this.normalize(
    this.overview()?.users.growth.map(point => point.count) ?? [],
  ));
  readonly articleChart = computed(() => this.normalize(
    this.overview()?.posts.topArticles.map(article => article.viewCount) ?? [],
  ));

  ngOnInit(): void {
    this.loadOverview();
  }

  loadOverview(): void {
    this.loading.set(true);
    this.error.set('');
    this.dashboardService.getOverview().subscribe({
      next: overview => {
        this.overview.set(overview);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không thể tải số liệu bảng điều khiển.');
        this.loading.set(false);
      },
    });
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat("vi").format(value);
  }

  dayLabel(date: string): string {
    return new Intl.DateTimeFormat("vi", { weekday: 'short', timeZone: 'UTC' })
      .format(new Date(`${date}T00:00:00Z`));
  }

  private normalize(values: number[]): number[] {
    const maximum = Math.max(...values, 0);
    return values.map(value => maximum ? Math.max(5, Math.round((value / maximum) * 100)) : 0);
  }
}
