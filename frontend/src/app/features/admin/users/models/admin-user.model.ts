import { BaseUser } from '../../../../core/models/base-user.model';

export type AdminUserRole = 'admin' | 'member';
export type AdminUserStatus = 'active' | 'inactive' | 'banned';

export interface AdminUser extends BaseUser {
  email: string;
  role: AdminUserRole | null;
  status: AdminUserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersFilters {
  search?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
  page: number;
  limit: number;
}

export interface UpdateAdminUserRequest {
  role?: AdminUserRole;
  status?: AdminUserStatus;
}
