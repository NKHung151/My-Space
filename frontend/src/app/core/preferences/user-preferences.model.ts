export interface UserPreferences {
  compactView: boolean;
  autoPlayMedia: boolean;
}

export type UserPreferenceKey = keyof UserPreferences;
