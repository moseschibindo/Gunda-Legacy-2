import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const msg = 'Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.';
  console.error(msg);
}

// Lazy reference to allow refreshing session from within the custom fetch
let supabaseInstance: any = null;

const originalFetch = window.fetch.bind(window);

const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let response = await originalFetch(input, init);

  // Check if response indicates an expired JWT (401 with code PGRST303 or message text)
  if (response.status === 401) {
    const clone = response.clone();
    try {
      const data = await clone.json();
      const isJwtExpired = data && (
        data.code === 'PGRST303' || 
        (data.message && data.message.toLowerCase().includes('jwt expired'))
      );

      if (isJwtExpired && supabaseInstance) {
        const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as any).url || '');
        
        // Ensure we do not intercept the actual token refresh call itself to prevent infinite recurrences
        if (!urlStr.includes('/auth/v1/')) {
          console.warn('Supabase custom fetch: detected expired JWT (PGRST303). Attempting silent token renewal...');
          
          const { data: refreshData, error: refreshError } = await supabaseInstance.auth.refreshSession();
          
          if (refreshError) {
            console.error('Supabase custom fetch: failed to renew session:', refreshError.message);
          } else if (refreshData && refreshData.session) {
            console.log('Supabase custom fetch: session renewed successfully! Retrying request...');
            const accessToken = refreshData.session.access_token;
            
            let modifiedInput = input;
            let modifiedInit = { ...init };

            // Update Authorization header with the fresh JWT token
            if (input instanceof Request) {
              const newHeaders = new Headers(input.headers);
              newHeaders.set('Authorization', `Bearer ${accessToken}`);
              modifiedInput = new Request(input, { headers: newHeaders });
            } else {
              const newHeaders = new Headers(init?.headers);
              newHeaders.set('Authorization', `Bearer ${accessToken}`);
              modifiedInit.headers = newHeaders;
            }

            // Retry the original query
            response = await originalFetch(modifiedInput, modifiedInit);
          }
        }
      }
    } catch (_) {
      // Body not JSON or error reading clone, ignore and return original response
    }
  }

  return response;
};

// Simple in-process lock to prevent "navigator.locks helper" issues and DOMExceptions when running inside sandboxed or iframe environments
const locks = new Map<string, Promise<any>>();

const inMemoryLock = async <R>(name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  const existingLock = locks.get(name);
  if (existingLock) {
    try {
      await existingLock;
    } catch (_) {}
  }
  
  const promise = fn();
  locks.set(name, promise);
  try {
    return await promise;
  } finally {
    if (locks.get(name) === promise) {
      locks.delete(name);
    }
  }
};

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  global: {
    fetch: customFetch
  },
  auth: {
    lock: inMemoryLock,
    persistSession: true,
    autoRefreshToken: true
  }
});

supabaseInstance = supabase;
