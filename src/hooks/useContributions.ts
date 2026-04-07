import { useState, useEffect } from 'react';
import { supabase, Contribution } from '../lib/supabase';

export function useContributions(userId?: string) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        let query = supabase
          .from('contributions')
          .select('*, profiles(name)');

        const { data, error } = await query.order('date', { ascending: false });

        if (error) throw error;

        if (data) {
          setContributions(data);
          const total = data.reduce((sum, c) => sum + Number(c.amount), 0);
          setTotalSavings(total);

          if (userId) {
            const userSum = data
              .filter(c => c.user_id === userId)
              .reduce((sum, c) => sum + Number(c.amount), 0);
            setUserTotal(userSum);
          }
        }
      } catch (error) {
        console.error('Error fetching contributions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Subscribe to real-time changes
    const channelName = `contributions_changes_${Math.random().toString(36).substring(7)}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions' }, fetchData)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return { contributions, totalSavings, userTotal, loading };
}
