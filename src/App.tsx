import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
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
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return null;

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" />
      ) : !user ? (
        <Login key="login" />
      ) : (
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row relative">
          <Sidebar />
          <div className="w-full max-w-5xl mx-auto bg-white min-h-screen shadow-xl flex flex-col relative lg:shadow-none lg:border-l lg:border-r lg:border-gray-100">
            <div className="lg:hidden">
              <Header />
            </div>
            <main className="flex-1 overflow-y-auto">
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
            <div className="lg:hidden">
              <BottomNav />
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </SettingsProvider>
  );
}
