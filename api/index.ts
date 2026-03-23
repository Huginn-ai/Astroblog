import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';
import multer from 'multer';
import cors from 'cors';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import { put } from '@vercel/blob';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Turso Client
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      primaryColor TEXT DEFAULT '#0f172a',
      secondaryColor TEXT DEFAULT '#db2777',
      siteName TEXT DEFAULT 'AstroBlog',
      skyLink TEXT DEFAULT 'https://google.com',
      aboutMe TEXT DEFAULT 'Hello, I am the author of this blog.'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      images TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId INTEGER NOT NULL,
      author TEXT DEFAULT 'Anonymous',
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (postId) REFERENCES posts(id)
    );
  `);

  // Check if settings exist
  const settingsCheck = await db.execute('SELECT id FROM settings WHERE id = 1');
  if (settingsCheck.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO settings (id, primaryColor, secondaryColor, siteName) VALUES (1, ?, ?, ?)',
      args: ['#0f172a', '#db2777', 'AstroBlog']
    });
  }

  // Seed initial posts if empty
  const postsCheck = await db.execute('SELECT id FROM posts LIMIT 1');
  if (postsCheck.rows.length === 0) {
    await db.execute({
      sql: "INSERT INTO posts (title, content, excerpt, images) VALUES (?, ?, ?, ?)",
      args: [
        'The Great Conjunction of 2026',
        'The stars are aligning in a way we haven\'t seen in decades. This celestial event marks a new era of spiritual growth and cosmic awareness. Prepare your heart and mind for the shifts ahead.',
        'A new era of spiritual growth is upon us as the stars align in a rare configuration.',
        '["https://picsum.photos/seed/stars/1200/800"]'
      ]
    });
  }
}

// Multer in-memory storage for Vercel Blob
const storage = multer.memoryStorage();
const upload = multer({ storage });

async function startServer() {
  await initDb();
  
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.set('trust proxy', true);
  
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] === 'http') {
      req.headers['x-forwarded-proto'] = 'https';
    }
    next();
  });

  app.use(cors({
    origin: true,
    credentials: true
  }));

  app.use(express.json());
  
  app.use(cookieSession({
    name: 'astro_session',
    keys: [process.env.SESSION_SECRET || 'astro-celestial-key-v1'],
    maxAge: 24 * 60 * 60 * 1000,
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    overwrite: true,
    proxy: true
  } as any));

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.session && req.session.isAdmin) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  // Auth Routes
  app.post('/api/admin/login', (req: any, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'AstroRao2026';
    if (password?.trim() === adminPassword?.trim()) {
      req.session.isAdmin = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  });

  app.post('/api/admin/logout', (req: any, res) => {
    req.session = null;
    res.json({ success: true });
  });

  app.get('/api/admin/check-auth', (req: any, res) => {
    res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
  });

  // API Routes
  app.get('/api/settings', async (req, res) => {
    const result = await db.execute('SELECT * FROM settings WHERE id = 1');
    res.json(result.rows[0]);
  });

  app.post('/api/settings', isAdmin, async (req, res) => {
    const { primaryColor, secondaryColor, siteName, skyLink, aboutMe } = req.body;
    await db.execute({
      sql: 'UPDATE settings SET primaryColor = ?, secondaryColor = ?, siteName = ?, skyLink = ?, aboutMe = ? WHERE id = 1',
      args: [primaryColor, secondaryColor, siteName, skyLink, aboutMe]
    });
    res.json({ success: true });
  });

  app.get('/api/posts', async (req, res) => {
    const result = await db.execute('SELECT * FROM posts ORDER BY createdAt DESC');
    res.json(result.rows.map((p: any) => ({ ...p, images: JSON.parse(p.images || '[]') })));
  });

  app.get('/api/posts/:id', async (req, res) => {
    const result = await db.execute({
      sql: 'SELECT * FROM posts WHERE id = ?',
      args: [req.params.id]
    });
    const post = result.rows[0] as any;
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ ...post, images: JSON.parse(post.images || '[]') });
  });

  app.post('/api/posts', isAdmin, upload.array('images'), async (req: any, res) => {
    const { title, content, excerpt } = req.body;
    const files = req.files as any[];
    
    const imageUrls = [];
    for (const file of files) {
      const blob = await put(`posts/${Date.now()}-${file.originalname}`, file.buffer, {
        access: 'public',
      });
      imageUrls.push(blob.url);
    }

    const result = await db.execute({
      sql: 'INSERT INTO posts (title, content, excerpt, images) VALUES (?, ?, ?, ?)',
      args: [title, content, excerpt, JSON.stringify(imageUrls)]
    });
    res.json({ id: Number(result.lastInsertRowid) });
  });

  app.patch('/api/posts/:id', isAdmin, upload.array('images'), async (req: any, res) => {
    const { title, content, excerpt, existingImages } = req.body;
    const files = req.files as any[];
    
    const newImageUrls = [];
    for (const file of files) {
      const blob = await put(`posts/${Date.now()}-${file.originalname}`, file.buffer, {
        access: 'public',
      });
      newImageUrls.push(blob.url);
    }

    const images = [...JSON.parse(existingImages || '[]'), ...newImageUrls];
    
    await db.execute({
      sql: 'UPDATE posts SET title = ?, content = ?, excerpt = ?, images = ? WHERE id = ?',
      args: [title, content, excerpt, JSON.stringify(images), req.params.id]
    });
    res.json({ success: true });
  });

  app.delete('/api/posts/:id', isAdmin, async (req, res) => {
    await db.execute({ sql: 'DELETE FROM comments WHERE postId = ?', args: [req.params.id] });
    await db.execute({ sql: 'DELETE FROM posts WHERE id = ?', args: [req.params.id] });
    res.json({ success: true });
  });

  app.get('/api/posts/:id/comments', async (req, res) => {
    const result = await db.execute({
      sql: "SELECT * FROM comments WHERE postId = ? AND status = 'approved' ORDER BY createdAt DESC",
      args: [req.params.id]
    });
    res.json(result.rows);
  });

  app.get('/api/admin/comments', isAdmin, async (req, res) => {
    const result = await db.execute(`
      SELECT c.*, p.title as postTitle 
      FROM comments c 
      JOIN posts p ON c.postId = p.id 
      ORDER BY c.createdAt DESC
    `);
    res.json(result.rows);
  });

  const captchas = new Map<string, number>();

  app.get('/api/captcha', (req, res) => {
    const id = Math.random().toString(36).substring(7);
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    captchas.set(id, a + b);
    res.json({ id, question: `What is ${a} + ${b}?` });
  });

  app.post('/api/posts/:id/comments', async (req, res) => {
    const { author, content, captchaId, captchaSolution } = req.body;
    const expected = captchas.get(captchaId);
    if (expected === undefined || Number(captchaSolution) !== expected) {
      return res.status(400).json({ error: 'Invalid CAPTCHA solution' });
    }
    captchas.delete(captchaId);

    await db.execute({
      sql: 'INSERT INTO comments (postId, author, content) VALUES (?, ?, ?)',
      args: [req.params.id, author || 'Anonymous', content]
    });
    res.json({ success: true });
  });

  app.patch('/api/comments/:id', isAdmin, async (req, res) => {
    const { status } = req.body;
    await db.execute({
      sql: 'UPDATE comments SET status = ? WHERE id = ?',
      args: [status, req.params.id]
    });
    res.json({ success: true });
  });

  app.delete('/api/comments/:id', isAdmin, async (req, res) => {
    await db.execute({
      sql: 'DELETE FROM comments WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true });
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

  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

export default startServer();
