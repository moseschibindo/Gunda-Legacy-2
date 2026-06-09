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
      // Create missing profile record
      const newProfile = {
        id: userId,
        name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Unknown User',
        phone: currentUser.user_metadata?.phone || '',
        email: currentUser.user_metadata?.email || currentUser.email || '',
        role: 'member',
        profile_picture: null,
        is_suspended: false,
      };

      // Try to insert the profile if it doesn't exist via secure backend API
      try {
        const response = await fetch('/api/auth/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            name: newProfile.name,
            phone: newProfile.phone,
            email: newProfile.email
          })
        });
        
        if (response.ok) {
          const resData = await response.json();
          if (resData.profile) {
            setProfile(resData.profile);
            return;
          }
        }
      } catch (err) {
        console.error('Error syncing profile via backend API:', err);
      }

      // Fallback to local state if DB update fails or there is an issue
      setProfile({
        ...newProfile,
        created_at: currentUser.created_at
      } as Profile);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user);
  };

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Session retrieval error:', error.message);
          const errMsg = error.message.toLowerCase();
          if (
            errMsg.includes('refresh token') || 
            errMsg.includes('invalid') || 
            errMsg.includes('not found') ||
            errMsg.includes('expired')
          ) {
            // Forceful cleanup for persistent auth errors
            console.warn('Handling stale session: clearing storage and resetting.');
            
            // Clear all local storage related to supabase
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes('supabase') || key.includes('-auth-token'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            
            // Sign out locally
            supabase.auth.signOut({ scope: 'local' }).finally(() => {
              // Only redirect if we were previously trying to stay logged in
              // or if we're on a protected page. For now, a simple reload or redirect to / works.
              window.location.href = '/'; 
            });
            return;
          }
        }
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchProfile(currentUser.id, currentUser);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Unexpected auth error during init:', err);
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
