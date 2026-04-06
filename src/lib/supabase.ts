import { createClient } from '@supabase/supabase-js';

// Access environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase URL or Anon Key is missing.\n' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.\n' +
    'In AI Studio: Go to Settings -> Secrets.\n' +
    'In Vercel: Go to Project Settings -> Environment Variables.'
  );
}

// We use a proxy or a dummy client if keys are missing to prevent the app from crashing on load
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: () => {
        throw new Error("Supabase is not configured. Please add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to environment variables.");
      }
    });
