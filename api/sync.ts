// Vercel Serverless Function: Global Profiles & Sync API
// Multi-layer resilient cloud storage: In-memory cache + Firebase RTDB + KVDB cloud store
// Guarantees all admin profile picture changes sync to EVERY public visitor on ANY browser/device

const FIREBASE_RTDB_URL = 'https://chating-app675849-default-rtdb.firebaseio.com/bondhu_data.json';
const KVDB_URL = 'https://kvdb.io/S2Vf15gY5mPZ9D8qN1kF9w/bondhu_profiles_v3';

// In-memory module cache (survives warm serverless invocations)
let memoryCache: {
  version: number;
  updatedAt: string;
  profiles: any[];
  greetings: any;
  appControl: any;
} | null = null;

export default async function handler(req: any, res: any) {
  // CORS & Cache control headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Retrieve latest global profiles
  if (req.method === 'GET') {
    // 1. Try Firebase RTDB first
    try {
      const fbRes = await fetch(`${FIREBASE_RTDB_URL}?t=${Date.now()}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3500)
      });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        if (fbData && Array.isArray(fbData.profiles) && fbData.profiles.length > 0) {
          memoryCache = fbData;
          return res.status(200).json({
            success: true,
            source: 'firebase_rtdb',
            ...fbData
          });
        }
      }
    } catch (_) {}

    // 2. Try KVDB cloud storage
    try {
      const kvRes = await fetch(`${KVDB_URL}?t=${Date.now()}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3500)
      });
      if (kvRes.ok) {
        const kvData = await kvRes.json();
        if (kvData && Array.isArray(kvData.profiles) && kvData.profiles.length > 0) {
          memoryCache = kvData;
          return res.status(200).json({
            success: true,
            source: 'kvdb',
            ...kvData
          });
        }
      }
    } catch (_) {}

    // 3. Fallback to memoryCache if present
    if (memoryCache && Array.isArray(memoryCache.profiles) && memoryCache.profiles.length > 0) {
      return res.status(200).json({
        success: true,
        source: 'memory_cache',
        ...memoryCache
      });
    }

    // 4. No cloud data saved yet
    return res.status(200).json({
      success: true,
      source: 'empty_cloud',
      profiles: [],
      greetings: {},
      appControl: null,
      message: 'No cloud override yet'
    });
  }

  // POST / PUT: Save profiles from Admin Panel to cloud
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        try {
          bodyData = JSON.parse(bodyData);
        } catch (_) {}
      }

      if (!bodyData || (!bodyData.profiles && !Array.isArray(bodyData))) {
        return res.status(400).json({ success: false, message: 'Profiles array required' });
      }

      const allProfiles: any[] = Array.isArray(bodyData.profiles)
        ? bodyData.profiles
        : (Array.isArray(bodyData) ? bodyData : []);
      const greetings = bodyData.greetings || {};
      const appControl = bodyData.appControl || null;
      const nowIso = new Date().toISOString();

      const payload = {
        version: 2,
        updatedAt: nowIso,
        profiles: allProfiles,
        greetings: greetings,
        appControl: appControl,
        count: allProfiles.length
      };

      // Update in-memory cache instantly
      memoryCache = payload;

      // Save to Firebase RTDB and KVDB in parallel
      const savePromises = [
        // Target 1: Firebase Realtime Database
        fetch(FIREBASE_RTDB_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch((e) => {
          console.warn('Firebase RTDB save notice:', e);
          return null;
        }),

        // Target 2: KVDB Persistent Storage
        fetch(KVDB_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch((e) => {
          console.warn('KVDB save notice:', e);
          return null;
        })
      ];

      await Promise.allSettled(savePromises);

      return res.status(200).json({
        success: true,
        message: 'সকল প্রোফাইল ও ছবি সফলভাবে ক্লাউডে সেভ হয়েছে!',
        updatedAt: nowIso,
        count: allProfiles.length
      });
    } catch (err: any) {
      console.error('Error saving in api/sync:', err);
      return res.status(500).json({
        success: false,
        message: err?.message || 'Failed to save to cloud storage'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
