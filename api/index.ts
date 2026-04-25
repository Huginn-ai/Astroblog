import { createApp } from './app.js';
import express from 'express';
import path from 'path';

async function startServer() {
  const app = await createApp();
  const PORT = process.env.PORT || 3000;

  // In production on Vercel, static files are served by Vercel's edge,
  // but we keep this for local production testing or other environments.
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // Only serve index.html if it's not an API route
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
