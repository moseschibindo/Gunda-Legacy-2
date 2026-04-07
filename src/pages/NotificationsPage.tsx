import React from 'react';
import { motion } from 'motion/react';
import { Bell, Calendar, Clock } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export function NotificationsPage() {
  const { notifications, loading } = useNotifications();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
          <Bell className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500">Stay updated with the latest family news</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notif, index) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold text-gray-900">{notif.title}</h2>
                <div className="flex items-center text-xs font-medium text-gray-400">
                  <Calendar className="mr-1 h-3 w-3" />
                  {new Date(notif.date).toLocaleDateString()}
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{notif.message}</p>
              {notif.expires_at && (
                <div className="flex items-center text-xs font-medium text-red-400 pt-2 border-t border-gray-50">
                  <Clock className="mr-1 h-3 w-3" />
                  Expires on: {new Date(notif.expires_at).toLocaleString()}
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <Bell className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">No active announcements at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
