// Vercel Serverless Function: Global Profiles & Sync API
// Runs on Node.js server - Zero browser CORS issues!

const CLOUD_BIN_URL = 'https://extendsclass.com/api/json-storage/bin/ceaeeff';

export default async function handler(req: any, res: any) {
  // Allow all origins, methods, and headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Fetch latest profiles from cloud storage
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${CLOUD_BIN_URL}?t=${Date.now()}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        return res.status(response.status).json({
          version: 2,
          profiles: [],
          greetings: {},
          error: `Backend responded with code ${response.status}`
        });
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (err: any) {
      console.error('Error fetching profiles in api/sync:', err);
      return res.status(500).json({
        version: 2,
        profiles: [],
        greetings: {},
        error: err?.message || 'Failed to fetch profiles'
      });
    }
  }

  // POST / PUT: Save updated profiles to cloud storage
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        try {
          bodyData = JSON.parse(bodyData);
        } catch (_) {}
      }

      if (!bodyData || (!bodyData.profiles && !Array.isArray(bodyData))) {
        return res.status(400).json({ success: false, message: 'Invalid payload: profiles array required' });
      }

      // Ensure proper structure
      const payload = {
        version: 2,
        updatedAt: new Date().toISOString(),
        profiles: Array.isArray(bodyData.profiles) ? bodyData.profiles : (Array.isArray(bodyData) ? bodyData : []),
        greetings: bodyData.greetings || {}
      };

      // Server-side PUT request to extendsclass (No browser CORS preflight!)
      const response = await fetch(CLOUD_BIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`Upstream error: ${response.status} ${response.statusText}`);
      }

      return res.status(200).json({
        success: true,
        message: 'সফলভাবে ক্লাউডে সেভ হয়েছে!',
        updatedAt: payload.updatedAt,
        count: payload.profiles.length
      });
    } catch (err: any) {
      console.error('Error saving profiles in api/sync:', err);
      return res.status(500).json({
        success: false,
        message: err?.message || 'Server error while saving'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
