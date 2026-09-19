export interface BaseUser {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}
