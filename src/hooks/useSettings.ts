import { useState, useEffect } from 'react';
import { supabase, AppSettings } from '../lib/supabase';

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({
    app_name: 'Gunda Legacy',
    app_slogan: 'Strength in Unity',
    app_logo: 'https://picsum.photos/seed/gunda/200/200',
    hero_image: 'https://picsum.photos/seed/unity/1200/600',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*');

        if (error) throw error;

        if (data) {
          const settingsMap = data.reduce((acc, curr: AppSettings) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {} as Record<string, string>);
          
          setSettings(prev => ({ ...prev, ...settingsMap }));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  return { settings, loading };
}
