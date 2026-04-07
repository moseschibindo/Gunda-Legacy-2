import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: 'vercel-serverless' });
});

// Initialize Supabase Admin Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase Admin credentials missing in environment variables.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Middleware to verify Admin
const verifyAdmin = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) return res.status(401).json({ error: 'Invalid session' });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  next();
};

// Auth: Get email by phone (for login)
app.post('/api/auth/get-email', async (req, res) => {
  const { phone } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('phone', phone)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'No account found with this phone number' });
    }

    res.json({ email: data.email });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Password Reset Verification
app.post('/api/verify-reset', async (req, res) => {
  const { email, phone } = req.body;
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, phone')
      .eq('email', email)
      .eq('phone', phone)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Email and phone number do not match our records.' });
    }

    res.json({ success: true, userId: profile.id });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Direct Password Reset
app.post('/api/reset-password-direct', async (req, res) => {
  const { userId, newPassword } = req.body;
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) throw error;
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update password' });
  }
});

// Admin: Update User
app.post('/api/admin/update-user', verifyAdmin, async (req, res) => {
  const { userId, updates } = req.body;
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete User
app.post('/api/admin/delete-user', verifyAdmin, async (req, res) => {
  const { userId } = req.body;
  try {
    await supabaseAdmin.from('contributions').delete().eq('user_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Notification Reactions: Enforce single reaction per user
app.post('/api/notifications/react', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid session' });

  const { notifId, emoji } = req.body;
  const userId = user.id;

  try {
    // Get current notification data
    const { data: notif, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('reactions')
      .eq('id', notifId)
      .single();

    if (fetchError || !notif) throw new Error('Notification not found');

    const currentReactions: Record<string, string[]> = notif.reactions || {};
    const updatedReactions: Record<string, string[]> = {};

    // 1. Remove user's ID from ALL existing reactions (Enforce single reaction)
    Object.keys(currentReactions).forEach(key => {
      updatedReactions[key] = (currentReactions[key] || []).filter(id => id !== userId);
    });

    // 2. If the user clicked a different emoji (or didn't have one), add it
    // If they clicked the SAME emoji they already had, it stays removed (toggle off)
    const alreadyHadThisEmoji = (currentReactions[emoji] || []).includes(userId);
    
    if (!alreadyHadThisEmoji) {
      if (!updatedReactions[emoji]) updatedReactions[emoji] = [];
      updatedReactions[emoji].push(userId);
    }

    // 3. Clean up empty arrays to save space
    const cleanedReactions: Record<string, string[]> = {};
    Object.keys(updatedReactions).forEach(key => {
      if (updatedReactions[key].length > 0) {
        cleanedReactions[key] = updatedReactions[key];
      }
    });

    const { error: updateError } = await supabaseAdmin
      .from('notifications')
      .update({ reactions: cleanedReactions })
      .eq('id', notifId);

    if (updateError) throw updateError;

    res.json({ success: true, reactions: cleanedReactions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// App Settings Update (Motivation, Logo, etc)
app.post('/api/admin/update-settings', verifyAdmin, async (req, res) => {
  const { key, value } = req.body;
  try {
    const { error } = await supabaseAdmin
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' });
    
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
