// Vercel Serverless Function: Global Profiles & Sync API
// Uses native Vercel Blob (OIDC) for persistent global storage so admin profile changes
// sync immediately to EVERY public visitor on ANY browser or device.

import { put, list } from '@vercel/blob';

const BLOB_PATHNAME = 'bondhu-profiles.json';
const BLOB_PUBLIC_URL = 'https://3hgb5rcqc0evcddn.public.blob.vercel-storage.com/bondhu-profiles.json';

interface SyncPayload {
  profiles: any[];
  updatedAt: number;
  syncedAt?: string;
}

// Warm-instance in-memory cache as a fast fallback
let memoryCache: SyncPayload | null = null;

function setNoCacheAndCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

async function readFromBlob(): Promise<SyncPayload | null> {
  // 1. Direct fetch from deterministic public Blob URL with cache-busting
  try {
    const res = await fetch(`${BLOB_PUBLIC_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.profiles)) {
        return data as SyncPayload;
      }
    }
  } catch {
    // Fall through to list() lookup
  }

  // 2. Fallback: lookup via Vercel Blob list()
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
    if (blobs.length > 0) {
      const res = await fetch(`${blobs[0].url}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.profiles)) {
          return data as SyncPayload;
        }
      }
    }
  } catch {
    // Ignore and fall back to memoryCache
  }

  return null;
}

export default async function handler(req: any, res: any) {
  setNoCacheAndCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const blobData = await readFromBlob();

    if (blobData && blobData.profiles.length > 0) {
      if (!memoryCache || (blobData.updatedAt || 0) >= (memoryCache.updatedAt || 0)) {
        memoryCache = blobData;
      }
      return res.status(200).json({ ...blobData, source: 'vercel-blob' });
    }

    if (memoryCache && memoryCache.profiles.length > 0) {
      return res.status(200).json({ ...memoryCache, source: 'memory-cache' });
    }

    return res.status(200).json({
      profiles: blobData?.profiles || [],
      updatedAt: blobData?.updatedAt || 0,
      source: blobData ? 'vercel-blob-empty' : 'empty',
    });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!rawBody || !Array.isArray(rawBody.profiles)) {
        return res.status(400).json({ success: false, error: 'Invalid payload: profiles array is required' });
      }

      const payload: SyncPayload = {
        profiles: rawBody.profiles,
        updatedAt: typeof rawBody.updatedAt === 'number' ? rawBody.updatedAt : Date.now(),
        syncedAt: new Date().toISOString(),
      };

      const blob = await put(BLOB_PATHNAME, JSON.stringify(payload), {
        access: 'public',
        allowOverwrite: true,
        addRandomSuffix: false,
        cacheControlMaxAge: 0,
        contentType: 'application/json',
      });

      memoryCache = payload;

      return res.status(200).json({
        success: true,
        count: payload.profiles.length,
        updatedAt: payload.updatedAt,
        url: blob.url,
      });
    } catch (err: any) {
      console.error('Vercel Blob sync error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to save profiles to Vercel Blob',
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
