import { useState, useEffect } from 'react';
import { supabase, Notification } from '../lib/supabase';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order('date', { ascending: false });

        if (error) throw error;
        setNotifications(data || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();

    const channelName = `notifications_changes_${Math.random().toString(36).substring(7)}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchNotifications)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { notifications, loading };
}
