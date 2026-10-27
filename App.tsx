import React, { useState, useMemo, useEffect } from 'react';
import { Profile, Message, CallType } from './types';
import { ALL_PROFILES, INITIAL_GREETINGS } from './constants';
import ChatWindow from './components/ChatWindow';
import CallOverlay from './components/CallOverlay';
import AuthModal from './components/AuthModal';
import EditProfileModal from './components/EditProfileModal';
import InstallAppModal from './components/InstallAppModal';
import AdminPanel from './components/AdminPanel';
import VideoAdModal, { AdModalReason } from './components/VideoAdModal';
import DownloadRequiredModal from './components/DownloadRequiredModal';
import { firebaseService, AuthUser } from './services/firebaseService';
import { adminService } from './services/adminService';
import { 
  creditService, 
  VIDEO_CALL_CREDIT_COST, 
  AUDIO_CALL_CREDIT_COST, 
  VOICE_MESSAGE_CREDIT_COST, 
  TEXT_MESSAGE_CREDIT_COST 
} from './services/creditService';
import { notificationService } from './services/notificationService';

// Safe Image Component to prevent broken icons
const SafeAvatar: React.FC<{ src: string; alt: string; className: string }> = ({ src, alt, className }) => {
  const [error, setError] = useState(false);
  const fallback = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&h=400&auto=format&fit=crop";

  useEffect(() => {
    setError(false);
  }, [src]);

  const targetSrc = !src || error ? fallback : src;

  return (
    <img 
      src={targetSrc} 
      alt={alt} 
      className={className} 
      onError={() => {
        // Only set error if not already on fallback
        if (targetSrc !== fallback) {
          setError(true);
        }
      }}
    />
  );
};

// Mobile device detector: Returns true only for real mobile phones / small touch screens, never for PC/desktops
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua);
  const isSmallScreen = window.innerWidth <= 768;
  return isMobileUA || isSmallScreen;
};

// Safe timestamp formatter to prevent any runtime exceptions
const formatMsgTimestamp = (ts: any): string => {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '';
  }
};

// Pleasant audio chime synthesizer for incoming messages
const playMessageChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.25);

    // Tone 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain2.gain.setValueAtTime(0.14, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (_) {}
};

const App: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('BONDHU_CHAT_HISTORY_V1');
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.keys(parsed).forEach((k) => {
            parsed[k] = parsed[k].map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }));
          });
          return parsed;
        }
      } catch (_) {}
    }
    return {};
  });

  const [unreadProfiles, setUnreadProfiles] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('BONDHU_UNREAD_PROFILES_V1');
        if (stored) return JSON.parse(stored);
      } catch (_) {}
    }
    return {};
  });

  const [incomingBanner, setIncomingBanner] = useState<{
    profile: Profile;
    text: string;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(() => isMobileDevice());

  useEffect(() => {
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeCall, setActiveCall] = useState<{ type: CallType; profile: Profile } | null>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'explore'>('chats');
  const [bottomNav, setBottomNav] = useState<'chats' | 'calls' | 'contacts' | 'me'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('All');

  // Firebase Auth State
  const [authUser, setAuthUser] = useState<AuthUser>(() => firebaseService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Credit & In-App Ads Monetization State
  const [userCredits, setUserCredits] = useState<number>(() => creditService.getCredits());
  const [isVideoAdOpen, setIsVideoAdOpen] = useState(false);
  const [adModalReason, setAdModalReason] = useState<AdModalReason>('topup');
  const [isDownloadRequiredOpen, setIsDownloadRequiredOpen] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(() => creditService.checkIsAppInstalled());

  // Admin Panel State
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(() => adminService.isAdminLoggedIn());
  const [allProfiles, setAllProfiles] = useState<Profile[]>(() => adminService.getProfiles());

  // Mobile Notification Bar Permission & Interval State
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => 
    notificationService.getPermissionStatus()
  );
  const [notifIntervalHours, setNotifIntervalHours] = useState<number>(() => 
    notificationService.getIntervalHours()
  );
  const [notifFeedbackToast, setNotifFeedbackToast] = useState<string | null>(null);

  const handleRequestNotificationPermission = async () => {
    const granted = await notificationService.requestPermission();
    const status = notificationService.getPermissionStatus();
    setNotifPermission(status);
    if (granted) {
      await notificationService.sendWelcomeSystemNotification();
      setNotifFeedbackToast('✅ মোবাইলের নোটিফিকেশন বার চালু হয়েছে! উপরে নোটিফিকেশন চেক করুন।');
      setTimeout(() => setNotifFeedbackToast(null), 4500);
    } else {
      alert('নোটিফিকেশনের অনুমতি দেওয়া হয়নি। অনুগ্রহ করে ফোনের ব্রাউজার সেটিংসে গিয়ে Notifications: Allow করুন।');
    }
  };

  const handleTestSystemNotification = async () => {
    const success = await notificationService.sendTestNotification();
    if (success) {
      setNotifFeedbackToast('🔔 মোবাইলের নোটিফিকেশন বারে টেস্ট পাঠানো হয়েছে! ফোনের উপরের বার নামিয়ে দেখুন।');
      setTimeout(() => setNotifFeedbackToast(null), 4500);
    } else {
      handleRequestNotificationPermission();
    }
  };

  const handleHeaderBellClick = () => {
    if (notifPermission === 'granted') {
      handleTestSystemNotification();
    } else {
      handleRequestNotificationPermission();
    }
  };

  const handleDownloadClick = () => {
    adminService.recordInstall({ source: 'Download Click' });
    const promptEvent = (window as any).deferredInstallPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      promptEvent.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          adminService.recordInstall({ source: 'PWA Prompt Accepted' });
          creditService.setIsInstalled(true);
          setIsAppInstalled(true);
          notificationService.requestPermission();
          (window as any).deferredInstallPrompt = null;
        }
      }).catch(() => {});
    } else {
      setIsInstallModalOpen(true);
    }
  };

  useEffect(() => {
    const unsubAuth = firebaseService.subscribe((user) => {
      if (user) setAuthUser(user);
    });

    // Real-time Profiles subscription from Admin Panel
    const unsubProfiles = adminService.subscribeProfiles((updated) => {
      setAllProfiles(updated);
    });

    const handleWindowProfilesUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setAllProfiles([...e.detail]);
      } else {
        setAllProfiles(adminService.getProfiles());
      }
    };
    window.addEventListener('bondhu-profiles-updated', handleWindowProfilesUpdated);

    // Real-time Credit balance subscription
    const unsubCredits = creditService.subscribe((c) => {
      setUserCredits(c);
    });

    // Check direct admin hash/param on load
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('admin') === 'true' || window.location.hash === '#admin') {
        if (adminService.isAdminLoggedIn()) {
          setIsAdminPanelOpen(true);
        } else {
          setIsAuthModalOpen(true);
        }
      }

      // Track PWA installs & request push permission
      const handleAppInstalled = () => {
        adminService.recordInstall({ source: 'PWA Web App Installed Event' });
        creditService.setIsInstalled(true);
        setIsAppInstalled(true);
        notificationService.requestPermission();
      };
      window.addEventListener('appinstalled', handleAppInstalled);

      const handleCustomInstalled = () => {
        setIsAppInstalled(true);
      };
      window.addEventListener('bondhu-app-installed', handleCustomInstalled);

      // Listen for admin login event
      const handleAdminLogin = () => {
        setIsAdminPanelOpen(true);
      };
      window.addEventListener('bondhu-admin-login', handleAdminLogin);

      // Initialize 2-hour push notification service for installed users
      notificationService.init();

      // Listen for 2-hour background notification messages
      const handleIncomingNotifMsg = (e: any) => {
        const { profile, text } = e.detail || {};
        if (!profile) return;

        setChatHistory((prev) => {
          const stored = localStorage.getItem('BONDHU_CHAT_HISTORY_V1');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              Object.keys(parsed).forEach((k) => {
                parsed[k] = parsed[k].map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
              });
              return parsed;
            } catch (_) {}
          }
          return prev;
        });

        setUnreadProfiles((prev) => ({ ...prev, [profile.id]: true }));
        playMessageChime();

        // Only show floating incoming banner on mobile phones
        if (isMobileDevice()) {
          setIncomingBanner({ profile, text });

          setTimeout(() => {
            setIncomingBanner((curr) => (curr?.profile.id === profile.id ? null : curr));
          }, 5000);
        }
      };
      window.addEventListener('bondhu-incoming-profile-message', handleIncomingNotifMsg);

      // Listen for notification click message from Service Worker
      const handleSWMessage = (event: MessageEvent) => {
        if (event.data?.type === 'BONDHU_OPEN_CHAT' && event.data.profileId) {
          const target = allProfiles.find((p) => p.id === event.data.profileId);
          if (target) {
            openChat(target);
          }
        }
      };
      navigator.serviceWorker?.addEventListener('message', handleSWMessage);

      // Check URL parameters for direct chat link (?chat=profileId)
      const chatProfileId = urlParams.get('chat');
      if (chatProfileId) {
        const target = allProfiles.find((p) => p.id === chatProfileId);
        if (target) {
          openChat(target);
        }
      }

      // Listen for notification permission updates
      const handleNotifPermissionChanged = (e: any) => {
        const status = e.detail?.permission || notificationService.getPermissionStatus();
        setNotifPermission(status);
      };
      window.addEventListener('bondhu-notif-permission-changed', handleNotifPermissionChanged);

      // Periodic background cloud sync check every 45s so all live users automatically receive admin updates
      const cloudSyncInterval = setInterval(() => {
        adminService.fetchCloudProfiles().catch(() => {});
      }, 45000);

      return () => {
        unsubAuth();
        unsubProfiles();
        unsubCredits();
        clearInterval(cloudSyncInterval);
        window.removeEventListener('bondhu-profiles-updated', handleWindowProfilesUpdated);
        window.removeEventListener('appinstalled', handleAppInstalled);
        window.removeEventListener('bondhu-app-installed', handleCustomInstalled);
        window.removeEventListener('bondhu-admin-login', handleAdminLogin);
        window.removeEventListener('bondhu-incoming-profile-message', handleIncomingNotifMsg);
        window.removeEventListener('bondhu-notif-permission-changed', handleNotifPermissionChanged);
        navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      };
    }

    return () => {
      unsubAuth();
      unsubProfiles();
      unsubCredits();
    };
  }, []);

  // Automatic welcome messages: When someone new enters the app, 3 IDs send them messages
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const triggerAutoGreetings = (force: boolean = false) => {
      if (!force) {
        const alreadySent = sessionStorage.getItem('BONDHU_WELCOME_SENT_SESSION');
        const hasMessages = Object.keys(chatHistory).length > 0;
        if (alreadySent && hasMessages) return;
        sessionStorage.setItem('BONDHU_WELCOME_SENT_SESSION', 'true');
      }

      const top3 = allProfiles.slice(0, 3);
      if (top3.length === 0) return;

      const delays = [800, 2400, 4200];
      top3.forEach((profile, idx) => {
        setTimeout(() => {
          const greetingText =
            adminService.getGreeting(profile.id) ||
            INITIAL_GREETINGS[profile.id] ||
            "Hi! কেমন আছেন? বন্ধুত্ব করবেন? ❤️";

          const autoMsg: Message = {
            id: `auto_${profile.id}_${Date.now()}`,
            senderId: profile.id,
            text: greetingText,
            timestamp: new Date(),
            type: 'text'
          };

          setChatHistory((prev) => {
            if (prev[profile.id] && prev[profile.id].length > 0 && !force) return prev;
            const updated = { ...prev, [profile.id]: [autoMsg] };
            try {
              localStorage.setItem('BONDHU_CHAT_HISTORY_V1', JSON.stringify(updated));
            } catch (_) {}
            return updated;
          });

          setUnreadProfiles((prev) => {
            const updated = { ...prev, [profile.id]: true };
            try {
              localStorage.setItem('BONDHU_UNREAD_PROFILES_V1', JSON.stringify(updated));
            } catch (_) {}
            return updated;
          });

          playMessageChime();

          // Only show floating incoming banner on mobile phones
          if (isMobileDevice()) {
            setIncomingBanner({
              profile,
              text: greetingText
            });

            setTimeout(() => {
              setIncomingBanner((curr) => (curr?.profile.id === profile.id ? null : curr));
            }, 4500);
          }
        }, delays[idx]);
      });
    };

    // Auto trigger on initial arrival
    triggerAutoGreetings();

    // Listen for manual test trigger from Admin Panel
    const handleAdminTest = () => {
      triggerAutoGreetings(true);
    };
    window.addEventListener('bondhu-trigger-test-welcome', handleAdminTest);

    return () => {
      window.removeEventListener('bondhu-trigger-test-welcome', handleAdminTest);
    };
  }, [allProfiles]);

  // Total unread messages count
  const totalUnreadCount = useMemo(() => {
    return Object.values(unreadProfiles).filter(Boolean).length;
  }, [unreadProfiles]);

  // Filtered profiles based on search and selected city tab
  const filteredProfiles = useMemo(() => {
    return allProfiles.filter(profile => {
      const matchesSearch = searchQuery.trim() === '' || 
        profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        profile.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        profile.status.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCity = selectedCity === 'All' || profile.location.toLowerCase() === selectedCity.toLowerCase();

      return matchesSearch && matchesCity;
    });
  }, [allProfiles, searchQuery, selectedCity]);

  // Profiles sorted alphabetically for Contacts tab
  const contactProfiles = useMemo(() => {
    return [...filteredProfiles].sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredProfiles]);

  // Sorted profiles for Chats tab so profiles with unread messages or active chats appear at the top
  const chatSortedProfiles = useMemo(() => {
    return [...filteredProfiles].sort((a, b) => {
      const aUnread = unreadProfiles[a.id] ? 1 : 0;
      const bUnread = unreadProfiles[b.id] ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;

      const aHasMsg = (chatHistory[a.id]?.length || 0) > 0 ? 1 : 0;
      const bHasMsg = (chatHistory[b.id]?.length || 0) > 0 ? 1 : 0;
      if (aHasMsg !== bHasMsg) return bHasMsg - aHasMsg;

      return 0;
    });
  }, [filteredProfiles, unreadProfiles, chatHistory]);

  const openChat = (profile: Profile) => {
    setSelectedProfile(profile);

    // Mark as read
    setUnreadProfiles((prev) => {
      if (!prev[profile.id]) return prev;
      const updated = { ...prev };
      delete updated[profile.id];
      try {
        localStorage.setItem('BONDHU_UNREAD_PROFILES_V1', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    if (incomingBanner?.profile.id === profile.id) {
      setIncomingBanner(null);
    }

    if (!chatHistory[profile.id] || chatHistory[profile.id].length === 0) {
      const initialMessage: Message = {
        id: Math.random().toString(),
        senderId: profile.id,
        text: adminService.getGreeting(profile.id) || INITIAL_GREETINGS[profile.id] || "Hi there!",
        timestamp: new Date(),
        type: 'text'
      };
      setChatHistory((prev) => {
        const updated = { ...prev, [profile.id]: [initialMessage] };
        try {
          localStorage.setItem('BONDHU_CHAT_HISTORY_V1', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });
    }
  };

  const handleInitiateCall = (type: CallType, profile: Profile) => {
    // Calling requires credits: Video Call = 5 credits, Audio Call = 3 credits
    const requiredCredits = type === 'video' ? VIDEO_CALL_CREDIT_COST : AUDIO_CALL_CREDIT_COST;
    if (userCredits < requiredCredits) {
      setAdModalReason(type === 'video' ? 'video_call' : 'audio_call');
      setIsVideoAdOpen(true);
      return;
    }

    // Deduct appropriate credits and start call
    creditService.useCredits(requiredCredits);
    setActiveCall({ type, profile });
  };

  const handleSendMessage = (
    text: string, 
    isFromMe: boolean = true, 
    type: 'text' | 'image' | 'voice' = 'text',
    voiceDuration?: number
  ): boolean => {
    if (!selectedProfile) return false;

    if (isFromMe) {
      // 0. Admin has unlimited access for testing
      if (adminService.isAdminLoggedIn()) {
        // bypass limits
      }
      // 1. Guest Mode: Allow 1 initial trial message, then prompt app download & sign in
      else if (authUser.isGuest && !creditService.getIsInstalled()) {
        const guestMsgCount = creditService.getGuestMessageCount();
        if (guestMsgCount >= 1) {
          setIsDownloadRequiredOpen(true);
          return false;
        }
        creditService.recordGuestMessage();
      } else {
        // 2. Installed or Signed In User: Check talking credit balance
        // Voice Message costs 2 credits, Text Message costs only 1 credit
        const cost = type === 'voice' ? VOICE_MESSAGE_CREDIT_COST : TEXT_MESSAGE_CREDIT_COST;
        if (userCredits < cost) {
          setAdModalReason(type === 'voice' ? 'voice_message' : 'message');
          setIsVideoAdOpen(true);
          return false;
        }
        creditService.useCredits(cost);
      }
    }

    const newMessage: Message = {
      id: Math.random().toString(),
      senderId: isFromMe ? 'me' : selectedProfile.id,
      text,
      timestamp: new Date(),
      type,
      voiceDuration
    };
    setChatHistory(prev => {
      const updated = {
        ...prev,
        [selectedProfile.id]: [...(prev[selectedProfile.id] || []), newMessage]
      };
      try {
        localStorage.setItem('BONDHU_CHAT_HISTORY_V1', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    return true;
  };

  if (isAdminPanelOpen) {
    return (
      <AdminPanel 
        onClose={() => {
          setIsAdminPanelOpen(false);
          setAllProfiles(adminService.getProfiles());
        }} 
      />
    );
  }

  if (activeCall) {
    return <CallOverlay profile={activeCall.profile} type={activeCall.type} onEnd={() => setActiveCall(null)} />;
  }

  if (selectedProfile) {
    return (
      <>
        <ChatWindow 
          profile={selectedProfile} 
          messages={chatHistory[selectedProfile.id] || []}
          onSendMessage={(text, isFromMe, type, voiceDuration) => handleSendMessage(text, isFromMe, type, voiceDuration)}
          onBack={() => setSelectedProfile(null)}
          onCall={(type) => handleInitiateCall(type, selectedProfile)}
          credits={userCredits}
          onOpenAdModal={() => {
            setAdModalReason('topup');
            setIsVideoAdOpen(true);
          }}
        />

        {/* 15-Second Rewarded Video Ad Modal */}
        <VideoAdModal
          isOpen={isVideoAdOpen}
          onClose={() => setIsVideoAdOpen(false)}
          reason={adModalReason}
          onRewardReceived={(newBalance) => {
            setUserCredits(newBalance);
          }}
        />

        {/* Download Required Modal */}
        <DownloadRequiredModal
          isOpen={isDownloadRequiredOpen}
          onClose={() => setIsDownloadRequiredOpen(false)}
          onDownloadAndLogin={() => {
            creditService.setIsInstalled(true);
            creditService.resetGuestCount();
            setIsDownloadRequiredOpen(false);
            setIsInstallModalOpen(true);
            setTimeout(() => {
              setIsAuthModalOpen(true);
            }, 800);
          }}
        />

        {/* Install App Modal */}
        <InstallAppModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
        />

        {/* Auth Modal for Login / Sign Up */}
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          onSuccess={(user) => {
            setAuthUser(user);
            creditService.resetGuestCount();
          }} 
          onAdminLogin={() => setIsAdminPanelOpen(true)}
        />
      </>
    );
  }

  const profilesToRender =
    activeTab === 'contacts'
      ? contactProfiles
      : activeTab === 'chats'
      ? chatSortedProfiles
      : filteredProfiles;

  return (
    <div 
      className="flex flex-col h-full h-[100dvh] max-h-[100dvh] w-full max-w-md mx-auto bg-white shadow-2xl border-x border-gray-100 overflow-hidden relative"
      style={{ height: '100dvh', maxHeight: '100dvh' }}
    >
      {/* Floating Incoming Message Toast Banner (Only rendered on Mobile Phones) */}
      {isMobile && incomingBanner && !selectedProfile && (
        <div 
          onClick={() => {
            openChat(incomingBanner.profile);
            setIncomingBanner(null);
          }}
          className="absolute top-3 left-3 right-3 z-50 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-blue-400/50 flex items-center gap-3 cursor-pointer animate-fade-in transition-all hover:scale-[1.02]"
        >
          <div className="relative shrink-0">
            <SafeAvatar 
              src={incomingBanner.profile.avatar} 
              alt={incomingBanner.profile.name} 
              className="w-11 h-11 rounded-full object-cover border-2 border-emerald-400 shadow-md"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-white truncate flex items-center gap-1.5">
                <span>{incomingBanner.profile.name}</span>
                <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                  নতুন মেসেজ
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">এখনই</span>
            </div>
            <p className="text-xs text-slate-200 truncate mt-0.5 font-medium">
              "{incomingBanner.text}"
            </p>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIncomingBanner(null);
            }}
            className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs shrink-0 cursor-pointer"
            title="বন্ধ করুন"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Notification Toast Message Banner */}
      {notifFeedbackToast && (
        <div className="absolute top-3 left-3 right-3 z-50 bg-emerald-600 text-white text-xs font-bold p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-2 border border-emerald-400 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <i className="fas fa-bell text-white text-sm shrink-0 animate-bounce"></i>
            <span className="truncate">{notifFeedbackToast}</span>
          </div>
          <button 
            onClick={() => setNotifFeedbackToast(null)}
            className="w-5 h-5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center text-xs shrink-0 cursor-pointer"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="imo-blue px-3 py-2 text-white flex flex-col shadow-md shrink-0 z-20">
        <div className="flex justify-between items-center gap-1.5">
          {/* Left: Brand Logo & Unread Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <img 
              src="/icon-192.png" 
              alt="Bondhu Logo" 
              className="w-8 h-8 rounded-full bg-white object-contain shadow-xs border border-white/50 shrink-0" 
            />
            <h1 className="text-xl font-extrabold tracking-tight leading-none">Bondhu</h1>
            {totalUnreadCount > 0 ? (
              <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                <span>{totalUnreadCount}</span>
              </span>
            ) : (
              <span className="bg-white/20 text-[10px] text-blue-100 px-1.5 py-0.5 rounded-full font-medium">
                {filteredProfiles.length}
              </span>
            )}
          </div>

          {/* Right: Actions Cluster (Zero Overlap Guaranteed) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* In-App Talking Credits & Watch 15s Ad Button */}
            <button 
              onClick={() => {
                setAdModalReason('topup');
                setIsVideoAdOpen(true);
              }}
              className="bg-amber-400/20 hover:bg-amber-400/30 active:scale-95 text-amber-300 border border-amber-400/50 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-all shadow-xs"
              title="১৫ সেকেন্ডের অ্যাড দেখে কথা বলার ফ্রি ক্রেডিট নিন"
            >
              <i className="fas fa-coins text-amber-400 text-xs"></i>
              <span>{userCredits}</span>
              <span className="text-[9px] bg-amber-400 text-slate-900 px-1 rounded-full font-black leading-tight">+ফ্রি</span>
            </button>

            {/* Header Login / User */}
            {authUser.isGuest ? (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-white/20 hover:bg-white/30 active:scale-95 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all border border-white/25 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                title="লগইন বা সাইন আপ করুন"
              >
                <i className="fas fa-user-circle text-xs"></i>
                <span>লগইন</span>
              </button>
            ) : (
              <button 
                onClick={() => setBottomNav('me')}
                className="bg-white/20 hover:bg-white/30 text-white pl-1 pr-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 border border-white/20"
                title={authUser.displayName}
              >
                {authUser.photoURL ? (
                  <img src={authUser.photoURL} alt="user" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <i className="fas fa-user-check text-[10px] text-green-300"></i>
                )}
                <span className="max-w-[50px] truncate">{authUser.displayName.split(' ')[0]}</span>
              </button>
            )}

            {/* App Download Button - Hidden when app is installed */}
            {!isAppInstalled && (
              <button 
                onClick={handleDownloadClick}
                className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-xs border border-emerald-400 cursor-pointer"
                title="অ্যাপ ডাউনলোড / ইনস্টল করুন"
              >
                <i className="fas fa-download text-xs"></i>
              </button>
            )}

            {/* Mobile Notification Bar Bell Icon (Sleek, Non-intrusive) */}
            <button
              onClick={handleHeaderBellClick}
              className={`w-7 h-7 rounded-full active:scale-95 flex items-center justify-center shrink-0 cursor-pointer text-xs transition-colors relative shadow-xs ${
                notifPermission === 'granted'
                  ? 'bg-white/25 text-emerald-300 border border-emerald-400/40 hover:bg-white/35'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
              title={
                notifPermission === 'granted'
                  ? 'মোবাইল নোটিফিকেশন চালু আছে (টেস্ট করতে ক্লিক করুন)'
                  : 'মোবাইলের নোটিফিকেশন বার চালু করুন'
              }
            >
              <i className="fas fa-bell"></i>
              {notifPermission !== 'granted' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-blue-600 animate-pulse"></span>
              )}
            </button>

            {/* Search Toggle */}
            <button 
              onClick={() => setIsSearchOpen(prev => !prev)} 
              className={`w-7 h-7 rounded-full active:scale-95 text-white flex items-center justify-center shrink-0 cursor-pointer text-xs transition-colors ${
                isSearchOpen ? 'bg-white text-blue-600' : 'bg-white/15 hover:bg-white/25'
              }`}
              aria-label="Search"
              title="সার্চ ফিল্টার"
            >
              <i className={`fas ${isSearchOpen ? 'fa-times' : 'fa-search'}`}></i>
            </button>

            {/* Reset Filters (Only visible when a filter or search is active) */}
            {(selectedCity !== 'All' || searchQuery !== '') && (
              <button 
                onClick={() => {
                  setSelectedCity('All');
                  setSearchQuery('');
                }}
                className="w-7 h-7 rounded-full bg-rose-500/80 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shrink-0 cursor-pointer text-xs shadow-xs"
                title="ফিল্টার রিসেট করুন"
              >
                <i className="fas fa-sync-alt text-[10px]"></i>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar (Collapsible) */}
        {isSearchOpen && (
          <div className="mt-2.5 relative animate-fadeIn">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="নাম অথবা জেলা (Dhaka, Chittagong) খুঁজুন..."
              className="w-full py-1.5 pl-8 pr-7 text-xs text-gray-800 bg-white rounded-lg focus:outline-none shadow-inner"
              autoFocus
            />
            <i className="fas fa-search absolute left-2.5 top-2 text-gray-400 text-[11px]"></i>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-xs"
              >
                <i className="fas fa-times-circle"></i>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs (Only on main feeds) */}
      {bottomNav !== 'me' && (
        <>
          <div className="flex bg-white border-b border-gray-100 shrink-0 z-10">
            {(['chats', 'contacts', 'explore'] as const).map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-semibold transition-all relative capitalize ${
                  activeTab === tab ? 'imo-blue-text' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 imo-blue"></div>
                )}
              </button>
            ))}
          </div>

          {/* Explore City Filters */}
          {activeTab === 'explore' && (
            <div className="flex gap-2 p-2.5 bg-blue-50/50 border-b border-gray-100 horizontal-scroll shrink-0">
              {['All', 'Dhaka', 'Chittagong', 'Sylhet', 'Comilla', 'Rajshahi', 'Khulna', 'Barisal'].map(city => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCity === city 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </>
      )}



      {/* Main Content Area */}
      {bottomNav === 'me' ? (
        /* Me / Profile & Settings Screen */
        <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 p-4 space-y-4 scroll-container">
          {/* User Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="relative group cursor-pointer"
                onClick={() => setIsEditProfileOpen(true)}
                title="নিজের ছবি পরিবর্তন করুন"
              >
                {authUser.photoURL ? (
                  <img 
                    src={authUser.photoURL} 
                    alt="avatar" 
                    className="w-16 h-16 rounded-full border-2 border-blue-500 shadow-md object-cover bg-blue-50 group-hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full imo-blue text-white flex items-center justify-center text-2xl font-bold shadow-md">
                    <i className="fas fa-user"></i>
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-600 text-white border-2 border-white flex items-center justify-center shadow-sm text-xs">
                  <i className="fas fa-camera"></i>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-800 leading-tight truncate">
                  {authUser.displayName || 'Guest User'}
                </h2>
                {authUser.isGuest ? (
                  <span className="inline-block mt-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    গেস্ট মোড (Guest Mode)
                  </span>
                ) : (
                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">
                    {authUser.email}
                  </p>
                )}
                <p className="text-[11px] text-blue-500 font-medium mt-1">
                  {!authUser.isGuest ? '✓ ভেরিফাইড মেম্বার' : 'লগইন ছাড়াই ফ্রি ব্যবহার করছেন'}
                </p>
              </div>
            </div>

            {/* Edit Profile Button on User Card */}
            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-blue-200 shrink-0 active:scale-95 shadow-2xs cursor-pointer"
              title="Edit Profile"
            >
              <i className="fas fa-user-edit text-xs"></i>
              <span>এডিট</span>
            </button>
          </div>

          {/* Login / Sign Up Banner (Only if Guest) */}
          {authUser.isGuest && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-5 text-white shadow-lg space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0">
                  <i className="fas fa-user-lock"></i>
                </div>
                <div>
                  <h3 className="font-bold text-sm">প্রোফাইল সেভ রাখতে চান?</h3>
                  <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                    লগইন বা সাইন আপ করলে আপনার নাম ও কথোপকথন নিরাপদে সেভ থাকবে।
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full bg-white text-blue-600 font-bold text-xs py-3 rounded-xl shadow-md hover:bg-blue-50 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fas fa-sign-in-alt"></i>
                <span>লগইন বা সাইন আপ করুন (Login / Sign Up)</span>
              </button>
            </div>
          )}

          {/* Account Menu Options */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            {/* Customize Profile Option */}
            <div 
              onClick={() => setIsEditProfileOpen(true)}
              className="p-4 flex items-center justify-between hover:bg-blue-50/60 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                  <i className="fas fa-user-edit"></i>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-800 block">প্রোফাইল কাস্টমাইজ করুন</span>
                  <span className="text-[11px] text-gray-400">নিজের নাম ও ছবি পরিবর্তন করুন</span>
                </div>
              </div>
              <i className="fas fa-chevron-right text-xs text-gray-300"></i>
            </div>

            {/* App Download / Install Option - Hidden when app is installed */}
            {!isAppInstalled && (
              <div 
                onClick={handleDownloadClick}
                className="p-4 flex items-center justify-between hover:bg-emerald-50/60 cursor-pointer transition-colors bg-gradient-to-r from-emerald-50/40 to-blue-50/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm shadow-xs">
                    <i className="fas fa-download"></i>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-800 block">অ্যাপ ডাউনলোড / ইনস্টল করুন</span>
                    <span className="text-[11px] text-gray-500">হোম স্ক্রিনে শর্টকাট অ্যাপ হিসেবে ব্যবহার করুন</span>
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  ডাউনলোড
                </span>
              </div>
            )}

            {/* Admin Panel Option - ONLY visible if admin is secretly authenticated */}
            {adminService.isAdminLoggedIn() && (
              <div 
                onClick={() => setIsAdminPanelOpen(true)}
                className="p-4 flex items-center justify-between hover:bg-slate-100 cursor-pointer transition-colors bg-gradient-to-r from-slate-50 to-indigo-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-sm shadow-xs">
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800 block">এডমিন প্যানেল (Admin Panel)</span>
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-amber-200">
                        ADMIN
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500">প্রোফাইল কাস্টমাইজেশন ও ইউজার ট্র্যাকিং</span>
                  </div>
                </div>
                <i className="fas fa-chevron-right text-xs text-gray-400"></i>
              </div>
            )}



            <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3">
                <i className="fas fa-shield-alt text-green-500 w-5 text-center"></i>
                <span className="text-sm font-medium text-gray-700">Privacy & Security</span>
              </div>
              <i className="fas fa-chevron-right text-xs text-gray-300"></i>
            </div>

            <div 
              onClick={() => {
                if (window.confirm("Are you sure you want to clear chat history?")) {
                  setChatHistory({});
                  setUnreadProfiles({});
                  localStorage.removeItem('BONDHU_CHAT_HISTORY_V1');
                  localStorage.removeItem('BONDHU_UNREAD_PROFILES_V1');
                  sessionStorage.removeItem('BONDHU_WELCOME_SENT_SESSION');
                }
              }}
              className="p-4 flex items-center justify-between hover:bg-red-50 cursor-pointer text-red-500"
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-trash-alt w-5 text-center"></i>
                <span className="text-sm font-medium">Clear Chat History</span>
              </div>
              <i className="fas fa-chevron-right text-xs text-red-300"></i>
            </div>

            {/* Logout Option (If logged in) */}
            {!authUser.isGuest && (
              <div 
                onClick={() => {
                  if (window.confirm("আপনি কি নিশ্চিত লগআউট করতে চান?")) {
                    firebaseService.signOut();
                  }
                }}
                className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer text-gray-700"
              >
                <div className="flex items-center gap-3 text-red-600">
                  <i className="fas fa-power-off w-5 text-center"></i>
                  <span className="text-sm font-medium">লগআউট করুন (Log Out)</span>
                </div>
                <i className="fas fa-sign-out-alt text-xs text-gray-400"></i>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-400 font-medium">Bondhu Messenger v1.0</p>
            <p className="text-[11px] text-gray-300 mt-1">Connected with {allProfiles.length} Friends 🇧🇩</p>
          </div>
        </div>
      ) : (
        /* Main Scrollable Profile List */
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#fafafa] scroll-container">
          {/* Horizontal Status Row */}
          <div className="flex gap-4 p-4 horizontal-scroll border-b border-gray-100 bg-white shrink-0">
            {allProfiles.slice(0, 10).map(p => {
              const hasUnread = !!unreadProfiles[p.id];
              return (
                <div 
                  key={p.id} 
                  onClick={() => openChat(p)}
                  className="flex flex-col items-center gap-1 min-w-[64px] cursor-pointer"
                >
                   <div className={`w-14 h-14 rounded-full border-2 p-0.5 relative transition-all ${
                     hasUnread ? 'border-rose-500 ring-2 ring-rose-400 ring-offset-1 scale-105' : 'border-blue-500'
                   }`}>
                      <SafeAvatar src={p.avatar} alt="status" className="w-full h-full rounded-full object-cover" />
                      {hasUnread ? (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                          !
                        </span>
                      ) : p.isOnline ? (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                      ) : null}
                   </div>
                   <span className={`text-[10px] truncate w-14 text-center ${hasUnread ? 'font-bold text-rose-600' : 'text-gray-600 font-medium'}`}>
                    {p.name.split(' ')[0]}
                   </span>
                </div>
              );
            })}
          </div>

          {/* Profile List Items */}
          {profilesToRender.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
              <i className="fas fa-user-slash text-4xl mb-3 text-gray-300"></i>
              <p className="text-sm font-medium">No IDs found</p>
              <p className="text-xs text-gray-400 mt-1">Try searching another district or name</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {profilesToRender.map((profile, idx) => {
                const lastMsg = chatHistory[profile.id]?.[chatHistory[profile.id].length - 1];
                const isUnread = !!unreadProfiles[profile.id];
                return (
                  <div 
                    key={profile.id}
                    onClick={() => openChat(profile)}
                    className={`flex items-center p-4 cursor-pointer transition-colors ${
                      isUnread 
                        ? 'bg-blue-50/70 hover:bg-blue-100/70 border-l-4 border-blue-600' 
                        : 'bg-white hover:bg-blue-50/40 active:bg-blue-100/50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <SafeAvatar 
                        src={profile.avatar} 
                        alt={profile.name} 
                        className={`w-14 h-14 rounded-full object-cover shadow-sm ${
                          isUnread ? 'border-2 border-rose-500 ring-2 ring-rose-400/40' : 'border border-gray-200'
                        }`} 
                      />
                      {profile.isOnline && (
                        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                      {isUnread && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                          1
                        </span>
                      )}
                    </div>

                    <div className="ml-4 flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <h3 className={`text-base leading-tight truncate ${isUnread ? 'font-extrabold text-gray-900' : 'font-bold text-gray-800'}`}>
                            {profile.name}
                          </h3>
                          {isUnread && (
                            <span className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0 animate-bounce">
                              নতুন মেসেজ
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] shrink-0 ${isUnread ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                          {lastMsg ? (formatMsgTimestamp(lastMsg.timestamp) || `${profile.age} yrs`) : `${profile.age} yrs`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center mt-1 gap-2">
                        <p className={`text-sm truncate ${isUnread ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                          {lastMsg ? lastMsg.text : profile.status}
                        </p>
                        {isUnread ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
                        ) : profile.isOnline && !lastMsg ? (
                          <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                            Online
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                          <i className="fas fa-map-marker-alt text-[9px]"></i>
                          {profile.location}, Bangladesh
                        </p>
                        <span className="text-[10px] text-gray-400">ID #{idx + 1}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="p-6 text-center text-xs text-gray-400">
                <i className="fas fa-check-circle text-blue-400 mr-1"></i>
                Showing all {profilesToRender.length} profiles
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="bg-white border-t border-gray-200 flex justify-around py-2.5 shadow-lg shrink-0 z-20">
        <button 
          onClick={() => {
            setBottomNav('chats');
            setActiveTab('chats');
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors relative ${
            bottomNav === 'chats' ? 'imo-blue-text font-bold' : 'text-gray-400 hover:text-blue-400'
          }`}
        >
          <div className="relative">
            <i className="fas fa-comment-dots text-2xl"></i>
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {totalUnreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Chats</span>
        </button>

        <button 
          onClick={() => {
            setBottomNav('calls');
            setActiveTab('explore');
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            bottomNav === 'calls' ? 'imo-blue-text font-bold' : 'text-gray-400 hover:text-blue-400'
          }`}
        >
          <i className="fas fa-phone-alt text-2xl"></i>
          <span className="text-[10px]">Calls</span>
        </button>

        <button 
          onClick={() => {
            setBottomNav('contacts');
            setActiveTab('contacts');
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            bottomNav === 'contacts' ? 'imo-blue-text font-bold' : 'text-gray-400 hover:text-blue-400'
          }`}
        >
          <i className="fas fa-users text-2xl"></i>
          <span className="text-[10px]">Contacts</span>
        </button>

        <button 
          onClick={() => setBottomNav('me')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            bottomNav === 'me' ? 'imo-blue-text font-bold' : 'text-gray-400 hover:text-blue-400'
          }`}
        >
          <i className="fas fa-user-circle text-2xl"></i>
          <span className="text-[10px]">Me</span>
        </button>
      </div>

      {/* Auth Modal for Login / Sign Up */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={(user) => {
          setAuthUser(user);
          creditService.resetGuestCount();
        }} 
        onAdminLogin={() => setIsAdminPanelOpen(true)}
      />

      {/* Edit Profile Modal (Name and Photo customization) */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={authUser}
      />

      {/* Install App Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* 15-Second Rewarded Video Ad Modal (Same page, 15s countdown, rewards credits) */}
      <VideoAdModal
        isOpen={isVideoAdOpen}
        onClose={() => setIsVideoAdOpen(false)}
        reason={adModalReason}
        onRewardReceived={(newBalance) => {
          setUserCredits(newBalance);
        }}
      />

      {/* Download Required Modal (Appears after 1-2 free guest messages) */}
      <DownloadRequiredModal
        isOpen={isDownloadRequiredOpen}
        onClose={() => setIsDownloadRequiredOpen(false)}
        onDownloadAndLogin={() => {
          setIsDownloadRequiredOpen(false);
          setIsInstallModalOpen(true);
          setTimeout(() => {
            setIsAuthModalOpen(true);
          }, 800);
        }}
      />
    </div>
  );
};

export default App;
