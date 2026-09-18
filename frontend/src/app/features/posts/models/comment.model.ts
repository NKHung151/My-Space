import { User } from '../../users/models/user.model';

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  
  parent_id: string | null; 
  reply_to_comment_id: string | null;
  
  reply_to_user_id: string | null;
  reply_to_username: string | null;
  
  content: string;
  status: string;
  created_at: string;
  updated_at?: string;
  
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
