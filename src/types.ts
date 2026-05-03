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

export type ProjectStatus = 'done' | 'coming-soon' | 'planned';

export interface ProjectImage {
  id: string;
  project_id: string;
  image_url: string;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  image_url: string;
  status: ProjectStatus;
  date: string;
  impact_metric?: string;
  growth_metric?: string;
  created_at: string;
  images?: ProjectImage[];
}

export interface Media {
  id: string;
  title: string;
  image_url: string;
  type: 'photo' | 'video';
  created_at: string;
}
