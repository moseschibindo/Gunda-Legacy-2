import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, currentUser?: User) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfile(data);
    } else if (currentUser) {
      // Fallback to metadata if profile record is missing
      // This ensures signup data (name, email, phone) is available immediately
      setProfile({
        id: userId,
        name: currentUser.user_metadata?.name || '',
        phone: currentUser.user_metadata?.phone || '',
        email: currentUser.user_metadata?.email || currentUser.email || '',
        role: 'member',
        profile_picture: null,
        is_suspended: false,
        created_at: currentUser.created_at
      });
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user);
  };

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session retrieval error:', error.message);
        if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
          // Clear stale session
          supabase.auth.signOut();
        }
      }
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
