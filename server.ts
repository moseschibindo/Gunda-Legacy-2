import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', environment: process.env.NODE_ENV });
  });

  // Initialize Supabase Admin Client
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Ensure Storage Bucket exists
  const ensureBucket = async () => {
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'profiles');
      
      if (!bucketExists) {
        await supabaseAdmin.storage.createBucket('profiles', {
          public: true,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          fileSizeLimit: 2 * 1024 * 1024 // 2MB
        });
        console.log('Created "profiles" storage bucket');
      }
    } catch (err) {
      console.error('Error ensuring bucket:', err);
    }
  };
  ensureBucket();

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

    req.adminUser = user;
    next();
  };

  // Admin: Update User Profile (Role/Suspension)
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

  // Admin: Delete User (Profile + Auth Account)
  app.post('/api/admin/delete-user', verifyAdmin, async (req, res) => {
    const { userId } = req.body;
    try {
      // Delete contributions first
      await supabaseAdmin.from('contributions').delete().eq('user_id', userId);
      
      // Delete profile
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      
      // Delete Auth account
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

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

  // Password Reset Verification Endpoint
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

  // Direct Password Reset Endpoint
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
