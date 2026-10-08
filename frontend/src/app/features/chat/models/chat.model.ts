export interface MessageResponse {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  type: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  isEdited?: boolean;
}

export interface PageResponse<T> {
  data: T[];
  meta: any;
}
