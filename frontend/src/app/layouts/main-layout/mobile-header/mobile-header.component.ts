import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';
import { BrandComponent } from '../../../shared/components/brand/brand.component';

import { SearchModalService } from '../../../features/search/services/search-modal.service';
import { goHome } from '../go-home';

@Component({
  selector: 'app-mobile-header',
  standalone: true,
  imports: [CommonModule, RouterLink, AssetImageDirective, BrandComponent],
  templateUrl: './mobile-header.component.html',
  styleUrl: './mobile-header.component.scss',
})
export class MobileHeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly searchModalService = inject(SearchModalService);

  @Output() menuClick = new EventEmitter<void>();

  get profileAvatar(): string | null {
    return this.authService.currentUser()?.avatarUrl ?? null;
  }

  onHomeClick(): void {
    goHome(this.router);
  }
}
