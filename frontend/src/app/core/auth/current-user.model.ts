import { BaseUser } from '../models/base-user.model';

export type UserRole = 'admin' | 'member';

export interface CurrentUser extends BaseUser {
  email: string;
  accentColor?: string | null;
  role?: UserRole;
  friendsCount?: number;
}
