
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiItemResponse } from '../../../core/http/api-response.model';
import { EditorMediaType, UploadResponse } from '../models/editor-upload.model';

@Injectable({ providedIn: 'root' })
export class EditorUploadsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  uploadEditorMedia(mediaType: EditorMediaType, file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ApiItemResponse<UploadResponse>>(`${this.baseUrl}/uploads/editor-${mediaType}`, formData)
      .pipe(map((response) => response.data));
  }

  uploadAvatar(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ApiItemResponse<UploadResponse>>(`${this.baseUrl}/uploads/avatar`, formData)
      .pipe(map((response) => response.data));
  }

  importExternalImage(url: string): Observable<UploadResponse> {
    return this.http
      .post<ApiItemResponse<UploadResponse>>(`${this.baseUrl}/uploads/import-external`, { url })
      .pipe(map((response) => response.data));
  }

  deleteEditorMedia(url: string): Observable<{ message: string }> {
    return this.http
      .request<ApiItemResponse<{ message: string }>>('delete', `${this.baseUrl}/uploads/editor-media`, {
        body: { url },
      })
      .pipe(map((response) => response.data));
  }

  toAbsoluteUrl(url: string): string {
    return url;
  }
}
