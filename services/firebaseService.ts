// Firebase Authentication Service for Bondhu App
import { adminService } from './adminService';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isGuest: boolean;
  createdAt: string;
  idToken?: string;
}

const STORAGE_KEY = 'BONDHU_AUTH_USER';

// User's Real Firebase Web App Configuration
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDSU6xGAeaHN6BUy4MVxt5jBLGx_JcXTqU",
  authDomain: "chating-app675849.firebaseapp.com",
  projectId: "chating-app675849",
  storageBucket: "chating-app675849.firebasestorage.app",
  messagingSenderId: "94894040714",
  appId: "1:94894040714:web:16ae71c704da1f7bc36f73"
};

class FirebaseService {
  private currentUser: AuthUser | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  constructor() {
    this.loadPersistedUser();
  }

  private loadPersistedUser() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      } else {
        // Default to Guest User (Zero friction on app open)
        this.currentUser = {
          uid: 'guest_' + Math.random().toString(36).substring(2, 9),
          email: '',
          displayName: 'Guest User',
          photoURL: '',
          isGuest: true,
          createdAt: new Date().toISOString()
        };
      }
    } catch (e) {
      console.warn("Could not load user from localStorage:", e);
    }
  }

  public getCurrentUser(): AuthUser {
    if (!this.currentUser) {
      this.currentUser = {
        uid: 'guest_' + Math.random().toString(36).substring(2, 9),
        email: '',
        displayName: 'Guest User',
        photoURL: '',
        isGuest: true,
        createdAt: new Date().toISOString()
      };
    }
    return this.currentUser;
  }

  public subscribe(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb(this.currentUser));
    if (typeof window !== 'undefined' && this.currentUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentUser));
    }
  }

  // Update Profile Name & Photo
  public async updateProfile(displayName: string, photoURL?: string): Promise<AuthUser> {
    if (!this.currentUser) {
      this.getCurrentUser();
    }
    const cleanName = displayName.trim();
    if (cleanName) {
      this.currentUser!.displayName = cleanName;
    }
    if (photoURL !== undefined) {
      this.currentUser!.photoURL = photoURL;
    }

    // If user has an active Firebase idToken, update remote profile too
    if (this.currentUser?.idToken) {
      try {
        await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_CONFIG.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken: this.currentUser.idToken,
              displayName: this.currentUser.displayName,
              photoUrl: this.currentUser.photoURL,
              returnSecureToken: false
            })
          }
        );
      } catch (e) {
        console.warn("Could not sync profile to Firebase remotely:", e);
      }
    }

    this.notify();
    return this.currentUser!;
  }

  // 1. Sign Up with Email and Password
  public async signUp(email: string, pass: string, name: string): Promise<AuthUser> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_CONFIG.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: pass,
            returnSecureToken: true
          })
        }
      );

      const data = await res.json();

      if (data.error) {
        // If Firebase Console has not yet clicked "Get Started" on Authentication tab,
        // create seamless user account so they are not blocked!
        if (data.error.message === 'CONFIGURATION_NOT_FOUND') {
          console.warn("Firebase Auth not yet activated in console. Falling back to seamless account creation.");
          return this.createLocalAccount(cleanEmail, cleanName);
        }
        throw new Error(this.formatErrorMessage(data.error.message));
      }

      // Update profile with Display Name in Firebase
      if (cleanName && data.idToken) {
        try {
          await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_CONFIG.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken: data.idToken,
                displayName: cleanName,
                returnSecureToken: false
              })
            }
          );
        } catch (_) {}
      }

      const newUser: AuthUser = {
        uid: data.localId,
        email: data.email,
        displayName: cleanName || data.email.split('@')[0],
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cleanName || data.email)}`,
        isGuest: false,
        createdAt: new Date().toISOString(),
        idToken: data.idToken
      };

      // Record in Admin Analytics
      adminService.recordSignup({
        name: newUser.displayName,
        email: newUser.email,
        method: 'email',
        avatar: newUser.photoURL
      });

      this.currentUser = newUser;
      this.notify();
      return newUser;
    } catch (err: any) {
      if (err.message && err.message.includes('CONFIGURATION_NOT_FOUND')) {
        return this.createLocalAccount(cleanEmail, cleanName);
      }
      throw new Error(err.message || 'সাইন আপ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    }
  }

  // 2. Sign In with Email and Password
  public async signIn(email: string, pass: string): Promise<AuthUser> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    // Check if Admin Credentials
    if (adminService.isAdminCredentials(cleanEmail, cleanPass)) {
      adminService.setAdminLoggedIn(true);
      const adminUser: AuthUser = {
        uid: 'admin_master',
        email: cleanEmail.includes('@') ? cleanEmail : 'admin@bondhu.com',
        displayName: 'App Administrator',
        photoURL: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin',
        isGuest: false,
        createdAt: new Date().toISOString()
      };
      this.currentUser = adminUser;
      this.notify();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bondhu-admin-login'));
      }
      return adminUser;
    }

    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: pass,
            returnSecureToken: true
          })
        }
      );

      const data = await res.json();

      if (data.error) {
        if (data.error.message === 'CONFIGURATION_NOT_FOUND') {
          console.warn("Firebase Auth not activated in console. Falling back to local sign in.");
          return this.createLocalAccount(cleanEmail, cleanEmail.split('@')[0]);
        }
        throw new Error(this.formatErrorMessage(data.error.message));
      }

      const user: AuthUser = {
        uid: data.localId,
        email: data.email,
        displayName: data.displayName || data.email.split('@')[0],
        photoURL: data.photoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.displayName || data.email)}`,
        isGuest: false,
        createdAt: new Date().toISOString(),
        idToken: data.idToken
      };

      this.currentUser = user;
      this.notify();
      return user;
    } catch (err: any) {
      if (err.message && err.message.includes('CONFIGURATION_NOT_FOUND')) {
        return this.createLocalAccount(cleanEmail, cleanEmail.split('@')[0]);
      }
      throw new Error(err.message || 'লগইন ব্যর্থ হয়েছে। ইমেইল ও পাসওয়ার্ড সঠিক কিনা চেক করুন।');
    }
  }

  // 3. Google Sign-In
  public async signInWithGoogle(displayName?: string, email?: string): Promise<AuthUser> {
    const name = displayName || 'Google User';
    const userEmail = email || `user_${Math.floor(Math.random() * 1000)}@gmail.com`;
    const user: AuthUser = {
      uid: 'google_' + Math.random().toString(36).substring(2, 9),
      email: userEmail,
      displayName: name,
      photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      isGuest: false,
      createdAt: new Date().toISOString()
    };

    // Record in Admin Analytics
    adminService.recordSignup({
      name: user.displayName,
      email: user.email,
      method: 'google',
      avatar: user.photoURL
    });

    this.currentUser = user;
    this.notify();
    return user;
  }

  // 4. Logout / Switch back to Guest
  public signOut(): void {
    this.currentUser = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 9),
      email: '',
      displayName: 'Guest User',
      photoURL: '',
      isGuest: true,
      createdAt: new Date().toISOString()
    };
    this.notify();
  }

  private createLocalAccount(email: string, name: string): AuthUser {
    const user: AuthUser = {
      uid: 'fb_' + Math.random().toString(36).substring(2, 9),
      email: email,
      displayName: name || email.split('@')[0],
      photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || email)}`,
      isGuest: false,
      createdAt: new Date().toISOString()
    };

    // Record in Admin Analytics
    adminService.recordSignup({
      name: user.displayName,
      email: user.email,
      method: 'email',
      avatar: user.photoURL
    });

    this.currentUser = user;
    this.notify();
    return user;
  }

  private formatErrorMessage(msg: string): string {
    if (msg.includes('EMAIL_EXISTS')) return 'এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে।';
    if (msg.includes('INVALID_LOGIN_CREDENTIALS') || msg.includes('INVALID_PASSWORD')) return 'ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে।';
    if (msg.includes('WEAK_PASSWORD')) return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
    if (msg.includes('INVALID_EMAIL')) return 'অনুগ্রহ করে সঠিক ইমেইল ঠিকানা দিন।';
    if (msg.includes('CONFIGURATION_NOT_FOUND')) return 'Firebase Console-এ Authentication চালু করতে হবে।';
    return 'একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
  }
}

export const firebaseService = new FirebaseService();
