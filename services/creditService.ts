// Credit & Ad Monetization Service for Bondhu App

const STORAGE_CREDITS_KEY = 'BONDHU_USER_CREDITS_V1';
const STORAGE_GUEST_MSG_KEY = 'BONDHU_GUEST_MSG_COUNT_V1';
const STORAGE_INSTALLED_KEY = 'BONDHU_APP_INSTALLED_FLAG_V1';
const STORAGE_ADS_WATCHED_KEY = 'BONDHU_TOTAL_ADS_WATCHED_V1';
const STORAGE_SMARTLINK_KEY = 'BONDHU_ADSTERRA_SMARTLINK_V1';

export const DEFAULT_ADSTERRA_SMARTLINK = 'https://auctionr.org/4/1aafbffc0f0381e5ce3ac3d059ecebfb';
export const INITIAL_GUEST_CREDITS = 2; // 2 initial credits for guests
export const AD_DURATION_SECONDS = 15; // 15 seconds ad duration for proper ad impressions and revenue
export const AD_REWARD_CREDITS = 3; // +3 credits per 15s video ad watched

// Tiered Credit Costs as requested:
// ১. মাত্র টেক্সট মেসেজে ১ ক্রেডিট
export const TEXT_MESSAGE_CREDIT_COST = 1;
// ২. ভয়েস মেসেজে ২ ক্রেডিট
export const VOICE_MESSAGE_CREDIT_COST = 2;
// ৩. অডিও কলে ৩ ক্রেডিট
export const AUDIO_CALL_CREDIT_COST = 3;
// ৪. সব থেকে বেশি ভিডিও কলে ৫ ক্রেডিট
export const VIDEO_CALL_CREDIT_COST = 5;

// Backward-compatible aliases
export const CALL_CREDIT_COST = AUDIO_CALL_CREDIT_COST;
export const MESSAGE_CREDIT_COST = TEXT_MESSAGE_CREDIT_COST;

class CreditService {
  private credits: number = INITIAL_GUEST_CREDITS;
  private guestMsgCount: number = 0;
  private isInstalled: boolean = false;
  private totalAdsWatched: number = 0;
  private listeners: Array<(credits: number) => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;
    try {
      const storedCredits = localStorage.getItem(STORAGE_CREDITS_KEY);
      if (storedCredits !== null) {
        this.credits = parseInt(storedCredits, 10) || 0;
      } else {
        this.credits = INITIAL_GUEST_CREDITS;
        localStorage.setItem(STORAGE_CREDITS_KEY, this.credits.toString());
      }

      const storedMsgCount = localStorage.getItem(STORAGE_GUEST_MSG_KEY);
      if (storedMsgCount !== null) {
        this.guestMsgCount = parseInt(storedMsgCount, 10) || 0;
      }

      const storedInstalled = localStorage.getItem(STORAGE_INSTALLED_KEY);
      this.isInstalled = storedInstalled === 'true';

      const storedAdsWatched = localStorage.getItem(STORAGE_ADS_WATCHED_KEY);
      if (storedAdsWatched !== null) {
        this.totalAdsWatched = parseInt(storedAdsWatched, 10) || 0;
      }
    } catch (e) {
      console.warn('Could not initialize credit service:', e);
    }
  }

  public getCredits(): number {
    return this.credits;
  }

  public getGuestMessageCount(): number {
    return this.guestMsgCount;
  }

  public getIsInstalled(): boolean {
    return this.checkIsAppInstalled();
  }

  public checkIsAppInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    // 1. Running in standalone display mode (Opened from mobile home screen shortcut)
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }
    } catch (_) {}

    // 2. iOS standalone home screen
    if ((window.navigator as any).standalone === true) {
      return true;
    }

    // 3. Android app referrer
    if (typeof document !== 'undefined' && document.referrer && document.referrer.startsWith('android-app://')) {
      return true;
    }

    // 4. Stored flag in localStorage
    try {
      if (localStorage.getItem(STORAGE_INSTALLED_KEY) === 'true' || localStorage.getItem('BONDHU_APP_INSTALLED_FLAG_V1') === 'true') {
        return true;
      }
    } catch (_) {}

    return this.isInstalled;
  }

  public getSmartlink(): string {
    if (typeof window === 'undefined') return DEFAULT_ADSTERRA_SMARTLINK;
    try {
      const stored = localStorage.getItem(STORAGE_SMARTLINK_KEY);
      if (stored && stored.trim() && stored.trim().startsWith('http')) {
        return stored.trim();
      }
    } catch (_) {}
    return DEFAULT_ADSTERRA_SMARTLINK;
  }

  public setSmartlink(url: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_SMARTLINK_KEY, url.trim());
    }
  }

  public getTotalAdsWatched(): number {
    return this.totalAdsWatched;
  }

  public setIsInstalled(val: boolean): void {
    this.isInstalled = val;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_INSTALLED_KEY, val ? 'true' : 'false');
        localStorage.setItem('BONDHU_APP_INSTALLED_FLAG_V1', val ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('bondhu-app-installed', { detail: { isInstalled: val } }));
      } catch (_) {}
    }
  }

  // Deducts credits if sufficient
  public useCredits(amount: number = 1): boolean {
    if (this.credits >= amount) {
      this.credits -= amount;
      this.saveAndNotify();
      return true;
    }
    return false;
  }

  // Adds reward credits after watching 15s video ad
  public rewardAdCredits(reward: number = AD_REWARD_CREDITS): number {
    this.credits += reward;
    this.totalAdsWatched += 1;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_ADS_WATCHED_KEY, this.totalAdsWatched.toString());
      window.dispatchEvent(new CustomEvent('bondhu-ad-watched', { detail: { count: this.totalAdsWatched } }));
    }
    this.saveAndNotify();
    return this.credits;
  }

  // Increments guest message count (for checking 1-2 free messages limit)
  public recordGuestMessage(): number {
    this.guestMsgCount += 1;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_GUEST_MSG_KEY, this.guestMsgCount.toString());
    }
    return this.guestMsgCount;
  }

  // Reset message count when signed in or purchased
  public resetGuestCount(): void {
    this.guestMsgCount = 0;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_GUEST_MSG_KEY, '0');
    }
  }

  public subscribe(callback: (credits: number) => void): () => void {
    this.listeners.push(callback);
    callback(this.credits);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private saveAndNotify() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_CREDITS_KEY, this.credits.toString());
    }
    this.listeners.forEach(cb => cb(this.credits));
  }
}

export const creditService = new CreditService();
