import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Phone, Mail, Camera, Save, AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export function ProfilePage() {
  const { profile, signOut } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [profilePic, setProfilePic] = useState(profile?.profile_picture || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          profile_picture: profilePic,
        })
        .eq('id', profile.id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Your Profile</h1>
        <p className="text-slate-500 font-medium">Manage your personal information and identity</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-10" />
        
        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <img
              src={profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'M')}&background=random`}
              alt="Profile"
              className="relative h-32 w-32 rounded-full border-4 border-white shadow-2xl object-cover"
              referrerPolicy="no-referrer"
            />
            <button className="absolute bottom-0 right-0 p-3 bg-blue-600 text-white rounded-2xl shadow-xl hover:bg-blue-700 transition-all hover:scale-110 active:scale-95">
              <Camera className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-8 relative z-10">
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "flex items-center p-4 rounded-2xl text-sm font-bold shadow-sm",
                message.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
              )}
            >
              {message.type === 'success' ? <Save className="mr-3 h-5 w-5" /> : <AlertCircle className="mr-3 h-5 w-5" />}
              {message.text}
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-slate-900"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                <input
                  type="text"
                  disabled
                  className="block w-full pl-12 pr-4 py-3.5 border border-slate-100 bg-slate-50/50 rounded-2xl text-slate-400 cursor-not-allowed font-bold"
                  value={profile?.phone || ''}
                />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                <input
                  type="email"
                  disabled
                  className="block w-full pl-12 pr-4 py-3.5 border border-slate-100 bg-slate-50/50 rounded-2xl text-slate-400 cursor-not-allowed font-bold"
                  value={profile?.email || ''}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-4 px-6 rounded-2xl shadow-xl text-base font-black text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 transition-all hover:-translate-y-1 active:translate-y-0"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving Changes...
              </span>
            ) : (
              <>
                Save Changes
                <Save className="ml-3 h-5 w-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-12 pt-10 border-t border-slate-100 relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg font-black text-slate-900">Account Session</h3>
              <p className="text-sm text-slate-500 font-medium">Sign out of your account on this device</p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center px-8 py-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all hover:scale-105 active:scale-95 group"
            >
              Sign Out
              <LogOut className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
