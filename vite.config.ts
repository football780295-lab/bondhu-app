import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Local dev middleware for /api/sync
const syncApiDevPlugin = () => ({
  name: 'sync-api-dev-plugin',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url && req.url.startsWith('/api/sync')) {
        const BIN_URL_1 = 'https://extendsclass.com/api/json-storage/bin/ceaeeff';
        const BIN_URL_2 = 'https://extendsclass.com/api/json-storage/bin/bdbdace';
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (req.method === 'GET') {
          try {
            const [r1, r2] = await Promise.all([
              fetch(BIN_URL_1 + '?t=' + Date.now()),
              fetch(BIN_URL_2 + '?t=' + Date.now())
            ]);
            let p1: any[] = [];
            let p2: any[] = [];
            let greetings: any = {};
            if (r1.ok) {
              const d1 = await r1.json();
              if (Array.isArray(d1.profiles)) p1 = d1.profiles;
              if (d1.greetings) greetings = { ...greetings, ...d1.greetings };
            }
            if (r2.ok) {
              const d2 = await r2.json();
              if (Array.isArray(d2.profiles)) p2 = d2.profiles;
              if (d2.greetings) greetings = { ...greetings, ...d2.greetings };
            }
            const combined: any[] = [...p1];
            p2.forEach(item => {
              const idx = combined.findIndex(x => x.id === item.id);
              if (idx !== -1) combined[idx] = { ...combined[idx], ...item };
              else combined.push(item);
            });
            res.statusCode = 200;
            res.end(JSON.stringify({ version: 2, profiles: combined, greetings }));
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
              let parsed: any = {};
              try { parsed = JSON.parse(body); } catch (_) {}
              const all = Array.isArray(parsed.profiles) ? parsed.profiles : [];
              const gr = parsed.greetings || {};
              const half = Math.ceil(all.length / 2);
              const c1 = all.slice(0, half);
              const c2 = all.slice(half);
              const now = new Date().toISOString();
              const [r1, r2] = await Promise.all([
                fetch(BIN_URL_1, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'text/plain' },
                  body: JSON.stringify({ version: 2, updatedAt: now, profiles: c1, greetings: gr })
                }),
                fetch(BIN_URL_2, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'text/plain' },
                  body: JSON.stringify({ version: 2, updatedAt: now, profiles: c2, greetings: gr })
                })
              ]);
              if (!r1.ok || !r2.ok) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, message: `Cloud bin status: ${r1.status} / ${r2.status}` }));
                return;
              }
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: 'Saved successfully!' }));
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
