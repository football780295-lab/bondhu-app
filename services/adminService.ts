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

const STORAGE_PROFILES_KEY = 'BONDHU_APP_PROFILES_V2';
const STORAGE_GREETINGS_KEY = 'BONDHU_APP_GREETINGS_V2';
const STORAGE_SIGNUPS_KEY = 'BONDHU_USER_SIGNUPS_V2';
const STORAGE_INSTALLS_KEY = 'BONDHU_APP_INSTALLS_V2';
const STORAGE_ADMIN_CRED_KEY = 'BONDHU_ADMIN_CREDENTIALS_V2';
const STORAGE_ADMIN_SESSION_KEY = 'BONDHU_ADMIN_SESSION_ACTIVE';
const STORAGE_LOCAL_UPDATED_AT_KEY = 'BONDHU_LOCAL_PROFILES_UPDATED_AT_V2';

// Global Cloud Sync Endpoint for live real website updates
export const API_SYNC_ENDPOINT = '/api/sync';
export const GLOBAL_CLOUD_STORAGE_URL = 'https://extendsclass.com/api/json-storage/bin/ceaeeff';

// Initial realistic signups seed if empty
const INITIAL_SIGNUPS: UserSignupRecord[] = [
  { id: 'usr_1', name: 'তানভীর আহমেদ', email: 'tanvir.ahmed@gmail.com', createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), method: 'email', status: 'active', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Tanvir' },
  { id: 'usr_2', name: 'রাকিবুল হাসান', email: 'rakibul.h@yahoo.com', createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), method: 'google', status: 'active', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rakib' },
  { id: 'usr_3', name: 'মেহেদী হাসান শুভ', email: 'mehedi.shuvo@gmail.com', createdAt: new Date(Date.now() - 3600000 * 14).toISOString(), method: 'email', status: 'active', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mehedi' },
  { id: 'usr_4', name: 'সাব্বির হোসেন', email: 'sabbir23@gmail.com', createdAt: new Date(Date.now() - 3600000 * 28).toISOString(), method: 'email', status: 'active', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sabbir' },
  { id: 'usr_5', name: 'ফারহান চৌধুরী', email: 'farhan.chowdhury@hotmail.com', createdAt: new Date(Date.now() - 3600000 * 42).toISOString(), method: 'google', status: 'active', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Farhan' }
];

// Initial realistic installs seed if empty
const INITIAL_INSTALLS: AppInstallRecord[] = [
  { id: 'inst_1', timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(), platform: 'Android', source: 'PWA Install Prompt' },
  { id: 'inst_2', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), platform: 'Android', source: 'Me Tab Download Button' },
  { id: 'inst_3', timestamp: new Date(Date.now() - 3600000 * 9).toISOString(), platform: 'Windows', source: 'Browser Prompt' },
  { id: 'inst_4', timestamp: new Date(Date.now() - 3600000 * 19).toISOString(), platform: 'Android', source: 'Direct Web App' },
  { id: 'inst_5', timestamp: new Date(Date.now() - 3600000 * 26).toISOString(), platform: 'iOS', source: 'PWA Add to Homescreen' },
  { id: 'inst_6', timestamp: new Date(Date.now() - 3600000 * 38).toISOString(), platform: 'Android', source: 'Me Tab Download Button' }
];

class AdminService {
  private profiles: Profile[] = [];
  private greetings: Record<string, string> = {};
  private signups: UserSignupRecord[] = [];
  private installs: AppInstallRecord[] = [];
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
        this.signups = JSON.parse(storedSignups);
      } else {
        this.signups = [...INITIAL_SIGNUPS];
        localStorage.setItem(STORAGE_SIGNUPS_KEY, JSON.stringify(this.signups));
      }
    } catch {
      this.signups = [...INITIAL_SIGNUPS];
    }

    // 4. Load Installs
    try {
      const storedInstalls = localStorage.getItem(STORAGE_INSTALLS_KEY);
      if (storedInstalls) {
        this.installs = JSON.parse(storedInstalls);
      } else {
        this.installs = [...INITIAL_INSTALLS];
        localStorage.setItem(STORAGE_INSTALLS_KEY, JSON.stringify(this.installs));
      }
    } catch {
      this.installs = [...INITIAL_INSTALLS];
    }
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

  // Fetch latest profiles and greetings from Global Cloud Store
  public async fetchCloudProfiles(): Promise<boolean> {
    try {
      let json: any = null;

      // 1. Try our same-origin /api/sync endpoint first (Zero CORS issues)
      try {
        const apiRes = await fetch(`${API_SYNC_ENDPOINT}?t=${Date.now()}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        if (apiRes.ok) {
          json = await apiRes.json();
        }
      } catch (_) {}

      // 2. Fallback to direct cloud storage bin if API was not reachable
      if (!json || !Array.isArray(json.profiles) || json.profiles.length === 0) {
        try {
          const directRes = await fetch(`${GLOBAL_CLOUD_STORAGE_URL}?t=${Date.now()}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          if (directRes.ok) {
            json = await directRes.json();
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
      const nowIso = new Date().toISOString();
      const payload = {
        version: 2,
        updatedAt: nowIso,
        profiles: this.profiles,
        greetings: this.greetings
      };

      let success = false;

      // 1. Send to /api/sync endpoint (works seamlessly on Vercel & localhost)
      try {
        const res = await fetch(API_SYNC_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          success = true;
        }
      } catch (_) {}

      // 2. Fallback to direct cloud storage PUT if needed
      if (!success) {
        try {
          const directRes = await fetch(GLOBAL_CLOUD_STORAGE_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
          });
          if (directRes.ok) {
            success = true;
          }
        } catch (_) {}
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
  public getSignups(): UserSignupRecord[] {
    return [...this.signups];
  }

  public recordSignup(data: { name: string; email: string; method?: 'email' | 'google' | 'guest'; avatar?: string }): UserSignupRecord {
    // Avoid exact duplicate emails in the list
    const existingIndex = this.signups.findIndex(s => s.email.toLowerCase() === data.email.toLowerCase());
    if (existingIndex !== -1) {
      const updated = {
        ...this.signups[existingIndex],
        name: data.name || this.signups[existingIndex].name,
        avatar: data.avatar || this.signups[existingIndex].avatar
      };
      this.signups[existingIndex] = updated;
      this.notifyStats();
      return updated;
    }

    const newRecord: UserSignupRecord = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: data.name.trim() || 'New User',
      email: data.email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
      method: data.method || 'email',
      status: 'active',
      avatar: data.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.name || data.email)}`
    };

    this.signups.unshift(newRecord);
    this.notifyStats();
    return newRecord;
  }

  public deleteSignup(id: string): void {
    this.signups = this.signups.filter(s => s.id !== id);
    this.notifyStats();
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
    return newInstall;
  }

  public deleteInstall(id: string): void {
    this.installs = this.installs.filter(i => i.id !== id);
    this.notifyStats();
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
    this.notifyStats();
  }
}

export const adminService = new AdminService();
