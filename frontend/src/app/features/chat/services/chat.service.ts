import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, Page, PageResponse } from '../../../core/http/api-response.model';
import { unwrap, unwrapPage } from '../../../core/http/api.operators';
import { MessageResponse } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/chat`;

  getConversationId(targetUserId: number): Observable<number> {
    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/conversations/${targetUserId}`).pipe(unwrap());
  }

  // page đánh số từ 1 giống mọi API phân trang khác
  getMessages(conversationId: number, page: number = 1, limit: number = 20): Observable<Page<MessageResponse>> {
    return this.http.get<ApiResponse<PageResponse<MessageResponse>>>(`${this.apiUrl}/conversations/${conversationId}/messages`, {
      params: { page, limit }
    }).pipe(unwrapPage());
  }

  getUnreadCounts(): Observable<Record<number, number>> {
    return this.http.get<ApiResponse<Record<number, number>>>(`${this.apiUrl}/unread-counts`).pipe(unwrap());
  }
}
