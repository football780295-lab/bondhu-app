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

      // Check real-time standalone display mode rather than relying on stale localStorage
      this.isInstalled = this.checkIsStandalone();

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

  /**
   * Returns true ONLY if the app is currently running in standalone display mode
   * (opened from the phone's home screen / launcher icon).
   */
  public checkIsStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      // 1. Android/Desktop PWA standalone display mode
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }
      // 2. iOS Safari standalone home screen
      if ((window.navigator as any).standalone === true) {
        return true;
      }
      // 3. Android app / TWA launcher referrer
      if (typeof document !== 'undefined' && document.referrer && document.referrer.startsWith('android-app://')) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  /**
   * Checks whether the app is currently installed.
   * If running in standalone mode, returns true.
   * If in browser and install prompt is available, cleans up stale flags and returns false.
   */
  public checkIsAppInstalled(): boolean {
    if (typeof window === 'undefined') return false;

    // 1. Standalone app is 100% installed right now
    if (this.checkIsStandalone()) {
      return true;
    }

    // 2. If deferredInstallPrompt is present, app is NOT installed on this device
    if ((window as any).deferredInstallPrompt) {
      this.clearStaleInstalledFlag();
      return false;
    }

    // 3. In regular browser, check active session state
    return this.isInstalled;
  }

  /**
   * Cleans up stale localStorage keys if user deleted/uninstalled the app
   */
  public clearStaleInstalledFlag(): void {
    this.isInstalled = false;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_INSTALLED_KEY);
        localStorage.removeItem('BONDHU_APP_INSTALLED_FLAG_V1');
        localStorage.removeItem('BONDHU_INSTALLED_KEY');
        window.dispatchEvent(new CustomEvent('bondhu-app-can-install'));
      } catch (_) {}
    }
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
        if (val) {
          localStorage.setItem(STORAGE_INSTALLED_KEY, 'true');
          localStorage.setItem('BONDHU_APP_INSTALLED_FLAG_V1', 'true');
        } else {
          localStorage.removeItem(STORAGE_INSTALLED_KEY);
          localStorage.removeItem('BONDHU_APP_INSTALLED_FLAG_V1');
          localStorage.removeItem('BONDHU_INSTALLED_KEY');
        }
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

/**
 * Automatically launches an ad/smartlink in Google Chrome on mobile devices.
 * Uses Android Chrome Intent for mobile Chrome, with fallback to standard new tab.
 */
export const openInChrome = (targetUrl?: string): void => {
  if (typeof window === 'undefined') return;
  const url = targetUrl || creditService.getSmartlink();
  const isAndroid = /Android/i.test(navigator.userAgent);

  if (isAndroid) {
    try {
      const cleanUrl = url.replace(/^https?:\/\//, '');
      const chromeIntent = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
      
      const link = document.createElement('a');
      link.href = chromeIntent;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Fallback in case intent is not caught
      setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }, 400);
      return;
    } catch (_) {}
  }

  // iOS / Desktop fallback
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

