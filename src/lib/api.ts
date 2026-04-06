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
      const email = body.email || `${body.phone}@gundalegacy.com`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: body.password,
      });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Invalid phone number or password. Please check your details or sign up if you don't have an account.");
        }
        throw error;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, contributions(amount)')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profile) {
        throw new Error("Your profile could not be found. Please contact support.");
      }

      const total_contribution = (profile?.contributions as any[])?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      return {
        token: data.session?.access_token,
        user: { ...profile, total_contribution }
      };
    }

    if (endpoint === "/signup") {
      const email = body.email || `${body.phone}@gundalegacy.com`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password: body.password,
        options: {
          data: {
            name: body.name,
            phone: body.phone
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          throw new Error("This phone number is already registered. Please sign in instead.");
        }
        throw error;
      }

      let profile = null;
      if (data.user) {
        // Retry a few times to wait for the trigger
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const { data: p } = await supabase
            .from('profiles')
            .select('*, contributions(amount)')
            .eq('id', data.user.id)
            .maybeSingle();
          
          if (p) {
            profile = p;
            break;
          }
        }

        // Final fallback: Manually create the profile if it's still missing
        if (!profile) {
          console.log("Profile still missing after signup retries, attempting manual creation...");
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              name: body.name || "New Member",
              phone: body.phone || "",
              email: body.email || "",
              role: 'member'
            })
            .select()
            .maybeSingle();
          
          if (!createError && newProfile) {
            profile = newProfile;
          }
        }
      }

      const total_contribution = (profile?.contributions as any[])?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      return {
        token: data.session?.access_token || null,
        user: profile ? { ...profile, total_contribution } : null,
        message: data.session ? null : "Signup successful! Please check your email to confirm your account before logging in."
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
