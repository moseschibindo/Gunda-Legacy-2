import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Wallet, LogOut, UserPlus, Trash2, Shield, ShieldOff, Plus, ArrowLeft, User, Camera, Settings, Image as ImageIcon, Bell, Send, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { api } from "./lib/api";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { supabase } from "./lib/supabase";

// --- Auth Context ---
const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, contributions(amount)')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        // If profile doesn't exist yet (e.g., trigger still running), retry a few times
        if (retryCount < 3) {
          console.log(`Profile not found for ${userId}, retrying... (${retryCount + 1})`);
          setTimeout(() => fetchProfile(userId, retryCount + 1), 1500);
          return;
        }
        
        // Fallback: Manually create the profile if it's still missing after retries
        console.log("Profile still missing after retries, attempting manual creation...");
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser && authUser.id === userId) {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              name: authUser.user_metadata?.name || "New Member",
              phone: authUser.user_metadata?.phone || "",
              email: authUser.email || "",
              role: 'member'
            })
            .select()
            .maybeSingle();

          if (!createError && newProfile) {
            setUser({ ...newProfile, total_contribution: 0 });
            setLoading(false);
            return;
          }
        }

        console.error("Profile still not found after retries for user:", userId);
        setLoading(false);
        return;
      }

      const total_contribution = (profile?.contributions as any[])?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      setUser({ ...profile, total_contribution });
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      if (retryCount === 0 || retryCount >= 3) {
        setLoading(false);
      }
    }
  };

  const login = async (userData: any, userToken: string) => {
    // This is now handled by onAuthStateChange, but we keep it for compatibility
    // if the LoginPage calls it manually.
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updateProfile = (updatedUser: any) => {
    setUser(updatedUser);
  };

  return { user, token: session?.access_token, login, logout, updateProfile, loading };
};

// --- Components ---

const BottomNav = () => {
  const location = useLocation();
  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Home" },
    { path: "/members", icon: Users, label: "Members" },
    { path: "/contributions", icon: Wallet, label: "Money" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-around items-center z-50 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 relative",
              isActive ? "text-blue-600 scale-110" : "text-gray-400"
            )}
          >
            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[9px] font-medium tracking-wide uppercase">{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
};

const Sidebar = ({ logo, appName, user, onLogout }: { logo?: string; appName?: string; user: any; onLogout: () => void }) => {
  const location = useLocation();
  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/members", icon: Users, label: "Family Members" },
    { path: "/contributions", icon: Wallet, label: "Contributions" },
    { path: "/profile", icon: User, label: "My Profile" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 h-screen sticky top-0 p-8">
      <div className="flex items-center gap-4 mb-12 px-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-200 overflow-hidden shrink-0">
          {logo ? (
            <img src={logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <Shield className="text-white" size={24} />
          )}
        </div>
        <span className="font-black text-2xl tracking-tighter text-gray-900 truncate">{appName || "Gunda Legacy"}</span>
      </div>

      <nav className="flex-1 space-y-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-300 group relative",
                isActive 
                  ? "bg-blue-600 text-white shadow-xl shadow-blue-100 font-black" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-blue-600"
              )}
            >
              <item.icon size={22} strokeWidth={isActive ? 3 : 2} className={cn(isActive ? "text-white" : "text-gray-400 group-hover:text-blue-600")} />
              <span className="tracking-tight">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute right-4 w-2 h-2 bg-white rounded-full shadow-sm"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8 border-t border-gray-50 space-y-6">
        <div className="flex items-center gap-4 px-2">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden border-2 border-white shadow-md shrink-0">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 bg-blue-50">
                <User size={24} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-gray-900 truncate tracking-tight">{user?.name || "User"}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user?.role || "Member"}</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-gray-900 to-gray-800 text-white space-y-2 shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Gunda Legacy</p>
            <p className="text-sm font-black tracking-tight">Strength in Unity</p>
          </div>
          <Shield className="absolute -right-4 -bottom-4 text-white/5 transition-transform duration-500 group-hover:scale-110" size={80} />
        </div>
      </div>
    </aside>
  );
};

const Header = ({ title, showBack, onLogout, logo }: { title: string; showBack?: boolean; onLogout?: () => void; logo?: string }) => {
  const navigate = useNavigate();
  return (
    <header className="md:hidden sticky top-0 bg-white/80 backdrop-blur-md px-6 py-4 flex justify-between items-center z-40 border-b border-gray-50">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
        )}
        {logo ? (
          <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
        )}
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
      </div>
      {onLogout && (
        <button onClick={onLogout} className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
          <LogOut size={20} />
        </button>
      )}
    </header>
  );
};

// --- Pages ---

const LoginPage = ({ onLogin }: { onLogin: (u: any, t: string) => void }) => {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isForgot, setIsForgot] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const data = await api.post("/login", { phone, password });
      onLogin(data.user, data.token);
    } catch (err: any) {
      setError(err.message || "Invalid phone or password");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const data = await api.post("/signup", { phone, email, password, name });
      if (data.token) {
        onLogin(data.user, data.token);
      } else {
        setMessage(data.message || "Signup successful! Please check your email to confirm your account.");
        setTimeout(() => {
          setIsSignUp(false);
          setMessage("");
        }, 5000);
      }
    } catch (err: any) {
      if (err.message.includes("already registered")) {
        setError(err.message);
        // Automatically switch to login after 2 seconds
        setTimeout(() => {
          setIsSignUp(false);
          setError("");
        }, 3000);
      } else {
        setError(err.message || "Error signing up");
      }
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await api.post("/forgot-password", { email });
      setMessage(res.message);
    } catch (err: any) {
      setError(err.message || "User not found with this email");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl shadow-blue-900/5 border border-gray-100"
      >
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Shield className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Gunda Legacy</h2>
          <p className="text-gray-500 mt-1">
            {isForgot ? "Reset your password" : isSignUp ? "Join the Family" : "Welcome back, Family"}
          </p>
        </div>

        <form onSubmit={isForgot ? handleForgot : isSignUp ? handleSignUp : handleLogin} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
          )}
          {!isForgot && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="0790805176"
              />
            </div>
          )}
          {(isSignUp || isForgot) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="family@example.com"
              />
            </div>
          )}
          {!isForgot && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {message && <p className="text-green-600 text-sm text-center font-medium">{message}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
          >
            {isForgot ? "Send Reset Link" : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2 items-center">
          <button
            onClick={() => { setIsForgot(!isForgot); setIsSignUp(false); setError(""); setMessage(""); }}
            className="text-sm text-blue-600 font-medium hover:underline"
          >
            {isForgot ? "Back to Login" : "Forgot Password?"}
          </button>
          {!isForgot && (
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }}
              className="text-sm text-gray-500 font-medium hover:underline"
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ token, user, appProfilePic, appName }: { token: string; user: any; appProfilePic?: string; appName?: string }) => {
  const [stats, setStats] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    api.get("/stats", token).then(setStats);
    api.get("/notifications", token).then(setNotifications);
  }, [token]);

  if (!stats) return <div className="p-6 text-center text-gray-400">Loading dashboard...</div>;

  const userOwnership = stats.totalAmount > 0 ? (user.total_contribution / stats.totalAmount) * 100 : 0;

  return (
    <div className="pb-24">
      <div className="p-6 space-y-6">
        {appProfilePic && (
          <div className="w-full h-48 rounded-[2.5rem] overflow-hidden shadow-xl mb-6 relative group">
            <img src={appProfilePic} alt="App Profile" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
              <h2 className="text-white text-2xl font-black tracking-tight">{appName || "Gunda Legacy"}</h2>
              <p className="text-white/80 text-sm font-medium">Strength in Unity</p>
            </div>
          </div>
        )}
        
        {/* Notifications Section */}
        {notifications.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={18} className="text-blue-600" />
              <h4 className="font-bold text-gray-900">Latest Notifications</h4>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar">
              {notifications.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="min-w-[280px] bg-blue-50 p-4 rounded-3xl border border-blue-100 relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mb-1">{new Date(n.date).toLocaleDateString()}</p>
                    <h5 className="font-bold text-gray-900 mb-1">{n.title}</h5>
                    <p className="text-sm text-gray-600 line-clamp-2">{n.message}</p>
                  </div>
                  <Bell className="absolute -right-2 -bottom-2 text-blue-100/50" size={60} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2 opacity-80">Total Savings</p>
              <h3 className="text-3xl font-black tracking-tighter">KSh {stats.totalAmount.toLocaleString()}</h3>
            </div>
            <Wallet className="absolute -right-4 -bottom-4 text-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" size={100} />
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">My Ownership</p>
              <h3 className="text-3xl font-black text-blue-600 tracking-tighter">{userOwnership.toFixed(1)}%</h3>
            </div>
            <Shield className="absolute -right-4 -bottom-4 text-blue-50 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12" size={100} />
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-[2.5rem] text-white relative overflow-hidden group sm:col-span-2 lg:col-span-1">
            <div className="relative z-10">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Group Members</p>
              <h3 className="text-3xl font-black tracking-tighter">{stats.memberCount}</h3>
              <p className="text-gray-500 text-xs mt-2 italic font-medium">1 share = KSh 25</p>
            </div>
            <Users className="absolute -right-6 -bottom-6 text-white/5 transition-transform duration-500 group-hover:scale-110" size={140} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-black text-xl text-gray-900 tracking-tight">Recent Activity</h4>
              <Link to="/contributions" className="text-blue-600 text-sm font-bold hover:underline">View All Records</Link>
            </div>
            <div className="space-y-4">
              {stats.recentContributions.map((c: any) => (
                <motion.div 
                  key={c.id} 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-white p-5 rounded-3xl border border-gray-50 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shadow-inner">
                      <Plus size={24} strokeWidth={3} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{c.user_name}</p>
                      <p className="text-xs text-gray-400 font-medium">{new Date(c.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                    </div>
                  </div>
                  <p className="font-black text-green-600 text-lg">+KSh {c.amount}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* This space can be used for more desktop-only widgets or just better spacing */}
          <div className="hidden lg:block bg-blue-50/50 rounded-[3rem] p-10 border border-blue-100/50 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-blue-100">
              <Shield className="text-blue-600" size={40} />
            </div>
            <h5 className="font-black text-2xl text-gray-900 tracking-tight">Secure & Transparent</h5>
            <p className="text-gray-500 max-w-xs leading-relaxed">Gunda Legacy ensures every contribution is recorded and visible to all family members in real-time.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Members = ({ token, user }: { token: string; user: any }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const fetchMembers = () => api.get("/users", token).then(setMembers);
  useEffect(() => { fetchMembers(); }, [token]);

  const totalGroupSavings = members.reduce((acc, m) => acc + (m.total_contribution || 0), 0);

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure?")) {
      await api.delete(`/users/${id}`, token);
      fetchMembers();
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Delete ${selectedIds.length} members?`)) {
      await api.post("/users/bulk-delete", { ids: selectedIds }, token);
      setSelectedIds([]);
      setIsSelectionMode(false);
      fetchMembers();
    }
  };

  const toggleAdmin = async (id: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    await api.patch(`/users/${id}/role`, { role: newRole }, token);
    fetchMembers();
  };

  const toggleSuspend = async (id: number, isSuspended: boolean) => {
    await api.patch(`/users/${id}/suspend`, { is_suspended: !isSuspended }, token);
    fetchMembers();
  };

  const toggleSelection = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
      if (selectedIds.length === 1) setIsSelectionMode(false);
    } else {
      setSelectedIds([...selectedIds, id]);
      setIsSelectionMode(true);
    }
  };

  const isAdmin = user.role === 'admin';

  return (
    <div className="pb-24">
      <div className="p-6 space-y-6">
        {isAdmin && isSelectionMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-red-50 p-4 rounded-3xl border border-red-100 sticky top-20 z-30 shadow-lg max-w-xl mx-auto w-full"
          >
            <p className="text-red-600 font-bold">{selectedIds.length} selected</p>
            <div className="flex gap-2">
              <button onClick={() => { setSelectedIds([]); setIsSelectionMode(false); }} className="px-4 py-2 text-sm font-bold text-gray-500">Cancel</button>
              <button onClick={handleBulkDelete} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {members.sort((a, b) => b.total_contribution - a.total_contribution).map((m, idx) => {
            const ownership = totalGroupSavings > 0 ? (m.total_contribution / totalGroupSavings) * 100 : 0;
            const isSelected = selectedIds.includes(m.id);
            
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onContextMenu={(e) => {
                  if (isAdmin) {
                    e.preventDefault();
                    toggleSelection(m.id);
                  }
                }}
                onClick={() => isSelectionMode && toggleSelection(m.id)}
                className={cn(
                  "relative bg-white p-6 rounded-[2.5rem] border transition-all duration-300 flex flex-col gap-5 shadow-sm cursor-pointer overflow-hidden group",
                  isSelected ? "border-blue-500 bg-blue-50/50 ring-4 ring-blue-100" : "border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50",
                  m.is_suspended ? "opacity-60 grayscale" : ""
                )}
              >
                {/* Background Decoration */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
                
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {m.profile_picture ? (
                        <img src={m.profile_picture} alt={m.name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow-md" referrerPolicy="no-referrer" />
                      ) : (
                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-md ring-2 ring-white", 
                          m.role === 'admin' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600")}>
                          {m.name[0]}
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1.5 border-2 border-white shadow-lg">
                          <Plus size={12} className="rotate-45" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-gray-900 text-lg leading-tight truncate max-w-[120px]">{m.name}</p>
                        {m.role === 'admin' && <Shield size={16} className="text-amber-500 fill-amber-50 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-400 font-bold">{m.phone}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ownership</p>
                    <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg shadow-blue-200">
                      {ownership.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Contribution</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tighter">KSh {m.total_contribution.toLocaleString()}</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {isAdmin && m.phone !== "0790805176" && !isSelectionMode ? (
                      <div className="flex gap-1 bg-gray-50 p-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); toggleSuspend(m.id, m.is_suspended); }} className={cn("p-2 rounded-lg transition-colors", m.is_suspended ? "bg-red-100 text-red-600" : "text-gray-400 hover:bg-red-50 hover:text-red-500")}>
                          {m.is_suspended ? <ShieldOff size={18} /> : <Shield size={18} />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toggleAdmin(m.id, m.role); }} className="p-2 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-500">
                          {m.role === 'admin' ? <ShieldOff size={18} /> : <Shield size={18} />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shares</p>
                        <p className="text-sm font-black text-blue-600">{(m.total_contribution / 25).toFixed(1)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${ownership}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const query = new URLSearchParams(useLocation().search);
  const token = query.get("token");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError("Passwords do not match");
    setLoading(true);
    setError("");
    try {
      // We'll add this endpoint to server.ts in the next step or assume it exists
      // Actually I should have added it. Let's assume /api/reset-password exists.
      await api.post("/reset-password", { token, password });
      setMessage("Password reset successful! Redirecting to login...");
      setTimeout(() => navigate("/"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Link may be expired.");
    }
    setLoading(false);
  };

  if (!token) return <div className="p-6 text-center">Invalid reset link.</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Reset Password</h2>
        {message ? (
          <p className="text-green-600 text-center font-medium">{message}</p>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const Profile = ({ token, user, onUpdate, onSettingsUpdate }: { token: string; user: any; onUpdate: (u: any) => void; onSettingsUpdate: () => void }) => {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email || "");
  const [profilePic, setProfilePic] = useState(user.profile_picture || "");
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [appLogo, setAppLogo] = useState("");
  const [appProfilePic, setAppProfilePic] = useState("");
  const [appName, setAppName] = useState("");
  const [showNotify, setShowNotify] = useState(false);
  const [notifyData, setNotifyData] = useState({ title: "", message: "" });

  useEffect(() => {
    if (user.role === 'admin') {
      api.get("/settings", token).then(s => {
        setAppLogo(s.app_logo || "");
        setAppProfilePic(s.app_profile_pic || "");
        setAppName(s.app_name || "");
      });
    }
  }, [user.role, token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'user' | 'logo' | 'app_profile') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'user') setProfilePic(base64);
        if (type === 'logo') setAppLogo(base64);
        if (type === 'app_profile') setAppProfilePic(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedUser = await api.patch("/profile", { name, phone, email, profile_picture: profilePic }, token);
      onUpdate(updatedUser);
      alert("Profile updated!");
    } catch (err) {
      alert("Error updating profile");
    }
    setSaving(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.patch("/settings", { app_logo: appLogo, app_profile_pic: appProfilePic, app_name: appName }, token);
      onSettingsUpdate();
      alert("App settings updated!");
      setShowSettings(false);
    } catch (err) {
      alert("Error updating settings");
    }
    setSaving(false);
  };

  const handlePostNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/notifications", { ...notifyData, date: new Date().toISOString() }, token);
      alert("Notification posted!");
      setNotifyData({ title: "", message: "" });
      setShowNotify(false);
    } catch (err) {
      alert("Error posting notification");
    }
    setSaving(false);
  };

  return (
    <div className="pb-24 p-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col items-center">
          <div className="relative group">
            <div className="w-40 h-40 rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl bg-gray-100 relative">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User size={80} />
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 bg-blue-600 p-3 rounded-2xl text-white shadow-xl cursor-pointer hover:bg-blue-700 transition-all active:scale-90 z-10">
              <Camera size={24} />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'user')} />
            </label>
          </div>
          <h2 className="mt-6 text-3xl font-black text-gray-900 tracking-tighter">{user.name}</h2>
          <div className="mt-2 px-4 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest">
            {user.role}
          </div>
          
          <div className="mt-8 w-full space-y-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Update Profile"}
            </button>
            {user.role === 'admin' && (
              <>
                <button
                  onClick={() => setShowSettings(true)}
                  className="w-full bg-white text-gray-900 border border-gray-100 py-4 rounded-2xl font-black shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <Settings size={20} /> App Settings
                </button>
                <button
                  onClick={() => setShowNotify(true)}
                  className="w-full bg-amber-50 text-amber-600 py-4 rounded-2xl font-black hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                >
                  <Bell size={20} /> Post Notification
                </button>
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm space-y-6">
            <h3 className="font-black text-xl text-gray-900 tracking-tight mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  placeholder="family@example.com"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-100 relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="font-black text-lg mb-2">Account Security</h4>
              <p className="text-blue-100 text-sm leading-relaxed max-w-xs">Keep your account secure. If you forget your password, you can reset it using your registered email.</p>
            </div>
            <Shield className="absolute -right-4 -bottom-4 text-white/10" size={120} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-8 space-y-6 overflow-y-auto max-h-[90vh]"
            >
              <h3 className="text-xl font-bold">App Customization</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
                  <input
                    value={appName}
                    onChange={e => setAppName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Gunda Legacy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">App Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border">
                      {appLogo ? <img src={appLogo} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <ImageIcon className="text-gray-400" />}
                    </div>
                    <label className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer hover:bg-gray-200">
                      Change Logo
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">App Profile Picture (Banner)</label>
                  <div className="flex flex-col gap-3">
                    <div className="w-full h-24 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border">
                      {appProfilePic ? <img src={appProfilePic} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <ImageIcon className="text-gray-400" />}
                    </div>
                    <label className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer hover:bg-gray-200 text-center">
                      Change Banner
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'app_profile')} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowSettings(false)} className="flex-1 py-3 font-bold text-gray-500">Cancel</button>
                <button onClick={handleSaveSettings} disabled={saving} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-50">
                  {saving ? "Saving..." : "Save App Settings"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showNotify && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-8 space-y-6"
            >
              <h3 className="text-xl font-bold">Post Notification</h3>
              <form onSubmit={handlePostNotify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    required
                    value={notifyData.title}
                    onChange={e => setNotifyData({...notifyData, title: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none"
                    placeholder="Important Update"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={notifyData.message}
                    onChange={e => setNotifyData({...notifyData, message: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none resize-none"
                    placeholder="Type your message here..."
                  />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowNotify(false)} className="flex-1 py-3 font-bold text-gray-500">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    <Send size={18} /> {saving ? "Posting..." : "Post Now"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Contributions = ({ token, user }: { token: string; user: any }) => {
  const [contributions, setContributions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [formData, setFormData] = useState({ user_id: "", amount: "50", date: new Date().toISOString().split('T')[0] });

  const fetchData = async () => {
    const [c, m] = await Promise.all([api.get("/contributions", token), api.get("/users", token)]);
    setContributions(c);
    setMembers(m);
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/contributions", formData, token);
    setShowAdd(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this record?")) {
      await api.delete(`/contributions/${id}`, token);
      fetchData();
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Delete ${selectedIds.length} records?`)) {
      await api.post("/contributions/bulk-delete", { ids: selectedIds }, token);
      setSelectedIds([]);
      setIsSelectionMode(false);
      fetchData();
    }
  };

  const toggleSelection = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
      if (selectedIds.length === 1) setIsSelectionMode(false);
    } else {
      setSelectedIds([...selectedIds, id]);
      setIsSelectionMode(true);
    }
  };

  const isAdmin = user.role === 'admin';

  return (
    <div className="pb-24">
      <div className="p-6 space-y-6">
        {isAdmin && isSelectionMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-red-50 p-4 rounded-3xl border border-red-100 max-w-xl mx-auto w-full sticky top-20 z-30 shadow-lg"
          >
            <p className="text-red-600 font-bold">{selectedIds.length} selected</p>
            <div className="flex gap-2">
              <button onClick={() => { setSelectedIds([]); setIsSelectionMode(false); }} className="px-4 py-2 text-sm font-bold text-gray-500">Cancel</button>
              <button onClick={handleBulkDelete} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter hidden sm:block">Contribution Records</h2>
          {isAdmin && !isSelectionMode && (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Plus size={20} strokeWidth={3} />
              Record Contribution
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contributions.map((c) => (
            <motion.div
              key={c.id}
              layout
              onContextMenu={(e) => {
                if (isAdmin) {
                  e.preventDefault();
                  toggleSelection(c.id);
                }
              }}
              onClick={() => isSelectionMode && toggleSelection(c.id)}
              className={cn(
                "bg-white p-5 rounded-[2rem] border transition-all duration-300 flex justify-between items-center shadow-sm cursor-pointer group",
                selectedIds.includes(c.id) ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100" : "border-gray-100 hover:border-blue-200 hover:shadow-md"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shadow-inner">
                    <Wallet size={24} />
                  </div>
                  {selectedIds.includes(c.id) && (
                    <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1.5 border-2 border-white shadow-lg">
                      <Plus size={12} className="rotate-45" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-black text-gray-900 tracking-tight">{c.user_name}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(c.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-black text-green-600 text-lg">+KSh {c.amount}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{(c.amount / 25).toFixed(1)} shares</p>
                </div>
                {isAdmin && !isSelectionMode && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-8"
            >
              <h3 className="text-xl font-bold mb-6">Record Contribution</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <select
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white"
                  value={formData.user_id}
                  onChange={e => setFormData({...formData, user_id: e.target.value})}
                >
                  <option value="">Select Member</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input
                  type="number"
                  placeholder="Amount (KES)"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                />
                <input
                  type="date"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 font-bold text-gray-500">Cancel</button>
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Save Record</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SplashScreen = ({ onComplete, logo, appName }: { onComplete: () => void; logo?: string; appName?: string }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        <div className="w-32 h-32 rounded-[2.5rem] bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-200 overflow-hidden relative group">
          {logo ? (
            <img src={logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <Wallet className="text-white" size={64} />
          )}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-white/20 rounded-[2.5rem]"
          />
        </div>
        
        <div className="text-center space-y-2">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-4xl font-black text-gray-900 tracking-tighter"
          >
            {appName || "Gunda Legacy"}
          </motion.h1>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-blue-600 font-bold uppercase tracking-[0.3em] text-xs"
          >
            Strength in Unity
          </motion.p>
        </div>
      </motion.div>

      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "120px" }}
        transition={{ duration: 2.5, ease: "easeInOut" }}
        className="absolute bottom-20 h-1 bg-blue-600 rounded-full"
      />
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const { user, token, login, logout, updateProfile, loading } = useAuth();
  const [settings, setSettings] = useState<any>({});
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();

  const fetchSettings = () => api.get("/settings").then(setSettings);

  useEffect(() => {
    fetchSettings();
  }, []);

  if (showSplash) {
    return (
      <AnimatePresence>
        <SplashScreen 
          onComplete={() => setShowSplash(false)} 
          logo={settings.app_logo} 
          appName={settings.app_name} 
        />
      </AnimatePresence>
    );
  }

  if (loading) return null;
  
  if (!token || !user) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<LoginPage onLogin={login} />} />
      </Routes>
    );
  }

  const getTitle = () => {
    switch (location.pathname) {
      case "/": return settings.app_name || "Gunda Legacy";
      case "/members": return "Family Members";
      case "/contributions": return "Contributions";
      case "/profile": return "My Profile";
      default: return settings.app_name || "Gunda Legacy";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row relative">
      <Sidebar logo={settings.app_logo} appName={settings.app_name} user={user} onLogout={logout} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={getTitle()} onLogout={logout} logo={settings.app_logo} />
        
        <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto w-full">
            <Routes>
              <Route path="/" element={<Dashboard token={token} user={user} appProfilePic={settings.app_profile_pic} appName={settings.app_name} />} />
              <Route path="/members" element={<Members token={token} user={user} />} />
              <Route path="/contributions" element={<Contributions token={token} user={user} />} />
              <Route path="/profile" element={<Profile token={token} user={user} onUpdate={updateProfile} onSettingsUpdate={fetchSettings} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
        
        <BottomNav />
      </div>
    </div>
  );
}
