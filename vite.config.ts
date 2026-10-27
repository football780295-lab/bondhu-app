import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Local dev middleware for /api/sync
const syncApiDevPlugin = () => ({
  name: 'sync-api-dev-plugin',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url && req.url.startsWith('/api/sync')) {
        const CLOUD_BIN_URL = 'https://extendsclass.com/api/json-storage/bin/ceaeeff';
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (req.method === 'GET') {
          try {
            const r = await fetch(CLOUD_BIN_URL + '?t=' + Date.now());
            const data = await r.json();
            res.statusCode = 200;
            res.end(JSON.stringify(data));
          } catch (e: any) {
            res.statusCode = 200;
            res.end(JSON.stringify({ profiles: [], greetings: {} }));
          }
          return;
        }

        if (req.method === 'POST' || req.method === 'PUT') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              await fetch(CLOUD_BIN_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'text/plain' },
                body: body
              });
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: 'Saved to cloud successfully!' }));
            } catch (e: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, message: e.message }));
            }
          });
          return;
        }
      }
      next();
    });
  }
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), syncApiDevPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
