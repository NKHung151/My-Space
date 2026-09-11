import { environment } from '../../../../environments/environment';

/**
 * Hàm chuẩn bị chuỗi HTML của bài viết trước khi hiển thị cho người xem
 * Mục đích: 
 * - Loại bỏ các thành phần điều khiển (toolbar) thừa do editor sinh ra.
 * - Chuẩn hóa URL đường dẫn ảnh/media /uploads/ thành đường dẫn tuyệt đối backend.
 * - Parse (phân tích) và chuẩn hóa lại cấu trúc các khối code (code block) 
 *   để chúng hiển thị đúng định dạng có số thứ tự dòng.
 */
export function preparePostDetailHtml(html: string): string {
  if (!html || typeof document === 'undefined') {
    return html;
  }

  // Tạo một element ảo (container) trong memory để dễ dàng DOM query và chỉnh sửa
  const container = document.createElement('div');
  container.innerHTML = html;

  const staticBaseUrl = environment.apiUrl.replace(/\/api\/v1\/?$/, '');

  container.querySelectorAll<HTMLImageElement | HTMLVideoElement | HTMLAudioElement>('img, video, audio').forEach((media) => {
    const src = media.getAttribute('src');
    if (src) {
      if (src.startsWith('data:')) {
        return;
      }
      const uploadsIdx = src.indexOf('/uploads/');
      if (uploadsIdx !== -1) {
        media.setAttribute('src', `${staticBaseUrl}${src.substring(uploadsIdx)}`);
      }
    }
  });

  // Xóa bỏ các thanh công cụ, nút bấm xóa hoặc chọn ngôn ngữ bên trong editor
  container
    .querySelectorAll(
      '.editor-code-toolbar, .editor-code-delete, .editor-code-language-menu, .editor-media-delete, .editor-media-alignment-bar',
    )
    .forEach((element) => element.remove());

  attachAdjacentStandaloneCaptions(container);

  // Chuẩn hóa chú thích media (figcaption)
  container.querySelectorAll<HTMLElement>('.editor-media-caption, figcaption').forEach((caption) => {
    caption.removeAttribute('contenteditable');
    caption.removeAttribute('data-placeholder');
    const text = caption.textContent?.trim();
    if (!text) {
      caption.remove();
    } else {
      const wrapper = caption.closest<HTMLElement>('.editor-media-wrapper, figure');
      if (!wrapper?.querySelector('img, video, audio')) {
        replaceStandaloneCaptionWithContent(caption);
        return;
      }
      stripCaptionPresentationMarkup(caption);
      const blockTags = new Set(['P', 'DIV', 'BLOCKQUOTE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL']);
      let curr = caption.firstChild;
      let foundBlock = false;
      const nodesToExtract: Node[] = [];

      while (curr) {
        if (curr.nodeType === Node.ELEMENT_NODE && blockTags.has((curr as HTMLElement).tagName.toUpperCase())) {
          foundBlock = true;
        }
        if (foundBlock) {
          nodesToExtract.push(curr);
        }
        curr = curr.nextSibling;
      }

      if (nodesToExtract.length > 0) {
        const hasTextBefore = Array.from(caption.childNodes).some(n => {
          if (nodesToExtract.includes(n)) return false;
          return n.textContent?.trim() !== '';
        });

        const toInsertAfterWrapper: Node[] = [];
        nodesToExtract.forEach((node, index) => {
          if (index === 0 && !hasTextBefore && node.nodeType === Node.ELEMENT_NODE && blockTags.has((node as HTMLElement).tagName.toUpperCase())) {
            while (node.firstChild) {
              caption.insertBefore(node.firstChild, node);
            }
            if (node.parentNode === caption) {
              caption.removeChild(node);
            }
          } else {
            toInsertAfterWrapper.push(node);
          }
        });

        for (let i = toInsertAfterWrapper.length - 1; i >= 0; i--) {
          wrapper.after(toInsertAfterWrapper[i]);
        }

        const firstBr = caption.querySelector('br');
        if (firstBr) {
          const newP = document.createElement('p');
          let sibling = firstBr.nextSibling;
          while (sibling) {
            const next = sibling.nextSibling;
            newP.appendChild(sibling);
            sibling = next;
          }
          firstBr.remove();
          if (newP.childNodes.length > 0) {
            wrapper.after(newP);
          }
        }

        if (!caption.textContent?.trim()) {
          caption.remove();
        }
      } else {
        const firstBr = caption.querySelector('br');
        if (firstBr) {
          const newP = document.createElement('p');
          let sibling = firstBr.nextSibling;
          while (sibling) {
            const next = sibling.nextSibling;
            newP.appendChild(sibling);
            sibling = next;
          }
          firstBr.remove();
          if (newP.childNodes.length > 0) {
            wrapper.after(newP);
          }
        }

        if (!caption.textContent?.trim()) {
          caption.remove();
        }
      }
    }
  });

  removeDuplicateMediaCaptionParagraphs(container);

  // Xử lý từng khối mã (code block)
  container.querySelectorAll<HTMLElement>('.editor-code-body').forEach((codeBody) => {
    removeLegacyCodeControls(codeBody);
    // Bỏ khả năng chỉnh sửa trực tiếp trên vùng mã khi hiển thị ngoài frontend
    codeBody.removeAttribute('contenteditable');
    codeBody.removeAttribute('spellcheck');

    // Nếu block này đã được format dòng (.code-line) thì bỏ qua
    if (codeBody.querySelector('.code-line')) {
      return;
    }

    // Lấy nội dung gốc của mã và chuẩn hóa ngắt dòng (CRLF -> LF)
    const source = extractCodeSource(codeBody).replace(/\r\n?/g, '\n');
    const normalizedSource = source.endsWith('\n') ? source.slice(0, -1) : source;
    const lines = normalizedSource.split('\n');
    const codeElement = document.createElement('code');

    // Dựng lại từng dòng (line) với phần tử hiển thị số thứ tự (line-number) và nội dung (line-content)
    lines.forEach((line, index) => {
      const lineElement = document.createElement('span');
      const lineNumber = document.createElement('span');
      const lineContent = document.createElement('span');

      lineElement.className = 'code-line';

      lineNumber.className = 'line-number';
      lineNumber.setAttribute('aria-hidden', 'true'); // Ẩn khỏi các công cụ đọc màn hình (screen readers)
      lineNumber.textContent = String(index + 1);

      lineContent.className = 'line-content';
      lineContent.textContent = line;

      lineElement.append(lineNumber, lineContent);
      codeElement.append(lineElement);
    });

    // Thay thế toàn bộ nội dung trong khối code gốc bằng khối code mới đã có số dòng
    codeBody.replaceChildren(codeElement);
  });

  // Trả về chuỗi HTML đã được làm sạch và chuẩn hóa
  return container.innerHTML;
}

function stripCaptionPresentationMarkup(caption: HTMLElement): void {
  caption.removeAttribute('style');
  caption.removeAttribute('size');
  caption.removeAttribute('fontsize');
  caption.removeAttribute('face');
  caption.querySelectorAll<HTMLElement>('*').forEach((element) => {
    element.removeAttribute('style');
    element.removeAttribute('size');
    element.removeAttribute('fontsize');
    element.removeAttribute('face');
  });
}

function attachAdjacentStandaloneCaptions(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('figcaption').forEach((caption) => {
    if (caption.closest('.editor-media-wrapper, figure')) {
      return;
    }

    let previous = caption.previousElementSibling as HTMLElement | null;
    while (previous && isEmptyElement(previous)) {
      previous = previous.previousElementSibling as HTMLElement | null;
    }

    if (previous?.matches('.editor-media-wrapper, figure') && previous.querySelector('img, video, audio')) {
      caption.className = 'editor-media-caption';
      previous.appendChild(caption);
    }
  });
}

function removeDuplicateMediaCaptionParagraphs(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.editor-media-wrapper, figure').forEach((wrapper) => {
    const caption = wrapper.querySelector<HTMLElement>(':scope > .editor-media-caption, :scope > figcaption');
    const captionText = normalizeCaptionText(caption?.textContent ?? '');
    if (!captionText) {
      return;
    }

    let sibling = wrapper.nextElementSibling as HTMLElement | null;
    let emptyNodesSeen = 0;
    while (sibling && emptyNodesSeen < 2 && isEmptyElement(sibling)) {
      emptyNodesSeen++;
      sibling = sibling.nextElementSibling as HTMLElement | null;
    }

    if (
      sibling &&
      ['P', 'DIV'].includes(sibling.tagName) &&
      !sibling.querySelector('img, audio, video, iframe') &&
      normalizeCaptionText(sibling.textContent ?? '') === captionText
    ) {
      sibling.remove();
    }
  });
}

function isEmptyElement(element: HTMLElement): boolean {
  return !normalizeCaptionText(element.textContent ?? '') &&
    !element.querySelector('img, audio, video, iframe, hr');
}

function normalizeCaptionText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function replaceStandaloneCaptionWithContent(caption: HTMLElement): void {
  const blockTags = new Set(['P', 'DIV', 'BLOCKQUOTE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL']);
  const fragment = document.createDocumentFragment();
  let inlineParagraph: HTMLParagraphElement | null = null;

  Array.from(caption.childNodes).forEach((node) => {
    if (node instanceof HTMLElement && blockTags.has(node.tagName.toUpperCase())) {
      inlineParagraph = null;
      fragment.appendChild(node);
      return;
    }

    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) return;
    if (!inlineParagraph) {
      inlineParagraph = document.createElement('p');
      fragment.appendChild(inlineParagraph);
    }
    inlineParagraph.appendChild(node);
  });

  if (fragment.childNodes.length) {
    caption.replaceWith(fragment);
  } else {
    caption.remove();
  }
}

const LEGACY_CODE_CONTROL_TEXTS = new Set([
  'Auto-detect',
  'Auto-detectPlainTextJavaScriptTypeScriptJSXTSXPythonCSSHTMLJSONBash',
  'Auto-detectAuto-detectPlainTextJavaScriptTypeScriptJSXTSXPythonCSSHTMLJSONBash',
]);

/**
 * Xóa bỏ các đoạn văn bản điều khiển cũ rác còn sót lại (như 'Auto-detect') 
 * trong khối code của các phiên bản editor trước đây.
 */
function removeLegacyCodeControls(codeBody: HTMLElement): void {
  let sibling = codeBody.previousSibling;

  // Lặp ngược lên các anh em (siblings) phía trước
  while (sibling) {
    const previousSibling = sibling.previousSibling;
    const normalizedText = normalizeLegacyControlText(sibling.textContent ?? '');

    // Nếu là text rỗng, xóa luôn và đi tiếp
    if (!normalizedText) {
      sibling.remove();
      sibling = previousSibling;
      continue;
    }

    // Dừng lại nếu gặp một sibling có text không phải là rác legacy
    if (!LEGACY_CODE_CONTROL_TEXTS.has(normalizedText)) {
      break;
    }

    // Nếu khớp với rác, xóa và đi tiếp
    sibling.remove();
    sibling = previousSibling;
  }
}

/** 
 * Chuẩn hóa text để so sánh (xóa khoảng trắng và một số ký tự mũi tên đặc biệt) 
 */
function normalizeLegacyControlText(value: string): string {
  return value
    .replace(/\s+/g, '')
    .replace(/[▼⌄⌫]/g, '');
}

/**
 * Trích xuất đoạn mã thực tế từ cấu trúc DOM bên trong của khối code.
 * Do editor có thể lưu HTML ở nhiều dạng phức tạp, hàm này cố gắng bóc tách nội dung thô (raw).
 */
function extractCodeSource(codeBody: HTMLElement): string {
  const codeElement = codeBody.querySelector(':scope > code');
  // Nếu không có thẻ code ở trong, trả về nguyên dạng serialize của nội dung hiện tại
  if (!codeElement) {
    return serializeCodeNodes(codeBody);
  }

  // Tạo bản sao để tránh thay đổi DOM thật, sau đó xóa thẻ code bên trong
  const contentOutsideCode = codeBody.cloneNode(true) as HTMLElement;
  contentOutsideCode.querySelectorAll(':scope > code').forEach((node) => node.remove());
  const outsideSource = serializeCodeNodes(contentOutsideCode);

  // Legacy drafts can contain the code directly in <pre> and an empty <code>
  // child. In that case the content in <pre> is the source that must be shown.
  if (outsideSource.trim().length > 0) {
    return serializeCodeNodes(codeBody);
  }

  // Nếu không, trả về text của thẻ code
  return serializeCodeNodes(codeElement);
}

/**
 * Đọc qua một node DOM (đệ quy) và trả về text đơn thuần,
 * xử lý việc ngắt dòng (BR, DIV, P) để mã hiển thị đúng format.
 */
function serializeCodeNodes(node: Node): string {
  // Trả về nguyên text nếu là TEXT_NODE
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (!(node instanceof HTMLElement)) {
    return Array.from(node.childNodes).map(serializeCodeNodes).join('');
  }

  // Thay thẻ <br> bằng ký tự ngắt dòng LF
  if (node.tagName === 'BR') {
    return '\n';
  }

  const content = Array.from(node.childNodes).map(serializeCodeNodes).join('');
  // Đảm bảo ngắt dòng cho thẻ DIV và P (thường đại diện cho dòng mới ở các trình soạn thảo WYSIWYG)
  if (node.tagName === 'DIV' || node.tagName === 'P') {
    return content.endsWith('\n') ? content : `${content}\n`;
  }

  return content;
}
