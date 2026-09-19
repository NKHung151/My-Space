export interface MessageResponse {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  type: string;
  createdAt: string;
}

export interface MessageRequest {
  receiverId: number;
  content: string;
}

export interface PageResponse<T> {
  data: T[];
  meta: any;
}
