import { Router } from '@angular/router';

/** Bấm logo / "Trang chủ": đang ở trang chủ thì cuộn feed lên đầu, ở trang khác thì chuyển về trang chủ. */
export function goHome(router: Router): void {
  if (router.url === '/home' || router.url === '/') {
    const centerFeed = document.querySelector('.center-feed');
    if (centerFeed) {
      centerFeed.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  } else {
    void router.navigate(['/home']);
  }
}
