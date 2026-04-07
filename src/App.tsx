import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AnimatePresence } from 'motion/react';

// Components
import SplashScreen from './components/SplashScreen';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Members from './pages/Members';
import Contributions from './pages/Contributions';

const ProfileGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  const isProfileIncomplete = !profile?.name || !profile?.email;
  const isAtProfilePage = location.pathname === '/profile';

  if (isProfileIncomplete && !isAtProfilePage) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, loading, profile } = useAuth();
  const { theme } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return null;

  return (
    <div className={theme}>
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" />
        ) : !user ? (
          <Login key="login" />
        ) : (
          <div className="h-screen h-[100dvh] bg-gray-50 dark:bg-[#0a0a0a] flex flex-col md:flex-row relative transition-colors duration-300 overflow-hidden">
            {/* Desktop Sidebar */}
            <Sidebar />
            
            <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
              {/* Mobile Header */}
              <div className="md:hidden flex-none z-30">
                <Header />
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <div className="w-full max-w-5xl mx-auto bg-white dark:bg-[#111111] h-full shadow-xl flex flex-col relative md:shadow-none md:border-l md:border-r md:border-gray-100 dark:md:border-gray-800 transition-colors duration-300 overflow-hidden">
                  <main className="flex-1 overflow-y-auto no-scrollbar overscroll-contain">
                    <ProfileGuard>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/members" element={<Members />} />
                        <Route path="/contributions" element={<Contributions />} />
                        <Route path="/admin" element={profile?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
                        <Route path="*" element={<Navigate to="/" />} />
                      </Routes>
                    </ProfileGuard>
                  </main>
                </div>
              </div>

              {/* Mobile Bottom Nav */}
              <div className="md:hidden flex-none z-30">
                <BottomNav />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
