import { Directive, ElementRef, HostListener, AfterViewInit, Input, OnChanges } from '@angular/core';

@Directive({
  selector: '[appAutosize]',
  standalone: true
})
export class AutosizeDirective implements AfterViewInit, OnChanges {
  /** Truyền bất kỳ giá trị nào thay đổi vào đây để trigger reset chiều cao.
   *  Ví dụ: [appAutosizeReset]="resetCounter" rồi tăng resetCounter++ sau submit. */
  @Input('appAutosizeReset') resetTrigger: unknown;

  constructor(private el: ElementRef<HTMLTextAreaElement>) {}

  ngAfterViewInit(): void {
    setTimeout(() => this.adjust(), 0);
  }

  ngOnChanges(): void {
    // Khi resetTrigger thay đổi → gọi adjust để cập nhật chiều cao
    setTimeout(() => this.adjust(), 0);
  }

  @HostListener('input')
  onInput(): void {
    this.adjust();
  }

  public adjust(): void {
    const textarea = this.el.nativeElement;
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
  }
}
