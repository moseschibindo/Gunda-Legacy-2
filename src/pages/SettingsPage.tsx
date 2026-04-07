import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Settings, Image, Type, Palette, Save, BellPlus, Clock, Upload } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { supabase } from '../lib/supabase';

export function SettingsPage() {
  const { settings: currentSettings } = useSettings();
  const [appName, setAppName] = useState(currentSettings.app_name);
  const [appSlogan, setAppSlogan] = useState(currentSettings.app_slogan);
  const [appLogo, setAppLogo] = useState(currentSettings.app_logo);
  const [heroImage, setHeroImage] = useState(currentSettings.hero_image);
  
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [expiryHours, setExpiryHours] = useState('24');
  
  const [loading, setLoading] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAppLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const updates = [
      { key: 'app_name', value: appName },
      { key: 'app_slogan', value: appSlogan },
      { key: 'app_logo', value: appLogo },
      { key: 'hero_image', value: heroImage },
    ];

    try {
      for (const update of updates) {
        await supabase
          .from('settings')
          .upsert(update, { onConflict: 'key' });
      }
      alert('Settings updated! Refresh to see changes.');
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifLoading(true);

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(expiryHours));

      const { error } = await supabase
        .from('notifications')
        .insert([
          {
            title: notifTitle,
            message: notifMessage,
            date: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          }
        ]);

      if (error) throw error;
      setNotifTitle('');
      setNotifMessage('');
      alert('Notification posted!');
    } catch (error) {
      console.error('Error posting notification:', error);
    } finally {
      setNotifLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
          <Settings className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Controls</h1>
          <p className="text-gray-500">Manage global app settings and announcements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* App Customization */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6"
        >
          <div className="flex items-center space-x-2 text-blue-600">
            <Palette className="h-5 w-5" />
            <h2 className="text-xl font-bold">App Customization</h2>
          </div>

          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">App Name</label>
              <div className="mt-1 relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Slogan</label>
              <input
                type="text"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                value={appSlogan}
                onChange={(e) => setAppSlogan(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">App Logo</label>
              <div className="mt-2 flex items-center space-x-4">
                <img src={appLogo} alt="Logo" className="h-12 w-12 rounded-full border shadow-sm" referrerPolicy="no-referrer" />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Upload className="mr-2 h-4 w-4" /> Change Logo
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Hero Image URL</label>
              <div className="mt-1 relative">
                <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                  value={heroImage}
                  onChange={(e) => setHeroImage(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Update Settings'}
            </button>
          </form>
        </motion.section>

        {/* Announcements */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6"
        >
          <div className="flex items-center space-x-2 text-purple-600">
            <BellPlus className="h-5 w-5" />
            <h2 className="text-xl font-bold">Post Announcement</h2>
          </div>

          <form onSubmit={handlePostNotification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                required
                placeholder="Important: Monthly Meeting"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Message</label>
              <textarea
                required
                rows={4}
                placeholder="Details about the announcement..."
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Display Duration (Hours)</label>
              <div className="mt-1 relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(e.target.value)}
                >
                  <option value="1">1 Hour</option>
                  <option value="6">6 Hours</option>
                  <option value="12">12 Hours</option>
                  <option value="24">24 Hours (1 Day)</option>
                  <option value="48">48 Hours (2 Days)</option>
                  <option value="168">168 Hours (1 Week)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={notifLoading}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              <BellPlus className="mr-2 h-4 w-4" />
              {notifLoading ? 'Posting...' : 'Post Update'}
            </button>
          </form>
        </motion.section>
      </div>
    </div>
  );
}
