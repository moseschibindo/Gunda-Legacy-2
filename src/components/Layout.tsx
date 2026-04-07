import { ReactNode, useState, useEffect } from 'react';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History, 
  Users, 
  UserCircle, 
  Settings, 
  LogOut,
  Bell
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../hooks/useSettings';
import { useNotifications } from '../hooks/useNotifications';
import { cn } from '../lib/utils';

export function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { settings } = useSettings();
  const { notifications } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [lastRead, setLastRead] = useState<string>(localStorage.getItem('last_read_notifications') || new Date(0).toISOString());

  useEffect(() => {
    if (location.pathname === '/notifications') {
      const now = new Date().toISOString();
      localStorage.setItem('last_read_notifications', now);
      setLastRead(now);
    }
  }, [location.pathname]);

  const hasUnread = notifications.some(n => new Date(n.date) > new Date(lastRead));

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/contributions', icon: History, label: 'History' },
    { to: '/members', icon: Users, label: 'Members' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-full w-64 border-r border-gray-200 bg-white lg:block shadow-sm">
        <div className="flex h-full flex-col p-6">
          <div className="flex items-center space-x-3 mb-10 px-2">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <img src={settings.app_logo} alt="Logo" className="h-7 w-7 rounded-lg object-cover" referrerPolicy="no-referrer" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">{settings.app_name}</span>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-blue-50 text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            {profile?.role === 'admin' && (
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  cn(
                    'flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-blue-50 text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  )
                }
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </NavLink>
            )}
          </nav>

          <button
            onClick={handleSignOut}
            className="mt-auto flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500 transition-all hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pb-24 lg:pb-10">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-white/80 backdrop-blur-md px-6 py-4 lg:hidden border-b border-gray-100 shadow-sm">
          <div className="flex items-center">
            <img src={settings.app_logo} alt="Logo" className="h-9 w-9 rounded-xl shadow-sm" referrerPolicy="no-referrer" />
            <span className="ml-3 font-bold text-lg tracking-tight text-gray-900">{settings.app_name}</span>
          </div>
          <Link to="/notifications" className="relative rounded-full p-2.5 text-gray-600 hover:bg-gray-100 transition-colors">
            <Bell className="h-6 w-6" />
            {hasUnread && (
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse" />
            )}
          </Link>
        </header>

        {/* Desktop Header (Hidden on Mobile) */}
        <header className="hidden lg:flex sticky top-0 z-30 items-center justify-end bg-white/80 backdrop-blur-md px-10 py-4 border-b border-gray-100 mb-8">
          <Link to="/notifications" className="relative rounded-full p-2.5 text-gray-600 hover:bg-gray-100 transition-colors mr-4">
            <Bell className="h-6 w-6" />
            {hasUnread && (
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse" />
            )}
          </Link>
          <div className="flex items-center space-x-3 border-l pl-6 border-gray-200">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{profile?.name || 'Member'}</p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
            </div>
            <img 
              src={profile?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'M')}&background=random`} 
              className="h-10 w-10 rounded-full border border-gray-200 shadow-sm"
              alt="Profile"
            />
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 z-40 w-full border-t border-gray-100 bg-white/90 backdrop-blur-lg lg:hidden px-4 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center space-y-1 rounded-2xl px-4 py-2 transition-all duration-300',
                  isActive ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-6 w-6", isActive ? "fill-blue-50" : "")} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
