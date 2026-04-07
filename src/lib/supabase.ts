import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type Profile = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'admin' | 'member';
  profile_picture?: string;
  is_suspended: boolean;
};

export type Contribution = {
  id: number;
  user_id: string;
  amount: number;
  date: string;
  description: string;
  profiles?: Profile;
};

export type Notification = {
  id: number;
  title: string;
  message: string;
  date: string;
  expires_at?: string;
};

export type AppSettings = {
  key: string;
  value: string;
};
