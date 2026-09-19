import { User } from '../../users/models/user.model';

export interface Comment {
  id: number;
  postId: number;
  
  parentId: number | null; 
  replyToCommentId: number | null;
  
  replyToUserId: number | null;
  replyToDisplayName: string | null;
  
  content: string;
  createdAt: string;
  updatedAt?: string;
  
  author: User;
  replies?: Comment[];
  
  likeCount?: number; 
  liked?: boolean; 
  
  isLiking?: boolean; 
  
  permissions?: {
    canEdit: boolean;
    canDelete: boolean;
  };
}
