import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/http/api-response.model';
import { unwrap } from '../../../core/http/api.operators';
import { UploadResponse } from '../models/editor-upload.model';

@Injectable({ providedIn: 'root' })
export class EditorUploadsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Server tự nhận loại media (ảnh/âm thanh/video) từ nội dung file
  uploadEditorMedia(file: File): Observable<UploadResponse> {
    return this.upload('media', file);
  }

  uploadAvatar(file: File): Observable<UploadResponse> {
    return this.upload('avatar', file);
  }

  private upload(endpoint: 'media' | 'avatar', file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<ApiResponse<UploadResponse>>(`${this.baseUrl}/uploads/${endpoint}`, formData)
      .pipe(unwrap());
  }
}
