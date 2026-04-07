import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, DollarSign, User, ShieldCheck, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

const Sidebar: React.FC = () => {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const isAdmin = profile?.role === 'admin';
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

    if (location.pathname === '/notifications') {
      setUnreadCount(0);
    } else {
      fetchUnread();
    }

    const channel = supabase
      .channel('sidebar-notifications-count')
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

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/members', icon: Users, label: 'Members' },
    { to: '/contributions', icon: DollarSign, label: 'Savings' },
    { to: '/notifications', icon: Bell, label: 'Notifications', badge: unreadCount },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', icon: ShieldCheck, label: 'Admin Panel' });
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#111111] border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 transition-colors duration-300">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          {settings.app_logo ? (
            <img src={settings.app_logo} alt="Logo" className="w-10 h-10 rounded-xl" />
          ) : (
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-xl">
              G
            </div>
          )}
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white truncate">{settings.app_name}</h1>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">Legacy Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all font-bold",
                isActive 
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200"
              )
            }
          >
            <item.icon size={20} />
            <span className="text-sm flex-1">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden border border-emerald-200 dark:border-emerald-800">
            {profile?.profile_picture ? (
              <img src={profile.profile_picture} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                {profile?.name?.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{profile?.name}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase truncate">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors font-bold text-sm"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
