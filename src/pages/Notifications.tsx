import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, Clock, Trash2, Plus, X, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';
import { format } from 'date-fns';
import ConfirmModal from '../components/ConfirmModal';

const Notifications: React.FC = () => {
  const { isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNotif, setNewNotif] = useState({ title: '', message: '', expires_at: '' });
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
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 mt-1">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{n.title}</h3>
                    <p className="text-gray-600 text-sm mt-1 leading-relaxed">{n.message}</p>
                    <div className="flex items-center space-x-3 mt-3 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                      <div className="flex items-center">
                        <Clock size={12} className="mr-1" />
                        {format(new Date(n.date), 'MMM d, h:mm a')}
                      </div>
                      {n.expires_at && (
                        <div className="text-orange-500 flex items-center">
                          <X size={12} className="mr-1" />
                          Expires {format(new Date(n.expires_at), 'MMM d')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
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
