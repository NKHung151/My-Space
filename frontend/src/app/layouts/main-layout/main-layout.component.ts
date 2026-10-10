import { CommonModule } from '@angular/common';
import { afterNextRender, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from './sidebar/sidebar.component';
import { MobileHeaderComponent } from './mobile-header/mobile-header.component';

import { BrandComponent } from '../../shared/components/brand/brand.component';
import { RightSidebarComponent } from './right-sidebar/right-sidebar.component';
import { ChatWindowComponent } from '../../features/chat/components/chat-window/chat-window.component';
import { ChatManagerService } from '../../features/chat/services/chat-manager.service';
import { CallModalComponent } from '../../features/calls/components/call-modal/call-modal.component';
import { goHome } from './go-home';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, MobileHeaderComponent, BrandComponent, RightSidebarComponent, ChatWindowComponent, CallModalComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  public readonly chatManager = inject(ChatManagerService);
  private lastContentPath = '';

  @ViewChild('centerFeed') private centerFeed?: ElementRef<HTMLElement>;

  readonly mobileSidebarOpen = signal(false);
  readonly contentMaxWidth = signal('720px');
  readonly contentMode = signal<'default' | 'workspace'>('default');

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(event => this.handleNavigation(event));

    // The layout is lazy-loaded, so its first NavigationEnd may predate this subscription.
    afterNextRender(() => {
      this.lastContentPath = this.routePath(this.router.url);
      this.syncRouteLayout();
      this.resetContentScroll();
    });
  }

  openMobileSidebar(): void {
    this.mobileSidebarOpen.set(true);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  onHomeClick(): void {
    goHome(this.router);
  }

  private handleNavigation(event: NavigationEnd): void {
    const nextPath = this.routePath(event.urlAfterRedirects);
    const routeChanged = nextPath !== this.lastContentPath;
    this.lastContentPath = nextPath;
    this.syncRouteLayout();

    if (routeChanged) {
      this.resetContentScroll();
    }
  }

  private resetContentScroll(): void {
    const content = this.centerFeed?.nativeElement;
    if (content) {
      content.scrollTop = 0;
      content.scrollLeft = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  private routePath(url: string): string {
    return url.split(/[?#]/, 1)[0];
  }

  private syncRouteLayout(): void {
    let route = this.activatedRoute.firstChild;
    while (route?.firstChild) {
      route = route.firstChild;
    }

    const data = route?.snapshot.data ?? {};
    this.contentMaxWidth.set((data['contentMaxWidth'] ?? '720px') as string);
    this.contentMode.set((data['contentMode'] ?? 'default') as 'default' | 'workspace');
  }
}
