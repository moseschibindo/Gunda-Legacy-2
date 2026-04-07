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
  };
  ensureBucket();

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
