import { User } from '../../users/models/user.model';

export interface Comment {
  id: string;
  postId: string;
  
  parentId: string | null; 
  replyToCommentId: string | null;
  
  replyToUserId: string | null;
  replyToUsername: string | null;
  
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
