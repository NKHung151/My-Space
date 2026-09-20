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
import { getApiErrorMessage, getUploadErrorMessage } from '../../../core/http/api-error.util';
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

  @ViewChild('postEditor') private readonly postEditor?: ElementRef<HTMLDivElement>;

  draft: CreatePostPayload = { title: '', tag: undefined, content: '' };

  isSaving = false;
  isEmpty = true;
  isUploading = false;
  autosaveState: 'idle' | 'saving' | 'saved' = 'idle';

  get authorDisplayName(): string {
    const user = this.authService.currentUser();
    return user?.displayName?.trim() || user?.username || 'My Space Author';
  }

  get authorAvatarUrl(): string | null {
    return this.authService.currentUser()?.avatarUrl ?? null;
  }

  get saveStateLabel(): string {
    if (this.autosaveState === 'saving') return 'Đang lưu...';
    if (this.autosaveState === 'saved') return 'Đã lưu';
    return 'Lưu';
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
      if (snapshot) this.applyAutosaveSnapshot(snapshot);
    }
  }

  ngOnDestroy(): void {
    this.flushAutosave();
    document.body.classList.remove('editor-page');
  }

  updateTag(value: string | undefined): void {
    this.draft.tag = value?.trim() || undefined;
    this.scheduleAutosave();
  }

  onContentChange(): void {
    this.updateEmptyState();
    this.scheduleAutosave();
  }

  private updateEmptyState(): void {
    if (!this.postEditor) { this.isEmpty = true; return; }
    const html = this.postEditor.nativeElement.innerHTML.trim();
    const hasMedia = html.includes('<img') || html.includes('<video') || html.includes('<iframe');
    const hasText = hasMedia ? true : !!this.postEditor.nativeElement.textContent?.trim();
    this.isEmpty = !hasText && !hasMedia;
  }

  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          event.preventDefault();
          this.uploadFile(file, 'image');
          return;
        }
      }
    }
    this.scheduleAutosave();
  }

  saveAndSubmit(): void {
    if (this.isEmpty) {
      this.toast.showError('Bài viết không được để trống.');
      return;
    }
    this.save();
  }

  onFileSelected(mediaType: EditorMediaType, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    input.value = '';
    if (!file) return;
    this.uploadFile(file, mediaType);
  }

  goToMyPosts(): void {
    this.syncContentToDraft();
    void this.router.navigateByUrl(this.myPostsReturnUrl());
  }

  // ─── Private Methods ────────────────────────────────────────────────────────

  private syncContentToDraft(): void {
    if (!this.postEditor) return;
    const editorHtml = this.postEditor.nativeElement.innerHTML;
    this.draft.content = editorHtml;

    // Trích xuất media đầu tiên làm ảnh bìa / video bìa
    const videoMatch = editorHtml.match(/<video[^>]+src="([^">]+)"/);
    const iframeMatch = editorHtml.match(/<iframe[^>]+src="([^">]+(youtube\.com|youtu\.be)[^">]+)"/);
    const imgMatch = editorHtml.match(/<img[^>]+src="([^">]+)"/);

    if (videoMatch || iframeMatch) {
      this.draft.coverImageUrl = (videoMatch ?? iframeMatch)![1];
      this.draft.hasVideo = true;
    } else if (imgMatch) {
      this.draft.coverImageUrl = imgMatch[1];
      this.draft.hasVideo = false;
    } else {
      this.draft.coverImageUrl = undefined;
      this.draft.hasVideo = false;
    }

    // Tạo title từ plain text, excerpt giữ định dạng HTML cắt 100 từ
    const plainText = (this.postEditor.nativeElement.textContent || '').trim().replace(/\s+/g, ' ');
    this.draft.title = plainText.length > 100 ? plainText.substring(0, 97) + '...' : (plainText || 'Bài viết mới');
    this.draft.excerpt = this.generateHtmlExcerpt(editorHtml, 100);
  }

  /** Tạo excerpt HTML cắt đúng 100 từ, giữ nguyên thẻ HTML, bỏ media. */
  private generateHtmlExcerpt(html: string, wordLimit: number): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('img, video, iframe').forEach(el => el.remove());

    let wordCount = 0;
    let truncated = false;

    const traverse = (node: Node): void => {
      if (truncated) { node.parentNode?.removeChild(node); return; }
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (!text.trim()) return;
        const words = text.trim().split(/\s+/);
        if (wordCount + words.length > wordLimit) {
          const allowed = wordLimit - wordCount;
          node.textContent = (allowed > 0 ? words.slice(0, allowed).join(' ') : '') + '...';
          wordCount = wordLimit + 1;
          truncated = true;
        } else {
          wordCount += words.length;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        Array.from(node.childNodes).forEach(traverse);
      }
    };

    traverse(div);
    return div.innerHTML + (truncated ? '<!--TRUNCATED-->' : '');
  }

  private uploadFile(file: File, mediaType: EditorMediaType): void {
    const { valid } = validateUploadFile(file, mediaType);
    if (!valid) { this.toast.showError('Tệp không hợp lệ'); return; }

    this.isUploading = true;
    this.toast.showLoading('Đang tải tệp lên...', 'Đang xử lý');

    this.uploadsService.uploadEditorMedia(mediaType, file).subscribe({
      next: (upload) => {
        const url = this.uploadsService.toAbsoluteUrl(upload.url);
        const tag = mediaType === 'image' ? `<img src="${url}" />` : `<video src="${url}" controls></video>`;
        this.insertHtmlAtCursor(tag);
        this.toast.showSuccess('', 'Tải lên thành công');
        this.isUploading = false;
        this.updateEmptyState();
        this.scheduleAutosave();
      },
      error: (err: unknown) => {
        const msg = mediaType === 'image'
          ? getUploadErrorMessage(err)
          : getApiErrorMessage(err, 'Tải lên thất bại. Vui lòng thử lại.');
        this.toast.showError(msg, 'Lỗi tải lên');
        this.isUploading = false;
      },
    });
  }

  private insertHtmlAtCursor(html: string): void {
    const el = this.postEditor?.nativeElement;
    if (!el) return;
    el.focus();

    const sel = window.getSelection();
    if (!sel?.rangeCount) return;

    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) {
      range.selectNodeContents(el);
      range.collapse(false);
    }

    range.deleteContents();

    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const frag = document.createDocumentFragment();
    let lastNode: Node | null = null;
    while (tmp.firstChild) lastNode = frag.appendChild(tmp.firstChild);

    const br = document.createElement('br');
    frag.appendChild(br);
    range.insertNode(frag);

    if (lastNode) {
      const newRange = range.cloneRange();
      newRange.setStartAfter(br);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }

  private loadPost(id: string): void {
    this.postsService.getAuthorPost(id).subscribe({
      next: (post) => {
        this.draft = { title: post.title || '', tag: post.tag || undefined, content: post.content || '' };
        if (this.postEditor) {
          this.postEditor.nativeElement.innerHTML = this.draft.content;
          this.updateEmptyState();
        }
      },
      error: (err: unknown) => this.toast.showError(this.formatError(err), 'Không thể tải bài viết'),
    });
  }

  private save(): void {
    if (this.isSaving) return;
    this.syncContentToDraft();

    this.isSaving = true;
    this.toast.showLoading('Đang lưu bài viết...', 'Đang lưu');

    const request$ = this.currentPostId
      ? this.postsService.updateAuthorPost(this.currentPostId, this.draft)
      : this.postsService.createAuthorPost(this.draft);

    request$.subscribe({
      next: (post: Post) => {
        this.isSaving = false;
        this.currentPostId = String(post.id);
        this.autosaveState = 'saved';
        this.removeAutosaveSnapshot();
        this.toast.showSuccess('Bài viết đã được lưu.', 'Thành công');
        void this.router.navigateByUrl(this.myPostsReturnUrl());
      },
      error: (err: unknown) => {
        this.isSaving = false;
        this.toast.showError(this.formatError(err), 'Lỗi lưu bài viết');
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

  // ─── Autosave ────────────────────────────────────────────────────────────────

  private getAutosaveKey(): string {
    const authorId = this.authService.currentUser()?.id || 'anonymous';
    return `myspace_editor_draft_${authorId}_${this.currentPostId ?? 'new'}`;
  }

  private scheduleAutosave(): void {
    this.autosaveState = 'saving';
    if (this.autosaveTimer !== null) window.clearTimeout(this.autosaveTimer);
    this.autosaveTimer = window.setTimeout(() => this.flushAutosave(), 2000);
  }

  private flushAutosave(): void {
    if (this.autosaveTimer !== null) {
      window.clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    this.syncContentToDraft();
    try {
      localStorage.setItem(this.getAutosaveKey(), JSON.stringify({ version: 2, savedAt: Date.now(), draft: this.draft }));
      this.autosaveState = 'saved';
    } catch { /* quota exceeded */ }
  }

  private readAutosaveSnapshot(): { draft: CreatePostPayload } | null {
    try {
      const data = localStorage.getItem(this.getAutosaveKey());
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  private applyAutosaveSnapshot(snapshot: { draft: CreatePostPayload }): void {
    if (!snapshot?.draft) return;
    this.draft = { ...this.draft, ...snapshot.draft };
    const apply = () => {
      if (this.postEditor) {
        this.postEditor.nativeElement.innerHTML = this.draft.content || '';
        this.updateEmptyState();
      }
    };
    this.postEditor ? apply() : setTimeout(apply);
  }

  private removeAutosaveSnapshot(): void {
    try { localStorage.removeItem(this.getAutosaveKey()); } catch { /* ignore */ }
  }
}
