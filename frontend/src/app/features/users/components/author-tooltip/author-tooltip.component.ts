import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { FriendButtonComponent } from '../../../friends/components/friend-button/friend-button.component';
import { AssetImageDirective } from '../../../../shared/directives/asset-image.directive';
import { DisplayNamePipe } from '../../../../shared/pipes/display-name.pipe';


interface AuthorTooltipUser {
  id: number;
  displayName?: string | null;
  username?: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

/**
 * AuthorTooltipComponent - Component hiển thị popup thông tin tác giả
 * 
 * Chức năng:
 * Hiện lên khi di chuột (mouseenter) qua avatar hoặc tên tác giả, cung cấp thông tin ngắn gọn 
 * và nút Theo dõi (Subscribe). 
 * Điểm đặc biệt: Có thuật toán tự động tính toán vị trí hiển thị (phía trên hoặc phía dưới element gốc)
 * nhằm tránh tình trạng bị che khuất (tràn ra ngoài viewport của màn hình).
 */
@Component({
  selector: 'app-author-tooltip',
  standalone: true,
  imports: [CommonModule, AssetImageDirective, FriendButtonComponent, DisplayNamePipe],
  templateUrl: './author-tooltip.component.html',
  styleUrl: './author-tooltip.component.scss'
})
export class AuthorTooltipComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() user?: AuthorTooltipUser;

  // Cờ báo hiệu Tooltip nên hiển thị ngược lên trên thay vì đổ xuống dưới
  isFlipped = false;
  // Cờ kiểm tra người dùng hiện tại có phải chính là tác giả không (ẩn nút Follow nếu đúng)
  isSelf = false;
  
  // Tọa độ định vị Popup
  cardTop = 0;
  cardLeft = 0;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  
  private mouseEnterListener: (() => void) | null = null;
  private parentEl: HTMLElement | null = null;

  ngOnInit(): void {
    this.updateSelfStatus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) {
      this.updateSelfStatus();
    }
  }

  // Hàm so sánh ID của người dùng đang đăng nhập với ID tác giả
  private updateSelfStatus(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser && this.user?.id && String(currentUser.id) === String(this.user.id)) {
      this.isSelf = true;
    } else {
      this.isSelf = false;
    }
  }
  
  // Điều hướng tới trang cá nhân tác giả
  goToAuthor(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.user?.id) {
      this.router.navigate(['/profile', this.user.id]);
    }
  }

  editProfile(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.router.navigate(['/profile']);
  }

  // Khi view khởi tạo xong, lấy thẻ cha (nơi đính tooltip) và lắng nghe mouseenter
  ngAfterViewInit(): void {
    this.parentEl = this.el.nativeElement.parentElement;
    if (this.parentEl) {
      this.mouseEnterListener = () => this.checkPosition();
      this.parentEl.addEventListener('mouseenter', this.mouseEnterListener);
    }
  }

  ngOnDestroy(): void {
    // Dọn dẹp DOM listener khi component bị hủy
    if (this.parentEl && this.mouseEnterListener) {
      this.parentEl.removeEventListener('mouseenter', this.mouseEnterListener);
      this.mouseEnterListener = null;
      this.parentEl = null;
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    // Tính toán lại tọa độ khi người dùng thay đổi kích cỡ cửa sổ
    this.checkPosition();
  }

  /**
   * Hàm tính toán lại vị trí hiển thị của Tooltip dựa trên tọa độ của parent element.
   * Thuật toán:
   * 1. Lấy tọa độ (BoundingClientRect) của phần tử cha và kích thước của chính Tooltip.
   * 2. Kiểm tra khoảng không gian bên dưới (spaceBelow) từ cạnh dưới của phần tử cha tới cuối màn hình (window.innerHeight).
   * 3. Nếu không gian bên dưới KHÔNG ĐỦ cho chiều cao Tooltip (estimatedCardHeight),
   *    VÀ không gian bên trên CÓ ĐỦ chỗ (parentRect.top > estimatedCardHeight)
   *    -> Bật isFlipped = true, tính toán cardTop đẩy tooltip lật lên phía trên phần tử cha.
   * 4. Ngược lại, tooltip sẽ bung xuống dưới (cộng thêm 1 khoảng cách nhỏ viewportGap).
   * 5. Về tọa độ trái (cardLeft), cố gắng giữ nguyên gốc parent, 
   *    nhưng giới hạn bằng Math.min/max để không tràn qua mép phải/trái của màn hình.
   */
  private checkPosition(): void {
    const parent = this.el.nativeElement.parentElement as HTMLElement | null;
    if (!parent) {
      return;
    }

    const parentRect = parent.getBoundingClientRect();
    const card = this.el.nativeElement.querySelector<HTMLElement>('.author-hover-card');
    const cardRect = card?.getBoundingClientRect();
    
    // Kích thước ước lượng hoặc kích thước thực
    const estimatedCardWidth = cardRect?.width || 300;
    const estimatedCardHeight = cardRect?.height || 220;
    const viewportGap = 12; // Khoảng cách margin so với mép
    
    const spaceBelow = window.innerHeight - parentRect.bottom;

    // Logic lật ngược (flip)
    if (spaceBelow < estimatedCardHeight && parentRect.top > estimatedCardHeight) {
      this.isFlipped = true; // Lật lên trên
      this.cardTop = Math.max(viewportGap, parentRect.top - estimatedCardHeight - viewportGap);
    } else {
      this.isFlipped = false; // Đổ xuống dưới
      this.cardTop = parentRect.bottom + viewportGap;
    }

    // Logic chặn tràn bề ngang
    this.cardLeft = Math.min(
      Math.max(viewportGap, parentRect.left), // Không đâm ra mép trái
      Math.max(viewportGap, window.innerWidth - estimatedCardWidth - viewportGap), // Không đâm qua mép phải
    );
  }
}
