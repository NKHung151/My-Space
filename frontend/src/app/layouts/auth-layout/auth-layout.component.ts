import { RouterOutlet } from '@angular/router';
import { Component } from '@angular/core';

import { BrandComponent } from '../../shared/components/brand/brand.component';


@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [BrandComponent, RouterOutlet],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss'
})
export class AuthLayoutComponent {}
