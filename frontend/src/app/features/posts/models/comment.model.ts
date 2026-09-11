import { User } from '../../users/models/user.model';

/**
 * Model đại diện cho một bình luận trong bài viết.
 * 
 * Mục đích: Sử dụng để parse dữ liệu bình luận từ API trả về cho phía Frontend hiển thị.
 * DB Mapping chi tiết:
 * 
 * Comment.id -> comments.id
 * Comment.post_id -> comments.post_id
 * Comment.user_id -> comments.user_id
 * Comment.parentId -> comments.parent_id (null = root)
 * Comment.replyToCommentId -> comments.reply_to_comment_id
 * Comment.replyToUsername -> comments.reply_to_username (thường cached, không JOIN trực tiếp mỗi lần)
 * Comment.content -> comments.content
 * Comment.likeCount -> comments.like_count (đếm từ comment_likes)
 * Comment.isLiked -> từ bảng comment_likes WHERE comment_id+user_id
 * Comment.replies -> mảng Comment con, được build từ comments WHERE parent_id = id
 * Comment.isLiking -> trạng thái loading FE khi đang gọi API like (không có trong DB)
 */
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
