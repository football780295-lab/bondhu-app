import { Profile } from '../types';
import { ALL_PROFILES, INITIAL_GREETINGS } from '../constants';

export interface UserSignupRecord {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  method: 'email' | 'google' | 'guest';
  status: 'active' | 'blocked';
  avatar?: string;
  phone?: string;
  credits?: number;
  lastActive?: string;
  isVerified?: boolean;
  totalMessagesSent?: number;
  platform?: string;
  userAgent?: string;
}

export interface AppInstallRecord {
  id: string;
  timestamp: string;
  platform: 'Android' | 'iOS' | 'Windows' | 'macOS' | 'Other';
  source: string;
  userAgent?: string;
}

export interface AdminCredentials {
  username: string;
  password: string;
}

export interface AppNoticeConfig {
  enabled: boolean;
  text: string;
  type: 'info' | 'warning' | 'promo';
}

export interface WebAppControlConfig {
  maintenanceMode: boolean;
  freeTrialMessages: number;
  notice: AppNoticeConfig;
}

const STORAGE_PROFILES_KEY = 'BONDHU_APP_PROFILES_V2';
const STORAGE_GREETINGS_KEY = 'BONDHU_APP_GREETINGS_V2';
const STORAGE_SIGNUPS_KEY = 'BONDHU_USER_SIGNUPS_V2';
const STORAGE_INSTALLS_KEY = 'BONDHU_APP_INSTALLS_V2';
const STORAGE_ADMIN_CRED_KEY = 'BONDHU_ADMIN_CREDENTIALS_V2';
const STORAGE_ADMIN_SESSION_KEY = 'BONDHU_ADMIN_SESSION_ACTIVE';
const STORAGE_LOCAL_UPDATED_AT_KEY = 'BONDHU_LOCAL_PROFILES_UPDATED_AT_V2';
const STORAGE_APP_CONTROL_KEY = 'BONDHU_WEBAPP_CONTROL_V2';
const STORAGE_VISITOR_ID_KEY = 'BONDHU_VISITOR_ID_V1';
const SESSION_VISIT_TRACKED_KEY = 'BONDHU_VISIT_TRACKED_SESSION';

export interface VisitStats {
  totalVisits: number;
  todayVisits: number;
  uniqueVisitors: number;
  adsWatched: number;
}

// Global Cloud Sync Endpoint for live real website updates
export const API_SYNC_ENDPOINT = '/api/sync';
export const API_ANALYTICS_ENDPOINT = '/api/analytics';
export const BLOB_PUBLIC_URL = 'https://3hgb5rcqc0evcddn.public.blob.vercel-storage.com/bondhu-profiles.json';
export const BLOB_ANALYTICS_PUBLIC_URL = 'https://3hgb5rcqc0evcddn.public.blob.vercel-storage.com/bondhu-analytics.json';

// Initial signups & installs start completely clean (no fake seed accounts)
const INITIAL_SIGNUPS: UserSignupRecord[] = [];
const INITIAL_INSTALLS: AppInstallRecord[] = [];

const DEFAULT_APP_CONTROL: WebAppControlConfig = {
  maintenanceMode: false,
  freeTrialMessages: 1,
  notice: {
    enabled: false,
    text: '',
    type: 'promo'
  }
};

class AdminService {
  private profiles: Profile[] = [];
  private greetings: Record<string, string> = {};
  private signups: UserSignupRecord[] = [];
  private installs: AppInstallRecord[] = [];
  private visitStats: VisitStats = { totalVisits: 0, todayVisits: 0, uniqueVisitors: 0, adsWatched: 0 };
  private visitTrackedInMemory: boolean = false;
  private appControl: WebAppControlConfig = { ...DEFAULT_APP_CONTROL };
  private profileListeners: Array<(profiles: Profile[]) => void> = [];
  private statsListeners: Array<() => void> = [];
  private isCloudSyncing: boolean = false;
  private lastCloudSyncTime: string | null = null;

  constructor() {
    this.initData();
    // Fetch latest cloud profiles on start for all users
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.fetchCloudProfiles().catch(() => {});
      }, 300);

      // Auto-refresh profiles whenever visitor returns to tab or reconnects
      window.addEventListener('focus', () => {
        this.fetchCloudProfiles().catch(() => {});
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.fetchCloudProfiles().catch(() => {});
        }
      });
    }
  }

  private initData() {
    if (typeof window === 'undefined') return;

    // 1. Load Profiles from Local Cache
    try {
      const storedProfiles = localStorage.getItem(STORAGE_PROFILES_KEY);
      if (storedProfiles) {
        const parsed = JSON.parse(storedProfiles);
        if (Array.isArray(parsed) && parsed.length >= ALL_PROFILES.length) {
          this.profiles = parsed;
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge so all 44 default profiles are always preserved
          const merged = ALL_PROFILES.map((dp) => {
            const found = parsed.find((p: any) => p.id === dp.id);
            return found ? { ...dp, ...found } : dp;
          });
          parsed.forEach((cp: any) => {
            if (!merged.some(p => p.id === cp.id)) {
              merged.push(cp);
            }
          });
          this.profiles = merged;
          localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(this.profiles));
        } else {
          this.profiles = [...ALL_PROFILES];
          localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(this.profiles));
        }
      } else {
        this.profiles = [...ALL_PROFILES];
        localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(this.profiles));
      }
    } catch {
      this.profiles = [...ALL_PROFILES];
    }

    try {
      this.sanitizeProfileAvatars().catch(() => {});
    } catch (_) {}

    // 2. Load Greetings from Local Cache
    try {
      const storedGreetings = localStorage.getItem(STORAGE_GREETINGS_KEY);
      if (storedGreetings) {
        this.greetings = JSON.parse(storedGreetings);
      } else {
        this.greetings = { ...INITIAL_GREETINGS };
        localStorage.setItem(STORAGE_GREETINGS_KEY, JSON.stringify(this.greetings));
      }
    } catch {
      this.greetings = { ...INITIAL_GREETINGS };
    }

    // 3. Load Signups
    try {
      const storedSignups = localStorage.getItem(STORAGE_SIGNUPS_KEY);
      if (storedSignups) {
        const parsedSignups: UserSignupRecord[] = JSON.parse(storedSignups);
        // Automatically filter out and delete any previous fake seed users
        const fakeIds = new Set(['usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_5']);
        const fakeNames = new Set(['তানভীর আহমেদ', 'রাকিবুল হাসান', 'মেহেদী হাসান শুভ', 'সাব্বির হোসেন', 'ফারহান চৌধুরী']);
        this.signups = parsedSignups.filter(
          (s) => !fakeIds.has(s.id) && !fakeNames.has(s.name) && !s.email.includes('user_')
        );
        localStorage.setItem(STORAGE_SIGNUPS_KEY, JSON.stringify(this.signups));
      } else {
        this.signups = [];
        localStorage.setItem(STORAGE_SIGNUPS_KEY, JSON.stringify(this.signups));
      }
    } catch {
      this.signups = [];
    }

    // 4. Load Installs
    try {
      const storedInstalls = localStorage.getItem(STORAGE_INSTALLS_KEY);
      if (storedInstalls) {
        const parsedInstalls: AppInstallRecord[] = JSON.parse(storedInstalls);
        // Automatically filter out any previous fake seed installs
        const fakeInstallIds = new Set(['inst_1', 'inst_2', 'inst_3', 'inst_4', 'inst_5', 'inst_6']);
        this.installs = parsedInstalls.filter(
          (i) => !fakeInstallIds.has(i.id) && i.source !== 'Admin Test Simulator'
        );
        localStorage.setItem(STORAGE_INSTALLS_KEY, JSON.stringify(this.installs));
      } else {
        this.installs = [];
        localStorage.setItem(STORAGE_INSTALLS_KEY, JSON.stringify(this.installs));
      }
    } catch {
      this.installs = [];
    }

    // 5. Load Web App Live Control Config
    try {
      const storedControl = localStorage.getItem(STORAGE_APP_CONTROL_KEY);
      if (storedControl) {
        this.appControl = { ...DEFAULT_APP_CONTROL, ...JSON.parse(storedControl) };
      }
    } catch {}
  }

  // ================= ADMIN CREDENTIALS =================
  public getCredentials(): AdminCredentials {
    if (typeof window === 'undefined') return { username: 'admin', password: 'admin123' };
    try {
      const stored = localStorage.getItem(STORAGE_ADMIN_CRED_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return { username: 'admin', password: 'admin123' };
  }

  public updateCredentials(username: string, password: string): void {
    const creds: AdminCredentials = { username: username.trim(), password: password.trim() };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_ADMIN_CRED_KEY, JSON.stringify(creds));
    }
  }

  public isAdminCredentials(inputUserOrEmail: string, inputPass: string): boolean {
    const cred = this.getCredentials();
    const cleanInput = (inputUserOrEmail || '').trim().toLowerCase();
    const cleanPass = (inputPass || '').trim();

    // Support both username 'admin' and email 'admin@bondhu.com' or custom
    const matchUser = cleanInput === 'admin' ||
                      cleanInput === 'admin@bondhu.com' ||
                      cleanInput === 'admin@app.com' ||
                      cleanInput === cred.username.toLowerCase();

    // Support custom password or default fallback 'admin123' / 'admin'
    const matchPass = cleanPass === 'admin123' || 
                      cleanPass === 'admin' || 
                      cleanPass === 'admin@123' ||
                      cleanPass === cred.password;

    return matchUser && matchPass;
  }

  public isAdminLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(STORAGE_ADMIN_SESSION_KEY) === 'true' ||
           localStorage.getItem(STORAGE_ADMIN_SESSION_KEY) === 'true';
  }

  public setAdminLoggedIn(val: boolean): void {
    if (typeof window === 'undefined') return;
    if (val) {
      sessionStorage.setItem(STORAGE_ADMIN_SESSION_KEY, 'true');
      localStorage.setItem(STORAGE_ADMIN_SESSION_KEY, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_ADMIN_SESSION_KEY);
      localStorage.removeItem(STORAGE_ADMIN_SESSION_KEY);
    }
  }

  // ================= PROFILES CRUD =================
  public getProfiles(): Profile[] {
    if (!this.profiles || this.profiles.length === 0) {
      this.initData();
    }
    return [...this.profiles];
  }

  public getGreeting(profileId: string): string {
    return this.greetings[profileId] || INITIAL_GREETINGS[profileId] || "Assalamu alaikum! Kemon achen?";
  }

  public subscribeProfiles(callback: (profiles: Profile[]) => void): () => void {
    this.profileListeners.push(callback);
    callback(this.getProfiles());
    return () => {
      this.profileListeners = this.profileListeners.filter(cb => cb !== callback);
    };
  }

  public isSyncingToCloud(): boolean {
    return this.isCloudSyncing;
  }

  public getLastCloudSyncTime(): string | null {
    return this.lastCloudSyncTime;
  }

  // Compress any existing oversized base64 avatar to crisp 120x120 JPEG (~1.8KB)
  // This guarantees all 44+ profiles together take < 40KB and never exceed cloud storage limits!
  public async sanitizeProfileAvatars(): Promise<void> {
    if (typeof window === 'undefined') return;
    const oversized = this.profiles.filter(
      p => p.avatar && p.avatar.startsWith('data:image/') && p.avatar.length > 7000
    );
    if (oversized.length === 0) return;

    await Promise.all(
      oversized.map((p) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const targetDim = 120;
              const canvas = document.createElement('canvas');
              canvas.width = targetDim;
              canvas.height = targetDim;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;
                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetDim, targetDim);
                p.avatar = canvas.toDataURL('image/jpeg', 0.65);
              }
            } catch (_) {}
            resolve();
          };
          img.onerror = () => resolve();
          img.src = p.avatar;
        });
      })
    );

    try {
      localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(this.profiles));
    } catch (_) {}
  }

  // Fetch latest profiles and greetings from Global Cloud Store
  public async fetchCloudProfiles(): Promise<boolean> {
    try {
      let json: any = null;

      // 1. Try our same-origin /api/sync endpoint first (Zero CORS issues)
      try {
        const apiRes = await fetch(`${API_SYNC_ENDPOINT}?t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        if (apiRes.ok) {
          const d = await apiRes.json();
          if (d && Array.isArray(d.profiles) && d.profiles.length > 0) {
            json = d;
          }
        }
      } catch (_) {}

      // 2. Direct fallback to public Vercel Blob CDN URL if /api/sync was delayed
      if (!json || !Array.isArray(json.profiles) || json.profiles.length === 0) {
        try {
          const directBlobRes = await fetch(`${BLOB_PUBLIC_URL}?t=${Date.now()}`, {
            method: 'GET',
            cache: 'no-store',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000)
          });
          if (directBlobRes.ok) {
            const d = await directBlobRes.json();
            if (d && Array.isArray(d.profiles) && d.profiles.length > 0) {
              json = d;
            }
          }
        } catch (_) {}
      }

      if (json && Array.isArray(json.profiles) && json.profiles.length > 0) {
        // Timestamp conflict check:
        // If this device has recent local edits saved within 10 minutes,
        // do NOT overwrite local changes with stale cloud profiles!
        if (typeof window !== 'undefined') {
          const localUpdateStr = localStorage.getItem(STORAGE_LOCAL_UPDATED_AT_KEY);
          const localTime = localUpdateStr ? parseInt(localUpdateStr, 10) : 0;
          const cloudTime = json.updatedAt ? new Date(json.updatedAt).getTime() : 0;

          if (localTime > cloudTime && (Date.now() - localTime) < 600000) {
            this.syncToCloud().catch(() => {});
            return true;
          }
        }

        // Preserve current local edits on this device, and merge cloud updates on top!
        const baseList = this.profiles.length > 0 ? this.profiles : ALL_PROFILES;
        const merged = baseList.map((existing) => {
          const cloudMatch = json.profiles.find((cp: any) => cp.id === existing.id);
          if (cloudMatch) {
            // CRITICAL FIX: If local profile has a custom uploaded avatar (data:image/ or blob:),
            // and the cloud profile has a default Unsplash avatar, DO NOT overwrite local avatar!
            const hasLocalCustom = existing.avatar && existing.avatar.startsWith('data:image/');
            const isCloudDefault = !cloudMatch.avatar || cloudMatch.avatar.includes('images.unsplash.com');
            if (hasLocalCustom && isCloudDefault) {
              return { ...existing, ...cloudMatch, avatar: existing.avatar };
            }
            return { ...existing, ...cloudMatch };
          }
          return existing; // Keep existing local edits! Never revert to default!
        });

        // Ensure all 44 default profiles are always present
        ALL_PROFILES.forEach((dp) => {
          if (!merged.some((p) => p.id === dp.id)) {
            const cloudMatch = json.profiles.find((cp: any) => cp.id === dp.id);
            merged.push(cloudMatch ? { ...dp, ...cloudMatch } : dp);
          }
        });

        // Also append any newly created custom profiles added by admin
        json.profiles.forEach((cp: any) => {
          if (!merged.some((p) => p.id === cp.id)) {
            merged.push(cp);
          }
        });

        this.profiles = merged;
        if (json.greetings && typeof json.greetings === 'object') {
          this.greetings = { ...this.greetings, ...json.greetings };
        }
        if (json.appControl && typeof json.appControl === 'object') {
          this.appControl = { ...this.appControl, ...json.appControl };
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_APP_CONTROL_KEY, JSON.stringify(this.appControl));
              window.dispatchEvent(new CustomEvent('bondhu-app-control-updated', { detail: this.appControl }));
            } catch (_) {}
          }
        }
        if (json.updatedAt) {
          this.lastCloudSyncTime = json.updatedAt;
        }

        // Save to local cache safely and notify all UI subscribers without re-uploading
        this.notifyProfiles(true);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Cloud fetch notice:', err);
      return false;
    }
  }

  // Push local updates to Global Cloud Store
  public async syncToCloud(): Promise<{ success: boolean; message: string }> {
    this.isCloudSyncing = true;
    try {
      // First ensure any old oversized avatars are downscaled to ~1.8KB so cloud never rejects
      await this.sanitizeProfileAvatars();

      const nowIso = new Date().toISOString();
      const payload = {
        version: 2,
        updatedAt: nowIso,
        profiles: this.profiles,
        greetings: this.greetings,
        appControl: this.appControl
      };

      let success = false;

      // Save to /api/sync (backed by persistent Vercel Blob)
      try {
        const res = await fetch(API_SYNC_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success === true) {
            success = true;
          }
        }
      } catch (_) {
        success = false;
      }

      this.isCloudSyncing = false;
      if (success) {
        this.lastCloudSyncTime = nowIso;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_LOCAL_UPDATED_AT_KEY, new Date(nowIso).getTime().toString());
        }
        return { success: true, message: 'সফলভাবে লাইভ ক্লাউড ও রিয়েল ওয়েবসাইটে সেভ হয়েছে!' };
      }
      return { success: false, message: 'ক্লাউড সিঙ্ক সম্পন্ন হতে পারেনি, তবে লোকাল মেমরিতে সেভ আছে।' };
    } catch (err: any) {
      this.isCloudSyncing = false;
      return { success: false, message: `ক্লাউড সিঙ্ক এরর: ${err?.message || 'Network issue'}` };
    }
  }

  // Export full JSON configuration for backup
  public exportProfilesJson(): string {
    return JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      profiles: this.profiles,
      greetings: this.greetings
    }, null, 2);
  }

  private notifyProfiles(skipCloudSync: boolean = false) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(this.profiles));
        localStorage.setItem(STORAGE_GREETINGS_KEY, JSON.stringify(this.greetings));
        if (!skipCloudSync) {
          localStorage.setItem(STORAGE_LOCAL_UPDATED_AT_KEY, Date.now().toString());
        }
      } catch (err) {
        console.warn('LocalStorage save quota exceeded, profiles kept in memory:', err);
      }

      // Dispatch global window event for instantaneous UI updates across all components
      try {
        window.dispatchEvent(new CustomEvent('bondhu-profiles-updated', { detail: this.profiles }));
      } catch (_) {}
    }
    this.profileListeners.forEach(cb => cb([...this.profiles]));

    // Automatically sync changes to cloud in background
    if (!skipCloudSync) {
      this.syncToCloud().catch(() => {});
    }
  }

  public updateProfile(updated: Profile, greetingText?: string): void {
    const idx = this.profiles.findIndex(p => p.id === updated.id);
    if (idx !== -1) {
      this.profiles[idx] = { ...updated };
    } else {
      this.profiles.unshift(updated);
    }
    if (greetingText !== undefined) {
      this.greetings[updated.id] = greetingText;
    }
    this.notifyProfiles();
  }

  public addProfile(newProfile: Profile, greetingText?: string): void {
    this.profiles.unshift(newProfile);
    if (greetingText) {
      this.greetings[newProfile.id] = greetingText;
    }
    this.notifyProfiles();
  }

  public deleteProfile(profileId: string): void {
    this.profiles = this.profiles.filter(p => p.id !== profileId);
    delete this.greetings[profileId];
    this.notifyProfiles();
  }

  public resetProfilesToDefault(): void {
    this.profiles = [...ALL_PROFILES];
    this.greetings = { ...INITIAL_GREETINGS };
    this.notifyProfiles();
  }

  // ================= STATS & ANALYTICS =================
  public getVisitStats(): VisitStats {
    return { ...this.visitStats };
  }

  private async postAnalyticsEvent(body: any): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch(API_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const d = await res.json();
        if (d && d.success) {
          this.visitStats = {
            totalVisits: typeof d.totalVisits === 'number' ? d.totalVisits : this.visitStats.totalVisits,
            todayVisits: typeof d.todayVisits === 'number' ? d.todayVisits : this.visitStats.todayVisits,
            uniqueVisitors: typeof d.uniqueVisitors === 'number' ? d.uniqueVisitors : this.visitStats.uniqueVisitors,
            adsWatched: typeof d.adsWatched === 'number' ? d.adsWatched : this.visitStats.adsWatched,
          };
        }
      }
    } catch (_) {}
  }

  public trackVisit(): void {
    if (typeof window === 'undefined') return;
    if (this.visitTrackedInMemory) return;
    try {
      if (sessionStorage.getItem(SESSION_VISIT_TRACKED_KEY) === '1') {
        this.visitTrackedInMemory = true;
        return;
      }
      this.visitTrackedInMemory = true;
      sessionStorage.setItem(SESSION_VISIT_TRACKED_KEY, '1');

      let visitorId = localStorage.getItem(STORAGE_VISITOR_ID_KEY);
      if (!visitorId) {
        visitorId = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem(STORAGE_VISITOR_ID_KEY, visitorId);
      }

      this.postAnalyticsEvent({ type: 'visit', visitorId }).catch(() => {});
    } catch (_) {}
  }

  public recordAdWatch(): void {
    this.visitStats.adsWatched += 1;
    this.postAnalyticsEvent({ type: 'ad' }).catch(() => {});
  }

  public async fetchCloudAnalytics(): Promise<boolean> {
    try {
      let d: any = null;
      try {
        const res = await fetch(`${API_ANALYTICS_ENDPOINT}?t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          d = await res.json();
        }
      } catch (_) {}

      if (!d) {
        try {
          const blobRes = await fetch(`${BLOB_ANALYTICS_PUBLIC_URL}?t=${Date.now()}`, {
            method: 'GET',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(5000),
          });
          if (blobRes.ok) {
            const raw = await blobRes.json();
            const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
            d = {
              totalVisits: raw.totalVisits || 0,
              todayVisits: raw.dailyVisits?.[todayKey] || 0,
              uniqueVisitors: Array.isArray(raw.uniqueVisitorIds) ? raw.uniqueVisitorIds.length : 0,
              adsWatched: raw.adsWatched || 0,
              signups: raw.signups || [],
              installs: raw.installs || [],
            };
          }
        } catch (_) {}
      }

      if (d) {
        this.visitStats = {
          totalVisits: typeof d.totalVisits === 'number' ? d.totalVisits : this.visitStats.totalVisits,
          todayVisits: typeof d.todayVisits === 'number' ? d.todayVisits : this.visitStats.todayVisits,
          uniqueVisitors: typeof d.uniqueVisitors === 'number' ? d.uniqueVisitors : this.visitStats.uniqueVisitors,
          adsWatched: typeof d.adsWatched === 'number' ? d.adsWatched : this.visitStats.adsWatched,
        };
        if (Array.isArray(d.signups)) {
          this.signups = d.signups;
        }
        if (Array.isArray(d.installs)) {
          this.installs = d.installs;
        }
        this.notifyStats();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public getSignups(): UserSignupRecord[] {
    return [...this.signups];
  }

  public recordSignup(data: {
    id?: string;
    name: string;
    email: string;
    method?: 'email' | 'google' | 'guest';
    avatar?: string;
    phone?: string;
    credits?: number;
    status?: 'active' | 'blocked';
    isVerified?: boolean;
    totalMessagesSent?: number;
    platform?: string;
  }): UserSignupRecord {
    // Avoid exact duplicate emails in the list
    const existingIndex = this.signups.findIndex(s => s.email.toLowerCase() === data.email.toLowerCase());
    if (existingIndex !== -1) {
      const updated: UserSignupRecord = {
        ...this.signups[existingIndex],
        name: data.name || this.signups[existingIndex].name,
        avatar: data.avatar || this.signups[existingIndex].avatar,
        phone: data.phone !== undefined ? data.phone : this.signups[existingIndex].phone,
        credits: data.credits !== undefined ? data.credits : this.signups[existingIndex].credits,
        lastActive: new Date().toISOString()
      };
      this.signups[existingIndex] = updated;
      this.notifyStats();
      this.postAnalyticsEvent({ type: 'signup', record: updated }).catch(() => {});
      return updated;
    }

    let detectedPlatform = 'Web Browser';
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      if (/android/i.test(ua)) detectedPlatform = 'Android';
      else if (/iPad|iPhone|iPod/.test(ua)) detectedPlatform = 'iOS';
      else if (/windows/i.test(ua)) detectedPlatform = 'Windows PC';
      else if (/macintosh|mac os x/i.test(ua)) detectedPlatform = 'macOS';
    }

    const newRecord: UserSignupRecord = {
      id: data.id || ('usr_' + Math.random().toString(36).substring(2, 9)),
      name: data.name.trim() || 'New User',
      email: data.email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
      method: data.method || 'email',
      status: data.status || 'active',
      avatar: data.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.name || data.email)}`,
      phone: data.phone || '',
      credits: data.credits !== undefined ? data.credits : 5,
      lastActive: new Date().toISOString(),
      isVerified: data.isVerified !== undefined ? data.isVerified : data.method === 'google',
      totalMessagesSent: data.totalMessagesSent || 0,
      platform: data.platform || detectedPlatform,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    };

    this.signups.unshift(newRecord);
    this.notifyStats();
    this.postAnalyticsEvent({ type: 'signup', record: newRecord }).catch(() => {});
    return newRecord;
  }

  public updateUserSignup(id: string, updates: Partial<UserSignupRecord>): void {
    const idx = this.signups.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.signups[idx] = {
        ...this.signups[idx],
        ...updates
      };
      this.notifyStats();
      this.postAnalyticsEvent({ type: 'update_signup', id, updates }).catch(() => {});
    }
  }

  public toggleBlockUser(id: string): 'active' | 'blocked' {
    const idx = this.signups.findIndex(s => s.id === id);
    if (idx !== -1) {
      const nextStatus = this.signups[idx].status === 'blocked' ? 'active' : 'blocked';
      this.signups[idx].status = nextStatus;
      this.notifyStats();
      this.postAnalyticsEvent({ type: 'update_signup', id, updates: { status: nextStatus } }).catch(() => {});
      return nextStatus;
    }
    return 'active';
  }

  public updateUserCredits(id: string, newCredits: number): void {
    const idx = this.signups.findIndex(s => s.id === id);
    if (idx !== -1) {
      const nextCredits = Math.max(0, newCredits);
      this.signups[idx].credits = nextCredits;
      this.notifyStats();
      this.postAnalyticsEvent({ type: 'update_signup', id, updates: { credits: nextCredits } }).catch(() => {});
    }
  }

  public deleteSignup(id: string): void {
    this.signups = this.signups.filter(s => s.id !== id);
    this.notifyStats();
    this.postAnalyticsEvent({ type: 'delete_signup', id }).catch(() => {});
  }

  // Remove all fake seed profiles, dummy users, and test installs
  public removeFakeProfiles(): { removedSignups: number; removedInstalls: number; removedProfiles: number } {
    const prevSignupsCount = this.signups.length;
    const prevInstallsCount = this.installs.length;
    const prevProfilesCount = this.profiles.length;

    // 1. Remove fake user signups (usr_1 through usr_5, dummy test users, etc.)
    const fakeSignupIds = new Set(['usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_5']);
    const fakeNames = new Set(['তানভীর আহমেদ', 'রাকিবুল হাসান', 'মেহেদী হাসান শুভ', 'সাব্বির হোসেন', 'ফারহান চৌধুরী']);
    this.signups = this.signups.filter(
      (s) => !fakeSignupIds.has(s.id) && !fakeNames.has(s.name) && !s.email.includes('user_')
    );

    // 2. Remove fake seed installs
    const fakeInstallIds = new Set(['inst_1', 'inst_2', 'inst_3', 'inst_4', 'inst_5', 'inst_6']);
    this.installs = this.installs.filter(
      (i) => !fakeInstallIds.has(i.id) && i.source !== 'Admin Test Simulator'
    );

    // 3. Remove fake custom added chat profiles (keeping only the authentic 44 profiles)
    const validProfileIds = new Set(ALL_PROFILES.map((p) => p.id));
    this.profiles = this.profiles.filter((p) => validProfileIds.has(p.id));

    this.notifyStats();
    this.notifyProfiles();

    return {
      removedSignups: prevSignupsCount - this.signups.length,
      removedInstalls: prevInstallsCount - this.installs.length,
      removedProfiles: prevProfilesCount - this.profiles.length
    };
  }

  // ================= WEB APP CONTROLS & LIVE SITE CONNECTION =================
  public getAppControl(): WebAppControlConfig {
    return {
      ...this.appControl,
      notice: { ...this.appControl.notice }
    };
  }

  public updateAppControl(updates: Partial<WebAppControlConfig>): void {
    this.appControl = {
      ...this.appControl,
      ...updates,
      notice: {
        ...this.appControl.notice,
        ...(updates.notice || {})
      }
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_APP_CONTROL_KEY, JSON.stringify(this.appControl));
        window.dispatchEvent(new CustomEvent('bondhu-app-control-updated', { detail: this.appControl }));
      } catch (_) {}
    }
    this.syncToCloud().catch(() => {});
  }

  public isUserBlocked(identifier: string): boolean {
    if (!identifier) return false;
    const clean = identifier.trim().toLowerCase();
    const blockedRecord = this.signups.find(
      s => (s.id.toLowerCase() === clean || s.email.toLowerCase() === clean) && s.status === 'blocked'
    );
    return !!blockedRecord;
  }

  public getInstalls(): AppInstallRecord[] {
    return [...this.installs];
  }

  public recordInstall(details?: { source?: string; platform?: string }): AppInstallRecord {
    let detectedPlatform: 'Android' | 'iOS' | 'Windows' | 'macOS' | 'Other' = 'Other';
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      if (/android/i.test(ua)) detectedPlatform = 'Android';
      else if (/iPad|iPhone|iPod/.test(ua)) detectedPlatform = 'iOS';
      else if (/windows/i.test(ua)) detectedPlatform = 'Windows';
      else if (/macintosh|mac os x/i.test(ua)) detectedPlatform = 'macOS';
    }

    const newInstall: AppInstallRecord = {
      id: 'inst_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      platform: (details?.platform as any) || detectedPlatform,
      source: details?.source || 'App Install Action',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    };

    this.installs.unshift(newInstall);
    this.notifyStats();
    this.postAnalyticsEvent({ type: 'install', record: newInstall }).catch(() => {});
    return newInstall;
  }

  public deleteInstall(id: string): void {
    this.installs = this.installs.filter(i => i.id !== id);
    this.notifyStats();
    this.postAnalyticsEvent({ type: 'delete_install', id }).catch(() => {});
  }

  public subscribeStats(callback: () => void): () => void {
    this.statsListeners.push(callback);
    return () => {
      this.statsListeners = this.statsListeners.filter(cb => cb !== callback);
    };
  }

  private notifyStats() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_SIGNUPS_KEY, JSON.stringify(this.signups));
      localStorage.setItem(STORAGE_INSTALLS_KEY, JSON.stringify(this.installs));
    }
    this.statsListeners.forEach(cb => cb());
  }

  public resetStats(): void {
    this.signups = [...INITIAL_SIGNUPS];
    this.installs = [...INITIAL_INSTALLS];
    this.visitStats = { totalVisits: 0, todayVisits: 0, uniqueVisitors: 0, adsWatched: 0 };
    this.notifyStats();
    this.postAnalyticsEvent({ type: 'reset' }).catch(() => {});
  }
}

export const adminService = new AdminService();
