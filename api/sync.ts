// Vercel Serverless Function: Global Profiles & Sync API
// Dual-bin high-capacity cloud storage to ensure ALL 44+ profiles & images save without payload limits

const BIN_URL_1 = 'https://extendsclass.com/api/json-storage/bin/ceaeeff';
const BIN_URL_2 = 'https://extendsclass.com/api/json-storage/bin/bdbdace';

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

  // GET: Fetch profiles from both cloud bins and combine them
  if (req.method === 'GET') {
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${BIN_URL_1}?t=${Date.now()}`, { headers: { Accept: 'application/json' } }),
        fetch(`${BIN_URL_2}?t=${Date.now()}`, { headers: { Accept: 'application/json' } })
      ]);

      let profiles1: any[] = [];
      let profiles2: any[] = [];
      let greetings: any = {};

      if (r1.ok) {
        try {
          const d1 = await r1.json();
          if (Array.isArray(d1.profiles)) profiles1 = d1.profiles;
          if (d1.greetings && typeof d1.greetings === 'object') {
            greetings = { ...greetings, ...d1.greetings };
          }
        } catch (_) {}
      }

      if (r2.ok) {
        try {
          const d2 = await r2.json();
          if (Array.isArray(d2.profiles)) profiles2 = d2.profiles;
          if (d2.greetings && typeof d2.greetings === 'object') {
            greetings = { ...greetings, ...d2.greetings };
          }
        } catch (_) {}
      }

      // Combine both chunks into unified profile list
      const combinedProfiles: any[] = [...profiles1];
      profiles2.forEach((p2) => {
        const existingIdx = combinedProfiles.findIndex((p) => p.id === p2.id);
        if (existingIdx !== -1) {
          combinedProfiles[existingIdx] = { ...combinedProfiles[existingIdx], ...p2 };
        } else {
          combinedProfiles.push(p2);
        }
      });

      return res.status(200).json({
        version: 2,
        profiles: combinedProfiles,
        greetings: greetings,
        count: combinedProfiles.length
      });
    } catch (err: any) {
      console.error('Error fetching in api/sync:', err);
      return res.status(500).json({
        version: 2,
        profiles: [],
        greetings: {},
        error: err?.message || 'Failed to fetch'
      });
    }
  }

  // POST / PUT: Split and save across both cloud bins to avoid any 100KB limit
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

      const allProfiles: any[] = Array.isArray(bodyData.profiles) ? bodyData.profiles : (Array.isArray(bodyData) ? bodyData : []);
      const greetings = bodyData.greetings || {};

      // Split profiles into 2 safe chunks (e.g. 1-22 and 23-44)
      const half = Math.ceil(allProfiles.length / 2);
      const chunk1 = allProfiles.slice(0, half);
      const chunk2 = allProfiles.slice(half);

      const nowIso = new Date().toISOString();
      const payload1 = {
        version: 2,
        updatedAt: nowIso,
        profiles: chunk1,
        greetings: greetings
      };

      const payload2 = {
        version: 2,
        updatedAt: nowIso,
        profiles: chunk2,
        greetings: greetings
      };

      // Save both chunks in parallel to cloud storage bins
      const [res1, res2] = await Promise.all([
        fetch(BIN_URL_1, {
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload1)
        }),
        fetch(BIN_URL_2, {
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload2)
        })
      ]);

      if (!res1.ok || !res2.ok) {
        console.error('Bin save status:', res1.status, res2.status);
        const errText1 = !res1.ok ? await res1.text().catch(() => '') : '';
        const errText2 = !res2.ok ? await res2.text().catch(() => '') : '';
        return res.status(500).json({
          success: false,
          message: `Cloud bin error: ${res1.status} (${errText1}) / ${res2.status} (${errText2})`
        });
      }

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
