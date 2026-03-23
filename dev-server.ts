import { createApp } from './api/app.js';
import { createServer as createViteServer } from 'vite';

async function startDevServer() {
  const app = await createApp();
  const PORT = process.env.PORT || 3000;

  // Vite middleware for development
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Development server running on http://localhost:${PORT}`);
  });
}

startDevServer();
