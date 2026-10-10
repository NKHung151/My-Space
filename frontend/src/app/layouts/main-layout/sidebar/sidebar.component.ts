import {
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';
import { BrandComponent } from '../../../shared/components/brand/brand.component';
import { SearchModalService } from '../../../features/search/services/search-modal.service';
import { goHome } from '../go-home';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AssetImageDirective, BrandComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly searchModalService = inject(SearchModalService);
  readonly moreMenuOpen = signal(false);
  readonly isAuthenticated = computed(
    () => Boolean(this.authService.currentUser() && this.authService.getToken()),
  );
  readonly isAdmin = computed(
    () => this.isAuthenticated() && this.authService.currentUser()?.role === 'admin',
  );

  get profileAvatar(): string | null {
    return this.authService.currentUser()?.avatarUrl ?? null;
  }

  
  toggleMoreMenu(event: Event): void {
    event.stopPropagation();
    this.moreMenuOpen.update(open => !open);
  }



  signOut(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeMenus();
    this.authService.logout().subscribe({
      complete: () => void this.router.navigate(['/']),
    });
  }

  closeMenus(): void {
    this.moreMenuOpen.set(false);
  }

  onHomeClick(): void {
    this.closeMenus();
    goHome(this.router);
  }

  @HostListener('document:click', ['$event'])
  closeMenusOnOutsideClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-sidebar-more]')) {
      this.moreMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeMenusOnEscape(): void {
    this.closeMenus();
  }
}
