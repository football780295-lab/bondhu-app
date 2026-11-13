// Vercel Serverless Function: Global Real-Time Analytics (Visits, Signups, Installs, Ads)
// Persists all visitor analytics in Vercel Blob so Admin Panel sees live counts from EVERY user & device.

import { put, list } from '@vercel/blob';

const BLOB_PATHNAME = 'bondhu-analytics.json';
const BLOB_PUBLIC_URL = 'https://3hgb5rcqc0evcddn.public.blob.vercel-storage.com/bondhu-analytics.json';

export interface AnalyticsStore {
  totalVisits: number;
  uniqueVisitorIds: string[];
  dailyVisits: Record<string, number>;
  signups: any[];
  installs: any[];
  adsWatched: number;
  updatedAt: number;
}

const EMPTY_STORE: AnalyticsStore = {
  totalVisits: 0,
  uniqueVisitorIds: [],
  dailyVisits: {},
  signups: [],
  installs: [],
  adsWatched: 0,
  updatedAt: 0,
};

let memoryCache: AnalyticsStore | null = null;

function getDhakaDateKey(): string {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function setHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function normalizeStore(raw: any): AnalyticsStore {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_STORE };
  return {
    totalVisits: typeof raw.totalVisits === 'number' ? raw.totalVisits : 0,
    uniqueVisitorIds: Array.isArray(raw.uniqueVisitorIds) ? raw.uniqueVisitorIds : [],
    dailyVisits: raw.dailyVisits && typeof raw.dailyVisits === 'object' ? raw.dailyVisits : {},
    signups: Array.isArray(raw.signups) ? raw.signups : [],
    installs: Array.isArray(raw.installs) ? raw.installs : [],
    adsWatched: typeof raw.adsWatched === 'number' ? raw.adsWatched : 0,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
  };
}

async function readFromBlob(): Promise<AnalyticsStore | null> {
  try {
    const res = await fetch(`${BLOB_PUBLIC_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return normalizeStore(data);
    }
  } catch {
    // Fall through to list()
  }

  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
    if (blobs.length > 0) {
      const res = await fetch(`${blobs[0].url}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        return normalizeStore(data);
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

async function getLatestStore(): Promise<AnalyticsStore> {
  const blobData = await readFromBlob();
  if (blobData && (!memoryCache || blobData.updatedAt >= memoryCache.updatedAt)) {
    memoryCache = blobData;
  }
  return memoryCache ? normalizeStore(memoryCache) : { ...EMPTY_STORE };
}

function formatResponse(store: AnalyticsStore) {
  const todayKey = getDhakaDateKey();
  return {
    totalVisits: store.totalVisits,
    todayVisits: store.dailyVisits[todayKey] || 0,
    uniqueVisitors: store.uniqueVisitorIds.length,
    dailyVisits: store.dailyVisits,
    signups: store.signups,
    installs: store.installs,
    adsWatched: store.adsWatched,
    updatedAt: store.updatedAt,
    todayKey,
  };
}

export default async function handler(req: any, res: any) {
  setHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const store = await getLatestStore();
    return res.status(200).json({ success: true, ...formatResponse(store) });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || !body.type) {
        return res.status(400).json({ success: false, error: 'Missing analytics event type' });
      }

      const store = await getLatestStore();
      const todayKey = getDhakaDateKey();

      switch (body.type) {
        case 'visit': {
          store.totalVisits += 1;
          store.dailyVisits[todayKey] = (store.dailyVisits[todayKey] || 0) + 1;
          if (typeof body.visitorId === 'string' && body.visitorId.trim()) {
            const vid = body.visitorId.trim();
            if (!store.uniqueVisitorIds.includes(vid)) {
              store.uniqueVisitorIds.push(vid);
              if (store.uniqueVisitorIds.length > 20000) {
                store.uniqueVisitorIds = store.uniqueVisitorIds.slice(-20000);
              }
            }
          }
          break;
        }

        case 'signup': {
          const rec = body.record;
          if (rec && rec.email) {
            const emailLower = String(rec.email).trim().toLowerCase();
            const existingIdx = store.signups.findIndex(
              (s: any) => String(s.email || '').trim().toLowerCase() === emailLower
            );
            if (existingIdx !== -1) {
              store.signups[existingIdx] = {
                ...store.signups[existingIdx],
                ...rec,
                lastActive: new Date().toISOString(),
              };
            } else {
              store.signups.unshift(rec);
            }
          }
          break;
        }

        case 'install': {
          const rec = body.record;
          if (rec && rec.id) {
            if (!store.installs.some((i: any) => i.id === rec.id)) {
              store.installs.unshift(rec);
            }
          }
          break;
        }

        case 'ad': {
          store.adsWatched += 1;
          break;
        }

        case 'update_signup': {
          if (body.id && body.updates) {
            const idx = store.signups.findIndex((s: any) => s.id === body.id);
            if (idx !== -1) {
              store.signups[idx] = { ...store.signups[idx], ...body.updates };
            }
          }
          break;
        }

        case 'delete_signup': {
          if (body.id) {
            store.signups = store.signups.filter((s: any) => s.id !== body.id);
          }
          break;
        }

        case 'delete_install': {
          if (body.id) {
            store.installs = store.installs.filter((i: any) => i.id !== body.id);
          }
          break;
        }

        case 'reset': {
          store.totalVisits = 0;
          store.uniqueVisitorIds = [];
          store.dailyVisits = {};
          store.signups = [];
          store.installs = [];
          store.adsWatched = 0;
          break;
        }

        default:
          return res.status(400).json({ success: false, error: `Unknown event type: ${body.type}` });
      }

      store.updatedAt = Date.now();
      memoryCache = store;

      await put(BLOB_PATHNAME, JSON.stringify(store), {
        access: 'public',
        allowOverwrite: true,
        addRandomSuffix: false,
        cacheControlMaxAge: 0,
        contentType: 'application/json',
      });

      return res.status(200).json({ success: true, ...formatResponse(store) });
    } catch (err: any) {
      console.error('Analytics error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Analytics failed' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
