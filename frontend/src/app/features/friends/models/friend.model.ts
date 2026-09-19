import { BaseUser } from '../../../core/models/base-user.model';


export interface FriendUser extends BaseUser {}

export interface FriendRequestResponse {
  id: number;
  status: string;
  createdAt: string;
  sender: FriendUser;
}

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';
