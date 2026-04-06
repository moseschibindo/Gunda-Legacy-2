import { supabase } from './supabase';

export const api = {
  async get(endpoint: string, _token?: string) {
    if (endpoint === "/stats") {
      const { data: contributions } = await supabase.from('contributions').select('amount');
      const { count: memberCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { data: recentContributions } = await supabase
        .from('contributions')
        .select('*, profiles(name)')
        .order('date', { ascending: false })
        .limit(5);

      const totalAmount = contributions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      
      return {
        totalAmount,
        totalShares: totalAmount / 25,
        memberCount: memberCount || 0,
        recentContributions: recentContributions?.map(c => ({
          ...c,
          user_name: (c.profiles as any)?.name || 'Unknown'
        })) || []
      };
    }

    if (endpoint === "/settings") {
      const { data } = await supabase.from('settings').select('*');
      return data?.reduce((acc: any, s: any) => {
        acc[s.key] = s.value;
        return acc;
      }, {}) || {};
    }

    if (endpoint === "/notifications") {
      const { data } = await supabase.from('notifications').select('*').order('date', { ascending: false });
      return data || [];
    }

    if (endpoint === "/users") {
      const { data } = await supabase
        .from('profiles')
        .select('*, contributions(amount)');
      
      return data?.map(u => ({
        ...u,
        total_contribution: (u.contributions as any[])?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0
      })) || [];
    }

    if (endpoint === "/contributions") {
      const { data } = await supabase
        .from('contributions')
        .select('*, profiles(name)')
        .order('date', { ascending: false });
      
      return data?.map(c => ({
        ...c,
        user_name: (c.profiles as any)?.name || 'Unknown'
      })) || [];
    }

    throw new Error(`Endpoint ${endpoint} not implemented in Supabase wrapper`);
  },

  async post(endpoint: string, body: any, _token?: string) {
    if (endpoint === "/login") {
      // Note: This is a simplified login for the wrapper. 
      // In reality, we should use Supabase Auth directly in App.tsx.
      // But for the wrapper to work, we'll assume the caller handles the logic.
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email || `${body.phone}@gundalegacy.com`,
        password: body.password,
      });
      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, contributions(amount)')
        .eq('id', data.user.id)
        .single();

      const total_contribution = (profile?.contributions as any[])?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      return {
        token: data.session?.access_token,
        user: { ...profile, total_contribution }
      };
    }

    if (endpoint === "/signup") {
      const { data, error } = await supabase.auth.signUp({
        email: body.email || `${body.phone}@gundalegacy.com`,
        password: body.password,
      });
      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .insert({
          id: data.user?.id,
          phone: body.phone,
          email: body.email,
          name: body.name,
          role: 'member'
        })
        .select()
        .single();

      return {
        token: data.session?.access_token,
        user: { ...profile, total_contribution: 0 }
      };
    }

    if (endpoint === "/notifications") {
      const { data, error } = await supabase.from('notifications').insert(body).select().single();
      if (error) throw error;
      return data;
    }

    if (endpoint === "/contributions") {
      const { data, error } = await supabase.from('contributions').insert(body).select().single();
      if (error) throw error;
      return data;
    }

    if (endpoint === "/forgot-password") {
      const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { message: "Password reset link sent to your email." };
    }

    if (endpoint === "/reset-password") {
      const { error } = await supabase.auth.updateUser({ password: body.password });
      if (error) throw error;
      return { message: "Password reset successful." };
    }

    throw new Error(`Endpoint ${endpoint} not implemented in Supabase wrapper`);
  },

  async patch(endpoint: string, body: any, _token?: string) {
    if (endpoint === "/profile") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('profiles')
        .update(body)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) throw error;

      const { data: contributions } = await supabase.from('contributions').select('amount').eq('user_id', user.id);
      const total_contribution = contributions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      return { ...data, total_contribution };
    }

    if (endpoint.startsWith("/users/") && endpoint.endsWith("/role")) {
      const id = endpoint.split("/")[2];
      const { error } = await supabase.from('profiles').update({ role: body.role }).eq('id', id);
      if (error) throw error;
      return { success: true };
    }

    if (endpoint.startsWith("/users/") && endpoint.endsWith("/suspend")) {
      const id = endpoint.split("/")[2];
      const { error } = await supabase.from('profiles').update({ is_suspended: body.is_suspended }).eq('id', id);
      if (error) throw error;
      return { success: true };
    }

    if (endpoint === "/settings") {
      for (const [key, value] of Object.entries(body)) {
        await supabase.from('settings').upsert({ key, value });
      }
      return { success: true };
    }

    throw new Error(`Endpoint ${endpoint} not implemented in Supabase wrapper`);
  },

  async delete(endpoint: string, _token?: string) {
    if (endpoint.startsWith("/users/")) {
      const id = endpoint.split("/")[2];
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    }

    if (endpoint.startsWith("/notifications/")) {
      const id = endpoint.split("/")[2];
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    }

    if (endpoint.startsWith("/contributions/")) {
      const id = endpoint.split("/")[2];
      const { error } = await supabase.from('contributions').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    }

    throw new Error(`Endpoint ${endpoint} not implemented in Supabase wrapper`);
  }
};
