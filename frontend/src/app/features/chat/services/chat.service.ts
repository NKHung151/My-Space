import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/http/api-response.model';
import { MessageResponse, PageResponse } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/chat`;

  getConversationId(targetUserId: number): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/conversations/${targetUserId}`);
  }

  // page đánh số từ 1 giống mọi API phân trang khác
  getMessages(conversationId: number, page: number = 1, limit: number = 20): Observable<ApiResponse<PageResponse<MessageResponse>>> {
    return this.http.get<ApiResponse<PageResponse<MessageResponse>>>(`${this.apiUrl}/conversations/${conversationId}/messages`, {
      params: { page, limit }
    });
  }

  getUnreadCounts(): Observable<ApiResponse<Record<number, number>>> {
    return this.http.get<ApiResponse<Record<number, number>>>(`${this.apiUrl}/unread-counts`);
  }
}
