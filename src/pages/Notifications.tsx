import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, Clock, Trash2, Plus, X, Calendar, Heart, ThumbsUp, PartyPopper, Flame, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import ConfirmModal from '../components/ConfirmModal';
import { cn } from '../lib/utils';

const Notifications: React.FC = () => {
  const { isAdmin, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNotif, setNewNotif] = useState({ title: '', message: '', expires_at: '' });
  const [reacting, setReacting] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchNotifications = async () => {
    const now = new Date().toISOString();
    let query = supabase
      .from('notifications')
      .select('*')
      .order('date', { ascending: false });

    if (!isAdmin) {
      query = query.or(`expires_at.gt.${now},expires_at.is.null`);
    }

    const { data, error } = await query;
    if (!error && data) setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('notifications').insert([{
      ...newNotif,
      date: new Date().toISOString(),
      expires_at: newNotif.expires_at || null
    }]);

    if (!error) {
      setShowAddModal(false);
      setNewNotif({ title: '', message: '', expires_at: '' });
      fetchNotifications();
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Notification',
      message: 'Are you sure you want to delete this notification? This action cannot be undone.',
      onConfirm: async () => {
        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (!error) fetchNotifications();
      }
    });
  };

  const handleReaction = async (notifId: string, emoji: string) => {
    if (!profile?.id || reacting) return;
    setReacting(notifId);

    try {
      const response = await fetch('/api/notifications/react', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ notifId, emoji })
      });

      if (response.ok) {
        fetchNotifications();
      } else {
        const data = await response.json();
        console.error('Reaction failed:', data.error);
      }
    } catch (err) {
      console.error('Reaction error:', err);
    } finally {
      setReacting(null);
    }
  };

  const reactionIcons = [
    { emoji: '👍', icon: ThumbsUp, label: 'Like' },
    { emoji: '❤️', icon: Heart, label: 'Love' },
    { emoji: '🎉', icon: PartyPopper, label: 'Celebrate' },
    { emoji: '🔥', icon: Flame, label: 'Fire' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 text-white p-2 rounded-xl shadow-lg shadow-emerald-200"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 mt-1 ring-4 ring-emerald-50/50">
                      <Bell size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-gray-900 text-lg">{n.title}</h3>
                        {isAdmin && n.expires_at && (
                          <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Admin: Expires {format(new Date(n.expires_at), 'MMM d')}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mt-2 leading-relaxed">{n.message}</p>
                      
                      <div className="flex items-center space-x-4 mt-4">
                        <div className="flex items-center text-[11px] text-gray-400 font-medium">
                          <Clock size={14} className="mr-1.5" />
                          {formatDistanceToNow(new Date(n.date), { addSuffix: true })}
                        </div>
                      </div>

                      {/* Reactions Section */}
                      <div className="flex flex-wrap items-center gap-2 mt-6">
                        {reactionIcons.map(({ emoji, icon: Icon }) => {
                          const users = n.reactions?.[emoji] || [];
                          const hasReacted = users.includes(profile?.id || '');
                          
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(n.id, emoji)}
                              disabled={reacting === n.id}
                              className={cn(
                                "flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all duration-300 border",
                                hasReacted 
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-600 scale-105" 
                                  : "bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100"
                              )}
                            >
                              <span className="text-sm">{emoji}</span>
                              {users.length > 0 && (
                                <span className="text-xs font-bold">{users.length}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Decorative accent */}
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <Bell size={32} />
            </div>
            <p className="text-gray-400 italic">No active notifications</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">New Notification</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={newNotif.title}
                  onChange={(e) => setNewNotif({ ...newNotif, title: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Contribution Reminder"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Message</label>
                <textarea
                  required
                  value={newNotif.message}
                  onChange={(e) => setNewNotif({ ...newNotif, message: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                  placeholder="Don't forget to send your KSh 50 today!"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Expiry Date (Optional)</label>
                <div className="relative">
                  <input
                    type="date"
                    value={newNotif.expires_at}
                    onChange={(e) => setNewNotif({ ...newNotif, expires_at: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <Calendar className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={20} />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 mt-4"
              >
                Post Notification
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
};

export default Notifications;
