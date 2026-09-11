import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BrandComponent } from '../../shared/components/brand/brand.component';
import { AdminSidebarComponent } from './admin-sidebar/admin-sidebar.component';


@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, BrandComponent, AdminSidebarComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  readonly menuOpen = signal(false);

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
