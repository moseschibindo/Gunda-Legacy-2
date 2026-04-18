import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const Header: React.FC = () => {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const updateLastSeen = () => {
    localStorage.setItem('last_seen_notifications', new Date().toISOString());
    setUnreadCount(0);
  };

  useEffect(() => {
    if (location.pathname === '/notifications') {
      updateLastSeen();
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchUnread = async () => {
      const lastSeen = localStorage.getItem('last_seen_notifications') || new Date(0).toISOString();
      const now = new Date().toISOString();
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .gt('date', lastSeen)
        .or(`expires_at.gt.${now},expires_at.is.null`);
      
      if (!error && count !== null) {
        setUnreadCount(count);
      }
    };

    // If we are currently on the notifications page, we don't show the badge
    if (location.pathname === '/notifications') {
      setUnreadCount(0);
    } else {
      fetchUnread();
    }

    const channel = supabase
      .channel('notifications-count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        if (location.pathname !== '/notifications') {
          fetchUnread();
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' }, () => {
        if (location.pathname !== '/notifications') {
          fetchUnread();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [location.pathname]);

  return (
    <header className="relative z-30 bg-emerald-600 dark:bg-emerald-700 text-white px-4 py-3 flex items-center justify-between shadow-md transition-colors duration-300">
      <div className="flex items-center space-x-3">
        {settings.app_logo ? (
          <img src={settings.app_logo} alt="Logo" className="w-8 h-8 rounded-full border border-white/20" />
        ) : (
          <div className="w-8 h-8 bg-white text-emerald-600 dark:text-emerald-700 rounded-full flex items-center justify-center font-bold">
            {settings.app_name?.charAt(0) || 'L'}
          </div>
        )}
        <h1 className="font-bold text-lg truncate max-w-[180px]">{settings.app_name}</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <Link to="/notifications" className="relative p-1 hover:bg-emerald-700 dark:hover:bg-emerald-800 rounded-full transition-colors">
          <Bell size={24} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-emerald-600 dark:border-emerald-700">
              {unreadCount}
            </span>
          )}
        </Link>
        <Link to="/profile">
          <div className="w-8 h-8 rounded-full bg-emerald-500 dark:bg-emerald-600 border border-emerald-400 dark:border-emerald-500 overflow-hidden">
            {profile?.profile_picture ? (
              <img src={profile.profile_picture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                {profile?.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Header;
