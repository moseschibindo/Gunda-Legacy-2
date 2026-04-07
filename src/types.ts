export type Role = 'admin' | 'member';

export interface Profile {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  profile_picture: string | null;
  is_suspended: boolean;
  created_at: string;
}

export interface Contribution {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  description: string;
  created_at: string;
  profiles?: Profile;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  expires_at: string | null;
  reactions?: Record<string, string[]>; // emoji -> array of user IDs
}

export interface AppSetting {
  key: string;
  value: string;
}
