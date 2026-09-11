export interface BaseUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}
