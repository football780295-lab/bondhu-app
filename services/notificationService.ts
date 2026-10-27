import { Profile, Message } from '../types';
import { adminService } from './adminService';
import { INITIAL_GREETINGS } from '../constants';
import { creditService } from './creditService';

const STORAGE_LAST_NOTIF_TIME_KEY = 'BONDHU_LAST_NOTIFICATION_TIMESTAMP_V1';
const STORAGE_LAST_PROFILE_INDEX_KEY = 'BONDHU_LAST_NOTIFICATION_PROFILE_INDEX_V1';
const STORAGE_INTERVAL_HOURS_KEY = 'BONDHU_NOTIF_INTERVAL_HOURS_V1';

const DEFAULT_INTERVAL_HOURS = 2; // Every 2 hours

class NotificationService {
  private checkInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    // constructor
  }

  public init() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    // Check on tab focus / visibility change (e.g. user unlocks phone)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkAndTriggerScheduled();
      }
    });

    window.addEventListener('focus', () => {
      this.checkAndTriggerScheduled();
    });

    // Set up check loop (runs every 30 seconds to check if interval elapsed)
    this.checkInterval = setInterval(() => {
      this.checkAndTriggerScheduled();
    }, 30 * 1000);

    // Initial check on startup (after 3 seconds)
    setTimeout(() => {
      this.checkAndTriggerScheduled();
    }, 3000);
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public isPermissionGranted(): boolean {
    return this.isSupported() && Notification.permission === 'granted';
  }

  // Cross-browser user-gesture permission request
  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      let result: NotificationPermission;

      // Handle both modern Promise and older callback syntax
      if (typeof Notification.requestPermission === 'function') {
        try {
          result = await Notification.requestPermission();
        } catch {
          result = await new Promise<NotificationPermission>((resolve) => {
            Notification.requestPermission(resolve);
          });
        }
      } else {
        return false;
      }

      // If granted, ensure service worker is registered & ready
      if (result === 'granted' && 'serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
          await navigator.serviceWorker.ready;
        } catch (_) {}
      }

      // Dispatch event to inform UI
      window.dispatchEvent(
        new CustomEvent('bondhu-notif-permission-changed', {
          detail: { permission: result }
        })
      );

      return result === 'granted';
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return false;
    }
  }

  public getIntervalHours(): number {
    if (typeof window === 'undefined') return DEFAULT_INTERVAL_HOURS;
    const stored = localStorage.getItem(STORAGE_INTERVAL_HOURS_KEY);
    const parsed = stored ? parseFloat(stored) : DEFAULT_INTERVAL_HOURS;
    return isNaN(parsed) || parsed <= 0 ? DEFAULT_INTERVAL_HOURS : parsed;
  }

  public setIntervalHours(hours: number): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_INTERVAL_HOURS_KEY, hours.toString());
    }
  }

  public getLastNotificationTime(): number {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(STORAGE_LAST_NOTIF_TIME_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  public getLastProfileIndex(): number {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(STORAGE_LAST_PROFILE_INDEX_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  // Safe helper to obtain active ServiceWorker registration
  private async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

    try {
      // 1. Try getRegistration first
      const existing = await navigator.serviceWorker.getRegistration();
      if (existing) return existing;

      // 2. Wait for ready with timeout
      const readyReg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))
      ]);
      if (readyReg) return readyReg;

      // 3. Fallback: register /sw.js directly
      return await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      console.warn('Could not get SW registration:', e);
      return null;
    }
  }

  // Robust method to fire notification into the Mobile System Notification Bar (Status Bar Drawer)
  public async showSystemNotification(title: string, body: string, profileId?: string): Promise<boolean> {
    if (!this.isPermissionGranted()) {
      return false;
    }

    try {
      // Tactile feedback: Vibrate phone hardware (Android)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([250, 100, 250]);
        } catch (_) {}
      }

      // Fully-qualified icon URL (prevents Android WebView resolution failures)
      const iconUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/icon-192.png` 
        : '/icon-192.png';

      const notifOptions: any = {
        body,
        icon: iconUrl,
        badge: iconUrl,
        tag: profileId ? `bondhu-msg-${profileId}` : `bondhu-general-${Date.now()}`,
        data: { 
          profileId: profileId || 'p1',
          url: profileId ? `/?chat=${profileId}` : '/'
        },
        vibrate: [300, 150, 300, 150, 300],
        requireInteraction: true, // Remains on Android status bar until swiped or clicked
        renotify: true,
        actions: [
          { action: 'open_chat', title: '💬 চ্যাট করুন' },
          { action: 'close', title: '✕ বাদ দিন' }
        ]
      };

      // 1. Try ServiceWorker Registration (standard Android Notification Bar pathway)
      const reg = await this.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notifOptions);
        return true;
      }

      // 2. Post message to active Service Worker controller
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options: notifOptions
        });
        return true;
      }

      // 3. Standard desktop Notification fallback (wrapped in try/catch for Android Chrome compatibility)
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          new Notification(title, {
            body,
            icon: iconUrl,
            tag: notifOptions.tag
          });
          return true;
        } catch (constrErr) {
          console.warn('Standard Notification constructor failed (expected on Android Chrome):', constrErr);
        }
      }
    } catch (err) {
      console.warn('Error showing system notification:', err);
    }
    return false;
  }

  // Periodic check: if interval has elapsed since last notification, send a new message
  public checkAndTriggerScheduled(): void {
    if (typeof window === 'undefined') return;

    // Send periodic notifications if user granted permission or installed app
    const hasAccess = this.isPermissionGranted() || creditService.getIsInstalled();
    if (!hasAccess) return;

    const intervalMs = this.getIntervalHours() * 60 * 60 * 1000;
    const lastTime = this.getLastNotificationTime();
    const now = Date.now();

    if (lastTime === 0) {
      // First time recording: initialize timer
      localStorage.setItem(STORAGE_LAST_NOTIF_TIME_KEY, now.toString());
      return;
    }

    if (now - lastTime >= intervalMs) {
      this.sendNextProfileNotification();
    }
  }

  // Sends notification from next rotating profile
  public sendNextProfileNotification(force: boolean = false): void {
    const profiles = adminService.getProfiles();
    if (profiles.length === 0) return;

    const currentIndex = this.getLastProfileIndex();
    const nextIndex = (currentIndex + 1) % profiles.length;
    const profile = profiles[nextIndex];

    this.sendNotificationForProfile(profile);

    // Save state
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_LAST_NOTIF_TIME_KEY, Date.now().toString());
      localStorage.setItem(STORAGE_LAST_PROFILE_INDEX_KEY, nextIndex.toString());
    }
  }

  // Core sender for Mobile Notification Bar & In-App
  public async sendNotificationForProfile(profile: Profile, customGreeting?: string): Promise<void> {
    const greetingText =
      customGreeting ||
      adminService.getGreeting(profile.id) ||
      INITIAL_GREETINGS[profile.id] ||
      "Hi! Kemon achen? Kotha bola jabe? ❤️";

    const title = `💬 ${profile.name} আপনাকে মেসেজ পাঠিয়েছেন`;
    const body = greetingText;

    // 1. Record message to chatHistory in localStorage
    if (typeof window !== 'undefined') {
      try {
        const storedHistory = localStorage.getItem('BONDHU_CHAT_HISTORY_V1');
        const history: Record<string, any[]> = storedHistory ? JSON.parse(storedHistory) : {};
        
        const newMsg: Message = {
          id: `notif_${profile.id}_${Date.now()}`,
          senderId: profile.id,
          text: greetingText,
          timestamp: new Date(),
          type: 'text'
        };

        history[profile.id] = [...(history[profile.id] || []), newMsg];
        localStorage.setItem('BONDHU_CHAT_HISTORY_V1', JSON.stringify(history));

        // Set unread status
        const storedUnread = localStorage.getItem('BONDHU_UNREAD_PROFILES_V1');
        const unreadMap = storedUnread ? JSON.parse(storedUnread) : {};
        unreadMap[profile.id] = true;
        localStorage.setItem('BONDHU_UNREAD_PROFILES_V1', JSON.stringify(unreadMap));

        // Dispatch in-app notification event so active tab updates instantly
        window.dispatchEvent(
          new CustomEvent('bondhu-incoming-profile-message', {
            detail: { profile, text: greetingText }
          })
        );
      } catch (e) {
        console.warn('Error saving notification message to chat history:', e);
      }
    }

    // 2. Trigger Real Mobile Device Notification Bar (System Drawer)
    if (this.isPermissionGranted()) {
      await this.showSystemNotification(title, body, profile.id);
    }
  }

  // Welcome system notification immediately fired right after user taps "অনুমতি দিন"
  public async sendWelcomeSystemNotification(): Promise<boolean> {
    const profiles = adminService.getProfiles();
    const profile = profiles[0] || { id: 'p1', name: 'প্রিয়া' };
    const title = `💬 ${profile.name} আপনাকে মেসেজ পাঠিয়েছেন`;
    const body = "হাই! আপনার মোবাইলের নোটিফিকেশন বার সফলভাবে চালু হয়েছে! ❤️";

    return await this.showSystemNotification(title, body, profile.id);
  }

  // Trigger immediate test notification (from Admin Panel or Me tab)
  public async sendTestNotification(): Promise<boolean> {
    const hasPermission = await this.requestPermission();
    if (hasPermission) {
      const profiles = adminService.getProfiles();
      const profile = profiles[0] || { id: 'p1', name: 'প্রিয়া' };
      const title = `💬 ${profile.name} আপনাকে মেসেজ পাঠিয়েছেন`;
      const body = "হাই! এটি আপনার মোবাইলের নোটিফিকেশন বারের টেস্ট মেসেজ! ❤️";
      
      await this.showSystemNotification(title, body, profile.id);
      return true;
    }
    return false;
  }
}

export const notificationService = new NotificationService();
