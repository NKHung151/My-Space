import { BaseUser } from '../models/base-user.model';

export type UserRole = 'admin' | 'user';

export interface CurrentUser extends BaseUser {
  email: string;
  role?: UserRole;
  friendsCount?: number;
}
