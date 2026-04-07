import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, Phone, Eye, EyeOff } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Layout } from './components/Layout';
import { SplashScreen } from './components/SplashScreen';

// Pages
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { Dashboard } from './pages/Dashboard';
import { ContributionsPage } from './pages/ContributionsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MembersPage } from './pages/MembersPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  
  if (profile?.is_suspended) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center space-y-4 bg-white p-8 rounded-3xl shadow-xl border border-red-100">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Account Suspended</h2>
          <p className="text-slate-500">Your account has been suspended. Please contact the administrator for more information.</p>
          <button 
            onClick={signOut}
            className="w-full py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/" />;

  return <Layout>{children}</Layout>;
}

function AppContent() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // Show splash while loading auth state OR if user is logged in and splash hasn't finished
  if (loading || (user && showSplash)) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPasswordPage />} />
      
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/contributions" element={<ProtectedRoute><ContributionsPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
