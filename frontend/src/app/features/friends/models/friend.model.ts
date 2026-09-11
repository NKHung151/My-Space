import { BaseUser } from '../../../core/models/base-user.model';


export interface FriendUser extends BaseUser {}

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';
