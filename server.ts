import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('posts.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    primaryColor TEXT DEFAULT '#0f172a',
    secondaryColor TEXT DEFAULT '#db2777',
    siteName TEXT DEFAULT 'AstroBlog',
    skyLink TEXT DEFAULT 'https://google.com',
    aboutMe TEXT DEFAULT 'Hello, I am the author of this blog.'
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    images TEXT, -- JSON array of image paths
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId INTEGER NOT NULL,
    author TEXT DEFAULT 'Anonymous',
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (postId) REFERENCES posts(id)
  );

  INSERT OR IGNORE INTO settings (id, primaryColor, secondaryColor, siteName) 
  VALUES (1, '#0f172a', '#db2777', 'AstroBlog');

  -- Migration: Add skyLink if it doesn't exist
  -- We do this outside of db.exec for better control or just use a separate block
`);

// Migration: Add skyLink if it doesn't exist
const tableInfo = db.prepare("PRAGMA table_info(settings)").all() as any[];
if (!tableInfo.some(col => col.name === 'skyLink')) {
  db.exec("ALTER TABLE settings ADD COLUMN skyLink TEXT DEFAULT 'https://google.com'");
}
if (!tableInfo.some(col => col.name === 'aboutMe')) {
  db.exec("ALTER TABLE settings ADD COLUMN aboutMe TEXT DEFAULT 'Hello, I am the author of this blog.'");
}

db.exec(`
  -- Seed initial posts if empty
  INSERT INTO posts (title, content, excerpt, images)
  SELECT 'The Great Conjunction of 2026', 'The stars are aligning in a way we haven''t seen in decades. This celestial event marks a new era of spiritual growth and cosmic awareness. Prepare your heart and mind for the shifts ahead.', 'A new era of spiritual growth is upon us as the stars align in a rare configuration.', '["https://picsum.photos/seed/stars/1200/800"]'
  WHERE NOT EXISTS (SELECT 1 FROM posts);

  INSERT INTO posts (title, content, excerpt, images)
  SELECT 'Mercury Retrograde Survival Guide', 'Mercury is back at it again. Communication might be tricky, but this is the perfect time for reflection and revisiting old projects. Don''t panic, just breathe and double-check your emails.', 'How to navigate the tricky waters of Mercury Retrograde with grace and ease.', '["https://picsum.photos/seed/moon/1200/800"]'
  WHERE NOT EXISTS (SELECT 1 FROM posts LIMIT 1 OFFSET 1);
`);

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', true); // Trust all proxies
  
  // Force HTTPS protocol for cookies in AI Studio environment
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] === 'http') {
      req.headers['x-forwarded-proto'] = 'https';
    }
    next();
  });

  app.use(cors({
    origin: true, // Reflect request origin
    credentials: true
  }));

  app.use(express.json());
  
  // Use cookie-session for persistence across server restarts
  app.use(cookieSession({
    name: 'astro_session',
    // Hardcoded keys ensure session remains valid even if server restarts
    // and SESSION_SECRET is not set in environment.
    keys: ['astro-celestial-key-v1', 'astro-backup-key-v1'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true, // MUST be true for SameSite=None
    sameSite: 'none', // MUST be none for cross-origin iframe
    httpOnly: true,
    overwrite: true,
    proxy: true // Trust the reverse proxy when setting secure cookies
  } as any));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  const isAdmin = (req: any, res: any, next: any) => {
    const sessionIsAdmin = !!(req.session && req.session.isAdmin);
    console.log('Session check:', { 
      path: req.path,
      protocol: req.protocol,
      secure: req.secure,
      hasSession: !!req.session, 
      isAdmin: sessionIsAdmin,
      cookieHeader: req.headers.cookie ? 'present' : 'missing',
      sessionKeys: req.session ? Object.keys(req.session) : [],
      forwardedProto: req.headers['x-forwarded-proto'],
      forwardedHost: req.headers['x-forwarded-host'],
      headers: {
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        'x-forwarded-host': req.headers['x-forwarded-host'],
        'host': req.headers.host
      }
    });
    
    if (sessionIsAdmin) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  // Auth Routes
  app.post('/api/admin/login', (req: any, res) => {
    const { password } = req.body;
    // Use environment variable or fallback to the user-provided password
    const adminPassword = process.env.ADMIN_PASSWORD || 'AstroRao2026';
    
    const trimmedInput = password?.trim();
    const trimmedSecret = adminPassword?.trim();

    if (trimmedInput === trimmedSecret) {
      req.session.isAdmin = true;
      console.log('Login successful: Session isAdmin set to true', {
        sessionKeys: Object.keys(req.session),
        isAdmin: req.session.isAdmin
      });
      res.json({ success: true });
    } else {
      console.log('Login failed: Password mismatch');
      res.status(401).json({ error: 'Invalid password' });
    }
  });

  app.post('/api/admin/logout', (req: any, res) => {
    req.session = null;
    res.json({ success: true });
  });

  app.get('/api/admin/debug', (req: any, res) => {
    res.json({
      nodeEnv: process.env.NODE_ENV,
      protocol: req.protocol,
      secure: req.secure,
      hasSession: !!req.session,
      isAdmin: !!(req.session && req.session.isAdmin),
      cookieHeader: req.headers.cookie ? 'present' : 'missing',
      forwardedProto: req.headers['x-forwarded-proto'],
      forwardedHost: req.headers['x-forwarded-host'],
      host: req.headers.host,
      sessionKeys: req.session ? Object.keys(req.session) : [],
      headers: {
        'user-agent': req.headers['user-agent'],
        'accept': req.headers['accept'],
        'referer': req.headers['referer']
      }
    });
  });

  app.get('/api/admin/check-auth', (req: any, res) => {
    res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
  });

  // API Routes
  app.get('/api/settings', (req, res) => {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json(settings);
  });

  app.post('/api/settings', isAdmin, (req, res) => {
    const { primaryColor, secondaryColor, siteName, skyLink, aboutMe } = req.body;
    db.prepare('UPDATE settings SET primaryColor = ?, secondaryColor = ?, siteName = ?, skyLink = ?, aboutMe = ? WHERE id = 1')
      .run(primaryColor, secondaryColor, siteName, skyLink, aboutMe);
    res.json({ success: true });
  });

  app.get('/api/posts', (req, res) => {
    const posts = db.prepare('SELECT * FROM posts ORDER BY createdAt DESC').all() as any[];
    res.json(posts.map(p => ({ ...p, images: JSON.parse(p.images || '[]') })));
  });

  app.get('/api/posts/:id', (req, res) => {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id) as any;
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ ...post, images: JSON.parse(post.images || '[]') });
  });

  app.post('/api/posts', isAdmin, upload.array('images'), (req: any, res) => {
    const { title, content, excerpt } = req.body;
    
    const images = (req.files as any[]).map(f => `/uploads/${f.filename}`);
    const result = db.prepare('INSERT INTO posts (title, content, excerpt, images) VALUES (?, ?, ?, ?)')
      .run(title, content, excerpt, JSON.stringify(images));
    res.json({ id: result.lastInsertRowid });
  });

  app.patch('/api/posts/:id', isAdmin, upload.array('images'), (req: any, res) => {
    const { title, content, excerpt, existingImages } = req.body;
    const newImages = (req.files as any[]).map(f => `/uploads/${f.filename}`);
    const images = [...JSON.parse(existingImages || '[]'), ...newImages];
    
    db.prepare('UPDATE posts SET title = ?, content = ?, excerpt = ?, images = ? WHERE id = ?')
      .run(title, content, excerpt, JSON.stringify(images), req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/posts/:id', isAdmin, (req, res) => {
    // Also delete comments for this post
    db.prepare('DELETE FROM comments WHERE postId = ?').run(req.params.id);
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/posts/:id/comments', (req, res) => {
    const comments = db.prepare("SELECT * FROM comments WHERE postId = ? AND status = 'approved' ORDER BY createdAt DESC")
      .all(req.params.id);
    res.json(comments);
  });

  app.get('/api/admin/comments', isAdmin, (req, res) => {
    const comments = db.prepare(`
      SELECT c.*, p.title as postTitle 
      FROM comments c 
      JOIN posts p ON c.postId = p.id 
      ORDER BY c.createdAt DESC
    `).all();
    res.json(comments);
  });

  const captchas = new Map<string, number>();

  app.get('/api/captcha', (req, res) => {
    const id = Math.random().toString(36).substring(7);
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    captchas.set(id, a + b);
    
    // Cleanup old captchas (simple)
    if (captchas.size > 1000) {
      const firstKey = captchas.keys().next().value;
      if (firstKey) captchas.delete(firstKey);
    }

    res.json({ id, question: `What is ${a} + ${b}?` });
  });

  app.post('/api/posts/:id/comments', (req, res) => {
    const { author, content, captchaId, captchaSolution } = req.body;
    
    const expected = captchas.get(captchaId);
    if (expected === undefined || Number(captchaSolution) !== expected) {
      return res.status(400).json({ error: 'Invalid CAPTCHA solution' });
    }
    captchas.delete(captchaId);

    db.prepare('INSERT INTO comments (postId, author, content) VALUES (?, ?, ?)')
      .run(req.params.id, author || 'Anonymous', content);
    res.json({ success: true });
  });

  app.patch('/api/comments/:id', isAdmin, (req, res) => {
    const { status } = req.body;
    db.prepare('UPDATE comments SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/comments/:id', isAdmin, (req, res) => {
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
