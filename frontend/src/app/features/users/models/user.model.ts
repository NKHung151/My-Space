import { BaseUser } from '../../../core/models/base-user.model';

export interface User extends BaseUser {
  email?: string;
  role: 'admin' | 'user';
  friendsCount?: number;
  createdAt?: string;
}
