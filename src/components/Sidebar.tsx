import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, DollarSign, User, ShieldCheck, LogOut, Bell, ChevronLeft, Menu } from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

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
    <aside className={cn(
      "hidden md:flex flex-col bg-white dark:bg-[#111111] border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 transition-all duration-300 z-40 overflow-hidden",
      isCollapsed ? "w-24" : "w-64"
    )}>
      {/* Header with Toggle */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-3 overflow-hidden">
            {settings.app_logo ? (
              <img src={settings.app_logo} alt="Logo" className="w-8 h-8 rounded-lg flex-none" />
            ) : (
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-lg flex-none">
                {settings.app_name?.charAt(0) || 'L'}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 dark:text-white truncate text-sm">{settings.app_name}</h1>
              <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-[0.2em] truncate">Platform</p>
            </div>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "p-2 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors",
            isCollapsed && "mx-auto"
          )}
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-2 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center px-4 py-3 rounded-2xl transition-all font-bold group relative",
                isActive 
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200",
                isCollapsed ? "justify-center" : "space-x-4"
              )
            }
          >
            <item.icon size={20} className="flex-none" />
            {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
            
            {/* Badge */}
            {item.badge !== undefined && item.badge > 0 && (
              <span className={cn(
                "bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                isCollapsed ? "absolute top-2 right-2 border-2 border-white dark:border-[#111111]" : ""
              )}>
                {item.badge}
              </span>
            )}

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout Section */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <div className={cn(
          "flex items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl mb-3",
          isCollapsed ? "justify-center" : "space-x-3"
        )}>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden border border-emerald-200 dark:border-emerald-800 flex-none">
            {profile?.profile_picture ? (
              <img src={profile.profile_picture} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                {profile?.name?.charAt(0)}
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 overflow-hidden">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{profile?.name}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase truncate">{profile?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors font-bold text-sm group relative",
            isCollapsed ? "justify-center" : "space-x-4"
          )}
        >
          <LogOut size={20} className="flex-none" />
          {!isCollapsed && <span>Sign Out</span>}

          {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-2 bg-red-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              Sign Out
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
