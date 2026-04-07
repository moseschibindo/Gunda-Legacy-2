import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Phone, Mail, Camera, LogOut, Shield, CheckCircle, Loader2, Quote, TrendingUp, Calendar, Wallet, PieChart, ArrowUpRight, X, ShieldAlert, Plus, Edit2, Save, Moon, Sun } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

const Profile: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
  });
  const [uploading, setUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState('');
  const [totalSavings, setTotalSavings] = useState(0);
  const [savingsLoading, setSavingsLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);
  const { settings, refreshSettings } = useSettings();
  const [motivationEditing, setMotivationEditing] = useState(false);
  const [motivationInput, setMotivationInput] = useState(settings.weekly_motivation || '');
  const [motivationSaving, setMotivationSaving] = useState(false);

  const isProfileIncomplete = !profile?.name || !profile?.email;

  const quotes = [
    "Small steps lead to big changes. Keep saving!",
    "Financial freedom is a journey, not a destination.",
    "Your future self will thank you for the sacrifices you make today.",
    "Consistency is the key to wealth. You're doing great!",
    "A shilling saved is a shilling earned. Keep the momentum!",
    "Gunda Legacy is built on the strength of its members. Proud of you!",
    "Success is the sum of small efforts, repeated day in and day out.",
    "The best time to save was yesterday. The second best time is now.",
  ];

  useEffect(() => {
    if (settings.weekly_motivation) {
      setQuote(settings.weekly_motivation);
      setMotivationInput(settings.weekly_motivation);
    } else {
      // Pick a quote based on the day of the year to keep it "weekly" or consistent
      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const quoteIndex = Math.floor(dayOfYear / 7) % quotes.length;
      setQuote(quotes[quoteIndex]);
    }
  }, [settings.weekly_motivation]);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        email: profile.email || '',
      });
      fetchSavings();
      if (!profile.name || !profile.email) {
        setEditing(true);
      }
    }
  }, [profile]);

  const fetchSavings = async () => {
    if (!profile?.id) return;
    setSavingsLoading(true);
    const { data, error } = await supabase
      .from('contributions')
      .select('amount')
      .eq('user_id', profile.id);
    
    if (!error && data) {
      const total = data.reduce((acc, curr) => acc + curr.amount, 0);
      setTotalSavings(total);
    }
    setSavingsLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Update profile table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
      })
      .eq('id', profile?.id);

    if (!profileError) {
      // Optionally try to update auth email if changed
      if (formData.email !== profile?.email) {
        await supabase.auth.updateUser({ email: formData.email });
      }
      await refreshProfile();
      setEditing(false);
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    setError(null);
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile?.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, file);

    if (uploadError) {
      setError(uploadError.message);
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      await supabase
        .from('profiles')
        .update({ profile_picture: publicUrl })
        .eq('id', profile?.id);
      
      await refreshProfile();
    }
    setUploading(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || profile?.role !== 'admin') return;
    setLogoUploading(true);
    setError(null);
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `app-logo-${Math.random()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, file);

    if (uploadError) {
      setError(uploadError.message);
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      const response = await fetch('/api/admin/update-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ key: 'app_logo', value: publicUrl })
      });
      
      if (response.ok) {
        await refreshSettings();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update logo');
      }
    }
    setLogoUploading(false);
  };

  const handleUpdateMotivation = async () => {
    if (profile?.role !== 'admin') return;
    setMotivationSaving(true);
    
    try {
      const response = await fetch('/api/admin/update-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ key: 'weekly_motivation', value: motivationInput })
      });
      
      if (response.ok) {
        await refreshSettings();
        setMotivationEditing(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update motivation');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setMotivationSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h2>
        <button
          onClick={toggleTheme}
          className="p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      {isProfileIncomplete && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start space-x-3">
          <ShieldAlert className="text-amber-600 mt-0.5" size={20} />
          <div>
            <p className="text-amber-900 font-bold text-sm">Action Required</p>
            <p className="text-amber-700 text-xs mt-0.5">Please update your name and email address to continue using Gunda Legacy.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start space-x-3">
          <ShieldAlert className="text-red-600 mt-0.5" size={20} />
          <div>
            <p className="text-red-900 font-bold text-sm">Upload Error</p>
            <p className="text-red-700 text-xs mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#1a1a1a] rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm p-8 flex flex-col items-center transition-colors duration-300"
      >
        <div className="relative">
          <div 
            onClick={() => profile?.profile_picture && setShowImageModal(profile.profile_picture)}
            className={cn(
              "w-32 h-32 rounded-[32px] bg-emerald-100 dark:bg-emerald-900/30 border-4 border-white dark:border-gray-800 shadow-xl overflow-hidden",
              profile?.profile_picture && "cursor-pointer"
            )}
          >
            {uploading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
              </div>
            ) : profile?.profile_picture ? (
              <img src={profile.profile_picture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-emerald-600">
                {profile?.name?.charAt(0)}
              </div>
            )}
          </div>
          <label className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-3 rounded-2xl shadow-lg cursor-pointer hover:bg-emerald-700 transition-transform hover:scale-110 active:scale-95">
            <Camera size={20} />
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        </div>

        <div className="text-center mt-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.name}</h3>
          <div className="flex items-center justify-center space-x-2 mt-2">
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center",
              profile?.role === 'admin' ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
            )}>
              <Shield size={10} className="mr-1" />
              {profile?.role}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center">
              <CheckCircle size={10} className="mr-1" />
              Active
            </span>
          </div>
        </div>

        {!editing ? (
          <div className="w-full space-y-4 mt-8">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/50 transition-colors">
                <div className="text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-800 p-2.5 rounded-xl shadow-sm">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Full Name</p>
                  <p className="text-gray-900 dark:text-white font-bold">{profile?.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/50 transition-colors">
                <div className="text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-800 p-2.5 rounded-xl shadow-sm">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Phone Number</p>
                  <p className="text-gray-900 dark:text-white font-bold">{profile?.phone}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/50 transition-colors">
                <div className="text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-800 p-2.5 rounded-xl shadow-sm">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Email Address</p>
                  <p className="text-gray-900 dark:text-white font-bold truncate max-w-[180px]">{profile?.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/50 transition-colors">
                <div className="text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-800 p-2.5 rounded-xl shadow-sm">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Joined Date</p>
                  <p className="text-gray-900 dark:text-white font-bold">
                    {profile?.created_at ? format(new Date(profile.created_at), 'MMMM d, yyyy') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setEditing(true)}
              className="w-full py-4 bg-white dark:bg-transparent border-2 border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all active:scale-[0.98] mt-4"
            >
              Edit Profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="w-full mt-8 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all text-gray-900 dark:text-white"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase ml-1 tracking-wider">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all text-gray-900 dark:text-white"
                  placeholder="Enter your phone number"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase ml-1 tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all text-gray-900 dark:text-white"
                  placeholder="Enter your email address"
                  required
                />
              </div>
            </div>
            <div className="flex space-x-3 pt-2">
              {!isProfileIncomplete && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-[0.98]",
                  isProfileIncomplete ? "w-full" : "flex-1"
                )}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </motion.div>

      {/* Savings Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-[#1a1a1a] rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm p-6 transition-colors duration-300"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Savings Summary</h3>
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Wallet size={20} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20">
            <div className="flex items-center text-emerald-600 dark:text-emerald-400 mb-1">
              <PieChart size={14} className="mr-1.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Total Saved</span>
            </div>
            {savingsLoading ? (
              <div className="h-8 w-24 bg-emerald-100 dark:bg-emerald-900/20 animate-pulse rounded-lg mt-1" />
            ) : (
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalSavings)}</p>
            )}
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
            <div className="flex items-center text-blue-600 dark:text-blue-400 mb-1">
              <ArrowUpRight size={14} className="mr-1.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Status</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">On Track</p>
          </div>
        </div>
      </motion.div>

      {/* Admin App Logo Upload */}
      {profile?.role === 'admin' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-[#1a1a1a] rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm p-6 transition-colors duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">App Branding</h3>
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-xl text-purple-600 dark:text-purple-400">
              <Shield size={20} />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden relative group">
              {logoUploading ? (
                <Loader2 className="animate-spin text-emerald-600" size={24} />
              ) : settings.app_logo ? (
                <img src={settings.app_logo} alt="App Logo" className="w-full h-full object-contain" />
              ) : (
                <Camera size={24} className="text-gray-300 dark:text-gray-600" />
              )}
              <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Plus className="text-white" size={24} />
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={logoUploading} />
              </label>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white">App Logo</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload a logo to represent Gunda Legacy across the application.</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 uppercase tracking-wider">Admin Only</p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Weekly Motivation</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Set the motivational quote shown to all members.</p>
              </div>
              {!motivationEditing ? (
                <button 
                  onClick={() => setMotivationEditing(true)}
                  className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors"
                >
                  <Edit2 size={18} />
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button 
                    onClick={() => {
                      setMotivationEditing(false);
                      setMotivationInput(settings.weekly_motivation || '');
                    }}
                    className="p-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <X size={18} />
                  </button>
                  <button 
                    onClick={handleUpdateMotivation}
                    disabled={motivationSaving}
                    className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {motivationSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  </button>
                </div>
              )}
            </div>
            
            {motivationEditing ? (
              <textarea
                value={motivationInput}
                onChange={(e) => setMotivationInput(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all text-sm min-h-[100px] resize-none text-gray-900 dark:text-white"
                placeholder="Enter a motivational quote..."
              />
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-transparent italic text-sm text-gray-600 dark:text-gray-400">
                "{settings.weekly_motivation || 'No motivation set.'}"
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Motivational Quote Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-3">
            <Quote size={20} className="text-emerald-200" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Weekly Motivation</span>
          </div>
          <p className="text-lg font-medium leading-relaxed italic">"{quote}"</p>
          <div className="mt-4 flex items-center text-emerald-200 text-xs">
            <TrendingUp size={14} className="mr-1" />
            <span>You're making great progress this week!</span>
          </div>
        </div>
        <div className="absolute -right-6 -bottom-6 opacity-10">
          <TrendingUp size={120} />
        </div>
      </motion.div>

      <div className="space-y-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-3 p-5 bg-red-50 dark:bg-red-900/10 rounded-[24px] border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors active:scale-[0.98]"
        >
          <LogOut size={20} />
          <span>Sign Out of Gunda Legacy</span>
        </button>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowImageModal(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative max-w-full max-h-full"
          >
            <img src={showImageModal} alt="Full View" className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl" />
            <button 
              onClick={() => setShowImageModal(null)}
              className="absolute -top-12 right-0 text-white hover:text-emerald-400 transition-colors"
            >
              <X size={32} />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Profile;
