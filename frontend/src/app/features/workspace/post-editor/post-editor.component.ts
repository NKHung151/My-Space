import { CommonModule, Location } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CreatePostPayload, Post } from '../../posts/models/post.model';
import { EditorMediaType } from '../models/editor-upload.model';
import { AuthorPostsService } from '../../posts/services/author-posts.service';
import { EditorUploadsService } from '../services/editor-uploads.service';
import { validateUploadFile } from '../utils/upload-validator';
import { ToastService } from '../../../core/notifications/toast.service';
import { getApiErrorMessage } from '../../../core/http/api-error.util';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, AssetImageDirective],
  templateUrl: './post-editor.component.html',
  styleUrl: './post-editor.component.scss',
})
export class PostEditorComponent implements OnInit, OnDestroy {
  private readonly postsService = inject(AuthorPostsService);
  private readonly uploadsService = inject(EditorUploadsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  private currentPostId: string | null = null;
  private autosaveTimer: number | null = null;
  
  readonly titleWordLimit = 20;

  @ViewChild('postTextarea') private readonly postTextarea?: ElementRef<HTMLTextAreaElement>;

  draft: CreatePostPayload = {
    title: '',
    tag: undefined,
    content: '',
  };

  textContent = '';
  mediaAttachments: Array<{ type: EditorMediaType; url: string }> = [];

  createdPost: Post | null = null;
  isSaving = false;
  uploadingType: EditorMediaType | null = null;
  autosaveState: 'idle' | 'saving' | 'saved' = 'idle';

  get authorDisplayName(): string {
    const user = this.authService.currentUser();
    return user?.displayName?.trim() || user?.username || 'My Space Author';
  }

  get authorAvatarUrl(): string | null {
    return this.authService.currentUser()?.avatarUrl ?? null;
  }

  ngOnInit(): void {
    document.body.classList.add('editor-page');
    const postId = this.route.snapshot.paramMap.get('id');
    this.currentPostId = postId;

    if (!postId && this.route.snapshot.queryParamMap.get('fresh') === '1') {
      this.removeAutosaveSnapshot();
      this.location.replaceState('/workspace/create');
    }

    if (postId) {
      this.loadPost(postId);
    } else {
      const snapshot = this.readAutosaveSnapshot();
      if (snapshot) {
        this.applyAutosaveSnapshot(snapshot);
      }
    }
  }

  ngOnDestroy(): void {
    this.flushAutosave();
    document.body.classList.remove('editor-page');
  }

  get saveStateLabel(): string {
    if (this.autosaveState === 'saving') {
      return 'Đang lưu...';
    }
    if (this.createdPost || this.autosaveState === 'saved') {
      return 'Đã lưu';
    }
    return 'Lưu';
  }

  updateTag(value: string | undefined): void {
    this.draft.tag = value?.trim() || undefined;
    this.scheduleAutosave();
  }

  onTextContentChange(): void {
    this.scheduleAutosave();
    this.autoResizeTextarea(this.postTextarea?.nativeElement);
  }

  autoResizeTextarea(textarea: HTMLTextAreaElement | undefined): void {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  saveAndSubmit(): void {
    if (!this.textContent.trim() && this.mediaAttachments.length === 0) {
      this.toast.showError('Bài viết không được để trống.');
      return;
    }
    
    this.syncContentToDraft();
    this.save();
  }

  private syncContentToDraft(): void {
    const mediaHtml = this.mediaAttachments.map(m => {
      if (m.type === 'image') return `<div class="editor-media-wrapper"><img src="${m.url}" style="max-width: 100%; border-radius: 8px;"></div>`;
      return `<div class="editor-media-wrapper"><video src="${m.url}" controls style="max-width: 100%; border-radius: 8px;"></video></div>`;
    }).join('');
    
    // Convert newlines to <br> or <p>
    const textHtml = this.textContent
      .split('\n')
      .map(line => line.trim() ? `<p>${line}</p>` : '<br>')
      .join('');
      
    this.draft.content = textHtml + mediaHtml;

    // Trích xuất Media đầu tiên làm Ảnh bìa / Video bìa
    if (this.mediaAttachments.length > 0) {
      const firstMedia = this.mediaAttachments[0];
      this.draft.coverImageUrl = firstMedia.url;
      this.draft.hasVideo = (firstMedia.type === 'video');
    } else {
      // Tìm xem trong nội dung copy-paste (nếu có HTML img/video tag) có media không
      const imgMatch = textHtml.match(/<img[^>]+src="([^">]+)"/);
      const videoMatch = textHtml.match(/<video[^>]+src="([^">]+)"/);
      const iframeMatch = textHtml.match(/<iframe[^>]+src="([^">]+youtube\.com[^">]+|[^">]+youtu\.be[^">]+)"/);
      
      if (videoMatch || iframeMatch) {
        this.draft.coverImageUrl = videoMatch ? videoMatch[1] : iframeMatch![1];
        this.draft.hasVideo = true;
      } else if (imgMatch) {
        this.draft.coverImageUrl = imgMatch[1];
        this.draft.hasVideo = false;
      } else {
        this.draft.coverImageUrl = undefined;
        this.draft.hasVideo = false;
      }
    }

    // Tự động tạo title từ nội dung để thoả mãn backend
    const plainText = this.textContent.trim().replace(/\s+/g, ' ');
    this.draft.title = plainText.length > 100 ? plainText.substring(0, 97) + '...' : plainText;
    if (!this.draft.title) {
      this.draft.title = 'Bài viết mới';
    }
  }

  private parseHtmlToContent(html: string): void {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');
    
    this.mediaAttachments = [];
    doc.querySelectorAll('img, video').forEach(el => {
      if (el.tagName.toLowerCase() === 'img') {
        this.mediaAttachments.push({ type: 'image', url: (el as HTMLImageElement).src });
      } else if (el.tagName.toLowerCase() === 'video') {
        this.mediaAttachments.push({ type: 'video', url: (el as HTMLVideoElement).src });
      }
      const wrapper = el.closest('.editor-media-wrapper');
      if (wrapper) wrapper.remove();
      else el.remove();
    });
    
    let text = doc.body.innerHTML
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '');
      
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    this.textContent = textarea.value.trim();
    
    setTimeout(() => this.autoResizeTextarea(this.postTextarea?.nativeElement), 0);
  }

  triggerFileInput(input: HTMLInputElement, type: EditorMediaType): void {
    input.accept = type === 'video' ? 'video/*' : 'image/*';
    input.onchange = (e) => this.uploadMedia(type, e);
    input.click();
  }

  uploadMedia(mediaType: EditorMediaType, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    input.value = '';

    if (!file) return;

    const validation = validateUploadFile(file, mediaType);
    if (!validation.valid) {
      this.toast.showError('Tệp không hợp lệ');
      return;
    }

    this.uploadingType = mediaType;
    this.toast.showLoading('Đang tải tệp lên...', 'Đang xử lý');
    
    this.uploadsService.uploadEditorMedia(mediaType, file).subscribe({
      next: (upload) => {
        const url = this.uploadsService.toAbsoluteUrl(upload.url);
        this.mediaAttachments.push({ type: mediaType, url });
        this.toast.showSuccess('', 'Tải lên thành công');
        this.uploadingType = null;
        this.scheduleAutosave();
      },
      error: (error: unknown) => {
        this.toast.showError(this.formatError(error), 'Lỗi tải lên');
        this.uploadingType = null;
      },
    });
  }

  removeMedia(index: number): void {
    const media = this.mediaAttachments[index];
    this.mediaAttachments.splice(index, 1);
    this.scheduleAutosave();
    
    this.uploadsService.deleteEditorMedia(media.url).subscribe({
      error: (err) => console.error('Failed to delete media', err)
    });
  }

  goToMyPosts(): void {
    this.syncContentToDraft();
    void this.router.navigateByUrl(this.myPostsReturnUrl());
  }

  private loadPost(id: string): void {
    this.postsService.getAuthorPost(id).subscribe({
      next: (post) => {
        this.draft = {
          title: post.title || '',
          tag: post.tag || undefined,
          content: post.content || '',
        };
        this.parseHtmlToContent(this.draft.content);
        this.createdPost = post;
      },
      error: (error: unknown) => {
        this.toast.showError(this.formatError(error), 'Không thể tải bài viết');
      },
    });
  }

  private save(): void {
    if (this.isSaving) return;

    this.syncContentToDraft();

    if (!this.draft.title?.trim()) {
      this.toast.showError('Vui lòng nhập tiêu đề bài viết', 'Thiếu thông tin');
      return;
    }

    const plainContent = (this.draft.content || '').replace(/<[^>]+>/g, '').trim();
    const hasMedia = this.mediaAttachments.length > 0 || /<(img|audio|video|iframe)\b/i.test(this.draft.content || '');
    if (!plainContent && !hasMedia) {
      this.toast.showError('Nội dung bài viết không được để trống', 'Thiếu thông tin');
      return;
    }

    this.isSaving = true;
    this.toast.showLoading('Đang lưu bài viết...', 'Đang lưu');

    const request$ = this.currentPostId
      ? this.postsService.updateAuthorPost(this.currentPostId, this.draft)
      : this.postsService.createAuthorPost(this.draft);

    request$.subscribe({
      next: (post) => {
        this.isSaving = false;
        this.createdPost = post;
        this.currentPostId = String(post.id);
        this.autosaveState = 'saved';
        this.removeAutosaveSnapshot();
        
        this.toast.showSuccess('Bài viết đã được lưu.', 'Thành công');
        this.router.navigateByUrl(this.myPostsReturnUrl());
      },
      error: (error: unknown) => {
        this.isSaving = false;
        this.toast.showError(this.formatError(error), 'Lỗi lưu bài viết');
      },
    });
  }

  private myPostsReturnUrl(): string {
    const user = this.authService.currentUser();
    return user ? `/profile/${user.id}` : '/explore';
  }

  private formatError(error: unknown): string {
    return getApiErrorMessage(error, 'Đã xảy ra lỗi hệ thống.');
  }

  // --- AUTOSAVE LOGIC ---

  private getAutosaveKey(): string {
    const authorId = this.authService.currentUser()?.id || 'anonymous';
    const postId = this.currentPostId || 'new';
    return `myspace_editor_draft_${authorId}_${postId}`;
  }

  private scheduleAutosave(): void {
    this.autosaveState = 'saving';
    if (this.autosaveTimer !== null) {
      window.clearTimeout(this.autosaveTimer);
    }
    this.autosaveTimer = window.setTimeout(() => {
      this.flushAutosave();
    }, 2000);
  }

  private flushAutosave(): void {
    if (this.autosaveTimer !== null) {
      window.clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    this.syncContentToDraft();
    const snapshot = {
      version: 1,
      savedAt: Date.now(),
      draft: this.draft,
      textContent: this.textContent,
      mediaAttachments: this.mediaAttachments
    };
    try {
      localStorage.setItem(this.getAutosaveKey(), JSON.stringify(snapshot));
      this.autosaveState = 'saved';
    } catch {
      // Ignore quota exceeded
    }
  }

  private readAutosaveSnapshot(): any | null {
    try {
      const data = localStorage.getItem(this.getAutosaveKey());
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private applyAutosaveSnapshot(snapshot: any): void {
    if (snapshot && snapshot.draft) {
      this.draft = { ...this.draft, ...snapshot.draft };
      if (snapshot.textContent !== undefined) {
        this.textContent = snapshot.textContent;
        this.mediaAttachments = snapshot.mediaAttachments || [];
        setTimeout(() => this.autoResizeTextarea(this.postTextarea?.nativeElement), 0);
      } else {
        this.parseHtmlToContent(this.draft.content);
      }
    }
  }

  private removeAutosaveSnapshot(): void {
    try {
      localStorage.removeItem(this.getAutosaveKey());
    } catch {
      // Ignore
    }
  }
}
