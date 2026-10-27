import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Profile } from '../types';
import { adminService, UserSignupRecord, AppInstallRecord } from '../services/adminService';
import { creditService } from '../services/creditService';
import { notificationService } from '../services/notificationService';
import VideoAdModal from './VideoAdModal';

interface AdminPanelProps {
  onClose: () => void;
}

// Curated high quality avatars that admin can pick from with 1 click
const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1503104834685-7205e8607eb9?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1520155707335-1e0d88ef33d5?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1491349174775-aaafddd81942?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=400&h=400&auto=format&fit=crop',
];

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profiles' | 'signups' | 'installs' | 'settings'>('dashboard');
  const [profiles, setProfiles] = useState<Profile[]>(() => adminService.getProfiles());
  const [signups, setSignups] = useState<UserSignupRecord[]>(() => adminService.getSignups());
  const [installs, setInstalls] = useState<AppInstallRecord[]>(() => adminService.getInstalls());
  const [adsWatched, setAdsWatched] = useState<number>(() => creditService.getTotalAdsWatched());
  
  // Filter & Search states
  const [profileSearch, setProfileSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');

  // Edit / Add Modal state
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editGreeting, setEditGreeting] = useState('');
  const [isAddMode, setIsAddMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin Credentials form
  const [adminUser, setAdminUser] = useState(() => adminService.getCredentials().username);
  const [adminPass, setAdminPass] = useState(() => adminService.getCredentials().password);
  const [credSaved, setCredSaved] = useState(false);
  const [smartlink, setSmartlink] = useState(() => creditService.getSmartlink());
  const [smartlinkSaved, setSmartlinkSaved] = useState(false);
  const [showTestAdModal, setShowTestAdModal] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedJsonText, setExportedJsonText] = useState('');

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Subscribe to changes
  useEffect(() => {
    const unsubProfiles = adminService.subscribeProfiles((updatedProfiles) => {
      setProfiles(updatedProfiles);
    });
    const unsubStats = adminService.subscribeStats(() => {
      setSignups(adminService.getSignups());
      setInstalls(adminService.getInstalls());
    });

    const handleAdWatched = () => {
      setAdsWatched(creditService.getTotalAdsWatched());
    };
    window.addEventListener('bondhu-ad-watched', handleAdWatched);

    return () => {
      unsubProfiles();
      unsubStats();
      window.removeEventListener('bondhu-ad-watched', handleAdWatched);
    };
  }, []);

  // Filtered Profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchSearch =
        profileSearch === '' ||
        p.name.toLowerCase().includes(profileSearch.toLowerCase()) ||
        p.location.toLowerCase().includes(profileSearch.toLowerCase()) ||
        p.status.toLowerCase().includes(profileSearch.toLowerCase());
      const matchCity = selectedCity === 'All' || p.location.toLowerCase() === selectedCity.toLowerCase();
      return matchSearch && matchCity;
    });
  }, [profiles, profileSearch, selectedCity]);

  // Unique cities list
  const cities = useMemo(() => {
    const set = new Set(profiles.map((p) => p.location));
    return ['All', ...Array.from(set)];
  }, [profiles]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return signups.filter(
      (u) =>
        userSearch === '' ||
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [signups, userSearch]);

  // Open Edit Modal
  const handleEditProfile = (profile: Profile) => {
    setEditingProfile({ ...profile });
    setEditGreeting(adminService.getGreeting(profile.id));
    setIsAddMode(false);
  };

  // Open Add New Profile Modal
  const handleAddNewProfile = () => {
    const newId = 'profile_' + Math.random().toString(36).substring(2, 9);
    setEditingProfile({
      id: newId,
      name: '',
      location: 'Dhaka',
      age: 21,
      avatar: AVATAR_PRESETS[0],
      bio: 'নতুন ফ্রেন্ড খুঁজছি...',
      isOnline: true,
      status: 'Online for friendship ❤️'
    });
    setEditGreeting('Hello! Kemon achen? Kotha bola jay?');
    setIsAddMode(true);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editingProfile.name.trim()) {
      alert('অনুগ্রহ করে প্রোফাইলের নাম দিন।');
      return;
    }

    const targetProfile = { ...editingProfile };
    const targetGreeting = editGreeting;

    if (isAddMode) {
      adminService.addProfile(targetProfile, targetGreeting);
      showToast(`✓ "${targetProfile.name}" নতুন প্রোফাইল তৈরি ও সংরক্ষণ হয়েছে!`);
    } else {
      adminService.updateProfile(targetProfile, targetGreeting);
      showToast(`✓ "${targetProfile.name}" প্রোফাইলের তথ্য ও ছবি সফলভাবে সেভ হয়েছে!`);
    }

    setEditingProfile(null);

    // Immediately trigger cloud sync so all real website visitors receive it right away
    try {
      const syncRes = await adminService.syncToCloud();
      if (syncRes.success) {
        showToast(`✓ "${targetProfile.name}" ছবি লাইভ ক্লাউড ও রিয়েল ওয়েবসাইটে সিঙ্ক হয়েছে!`);
      }
    } catch (_) {}
  };

  // Toggle Online Status
  const handleToggleOnline = (profile: Profile) => {
    const updated = { ...profile, isOnline: !profile.isOnline };
    adminService.updateProfile(updated);
    showToast(`✓ ${profile.name} এখন ${updated.isOnline ? 'অনলাইন' : 'অফলাইন'}`);
  };

  // Delete Profile
  const handleDeleteProfile = (profile: Profile) => {
    if (window.confirm(`আপনি কি নিশ্চিত "${profile.name}" প্রোফাইলটি মুছে ফেলতে চান?`)) {
      adminService.deleteProfile(profile.id);
      showToast(`🗑️ "${profile.name}" প্রোফাইল মুছে ফেলা হয়েছে।`);
    }
  };

  // Reset to default
  const handleResetProfiles = () => {
    if (window.confirm('আপনি কি সকল প্রোফাইল মূল ডিফল্ট অবস্থায় ফিরিয়ে নিতে চান? এতে আপনার কাস্টম এডিট রিসেট হবে।')) {
      adminService.resetProfilesToDefault();
      showToast('✓ সকল প্রোফাইল সফলভাবে রিসেট করা হয়েছে!');
    }
  };

  // Handle local image file upload for profile avatar with auto canvas compression
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingProfile) {
      if (!file.type.startsWith('image/')) {
        alert('অনুগ্রহ করে সঠিক ছবি ফাইল (JPG, PNG, WebP) নির্বাচন করুন।');
        return;
      }
      showToast('ছবি প্রসেস ও সাইজ অপটিমাইজ করা হচ্ছে...');
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const rawUrl = uploadEvent.target?.result as string;
        if (!rawUrl) return;

        const img = new Image();
        img.onload = () => {
          // Auto-compress & scale to square avatar (max 260x260) for fast loading across all visitors
          const maxDim = 260;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.78);
            setEditingProfile((prev) => (prev ? { ...prev, avatar: compressedBase64 } : null));
            showToast('✓ ছবি সফলভাবে অপটিমাইজ ও সিলেক্ট করা হয়েছে!');
          } else {
            setEditingProfile((prev) => (prev ? { ...prev, avatar: rawUrl } : null));
            showToast('✓ ছবি সিলেক্ট করা হয়েছে!');
          }
        };
        img.onerror = () => {
          setEditingProfile((prev) => (prev ? { ...prev, avatar: rawUrl } : null));
          showToast('✓ ছবি সিলেক্ট করা হয়েছে!');
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
      // Reset input value so re-selecting the same file also triggers onChange
      e.target.value = '';
    }
  };

  // Manual Trigger for Live Website Cloud Sync
  const handleManualSyncToCloud = async () => {
    setIsManualSyncing(true);
    showToast('🌐 লাইভ ওয়েবসাইটে পরিবর্তন সিঙ্ক হচ্ছে...');
    const res = await adminService.syncToCloud();
    setIsManualSyncing(false);
    if (res.success) {
      showToast('✓ ' + res.message);
    } else {
      alert(res.message);
    }
  };

  // Open JSON Export Modal
  const handleOpenExportModal = () => {
    const jsonStr = adminService.exportProfilesJson();
    setExportedJsonText(jsonStr);
    setShowExportModal(true);
  };

  // Save Admin Credentials
  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser.trim() || !adminPass.trim()) {
      alert('ইউজারনেম এবং পাসওয়ার্ড খালি রাখা যাবে না।');
      return;
    }
    adminService.updateCredentials(adminUser, adminPass);
    setCredSaved(true);
    showToast('✓ এডমিন ইউজারনেম এবং পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে!');
    setTimeout(() => setCredSaved(false), 3000);
  };

  // Save Adsterra Smartlink
  const handleSaveSmartlink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartlink.trim()) {
      alert('অনুগ্রহ করে ভ্যালিড Smartlink URL দিন।');
      return;
    }
    creditService.setSmartlink(smartlink);
    setSmartlinkSaved(true);
    showToast('✓ Adsterra Smartlink সফলভাবে সংরক্ষিত হয়েছে!');
    setTimeout(() => setSmartlinkSaved(false), 3000);
  };

  // Add dummy test user
  const handleAddTestUser = () => {
    const names = ['সাকিব আল হাসান', 'তানজিনা আক্তার', 'মাহমুদুল হাসান', 'ফারজানা হক', 'আরিফুল ইসলাম'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomEmail = `user_${Math.floor(Math.random() * 9000 + 1000)}@gmail.com`;
    adminService.recordSignup({
      name: randomName,
      email: randomEmail,
      method: 'email'
    });
    showToast(`✓ নতুন সাইন আপ টেস্ট ইউজার "${randomName}" যুক্ত হয়েছে!`);
  };

  // Simulate test install
  const handleSimulateInstall = (platform: 'Android' | 'iOS' | 'Windows') => {
    adminService.recordInstall({
      source: 'Admin Test Simulator',
      platform: platform
    });
    showToast(`✓ ১টি নতুন ${platform} ইনস্টল সফলভাবে যুক্ত হয়েছে!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold animate-bounce border border-emerald-400">
          <i className="fas fa-check-circle text-lg"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-slate-800/90 backdrop-blur-md border-b border-slate-700/80 px-4 py-3 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <img 
            src="/icon-192.png" 
            alt="Bondhu Admin" 
            className="w-10 h-10 rounded-2xl bg-white p-0.5 object-contain shadow-md shadow-blue-500/20 shrink-0" 
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base md:text-lg text-white tracking-wide">
                Bondhu Admin Panel
              </h1>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              অ্যাপের সকল প্রোফাইল, সাইন আপ ও ইনস্টল নিয়ন্ত্রণ প্যানেল
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Back to App */}
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="মূল অ্যাপে ফিরে যান"
          >
            <i className="fas fa-arrow-left"></i>
            <span className="hidden sm:inline">অ্যাপে ফিরে যান</span>
            <span className="sm:hidden">অ্যাপ</span>
          </button>

          {/* Logout */}
          <button
            onClick={() => {
              adminService.setAdminLoggedIn(false);
              onClose();
            }}
            className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 active:scale-95 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            title="এডমিন লগআউট"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span className="hidden sm:inline">লগআউট</span>
          </button>
        </div>
      </header>

      {/* Main Tab Bar */}
      <div className="bg-slate-800/50 border-b border-slate-700/60 px-4 flex gap-1 sm:gap-2 overflow-x-auto horizontal-scroll shrink-0">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="fas fa-chart-line"></i>
          <span>ড্যাশবোর্ড (Dashboard)</span>
        </button>

        <button
          onClick={() => setActiveTab('profiles')}
          className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'profiles'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="fas fa-users-cog"></i>
          <span>প্রোফাইল কাস্টমাইজেশন ({profiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('signups')}
          className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'signups'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="fas fa-user-plus"></i>
          <span>সাইন আপ ইউজার ({signups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('installs')}
          className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'installs'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="fas fa-download"></i>
          <span>অ্যাপ ইনস্টল ({installs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="fas fa-key"></i>
          <span>এডমিন পাসওয়ার্ড ও সেটিংস</span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/90 scroll-container">
        {/* ================= 1. DASHBOARD TAB ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Signups */}
              <div 
                onClick={() => setActiveTab('signups')}
                className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-3xl p-5 shadow-xl relative overflow-hidden cursor-pointer hover:border-blue-500 transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-blue-300">মোট সাইন আপ ইউজার</p>
                    <h3 className="text-3xl font-black text-white mt-1.5">{signups.length}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 text-xl shadow-inner">
                    <i className="fas fa-user-check"></i>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-blue-200">
                  <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    ✓ রেজিস্টার্ড
                  </span>
                  <span>নতুন সাইন আপে রিয়েল-টাইমে বাড়বে</span>
                </div>
              </div>

              {/* Card 2: Installs */}
              <div 
                onClick={() => setActiveTab('installs')}
                className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 border border-emerald-700/50 rounded-3xl p-5 shadow-xl relative overflow-hidden cursor-pointer hover:border-emerald-500 transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-emerald-300">মোট অ্যাপ ইনস্টল</p>
                    <h3 className="text-3xl font-black text-white mt-1.5">{installs.length}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xl shadow-inner">
                    <i className="fas fa-mobile-alt"></i>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-200">
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    📲 PWA & Download
                  </span>
                  <span>মোবাইল ও পিসিতে ইনস্টল</span>
                </div>
              </div>

              {/* Card 3: Profiles */}
              <div 
                onClick={() => setActiveTab('profiles')}
                className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-3xl p-5 shadow-xl relative overflow-hidden cursor-pointer hover:border-purple-500 transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-purple-300">মোট অ্যাক্টিভ প্রোফাইল</p>
                    <h3 className="text-3xl font-black text-white mt-1.5">{profiles.length}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400 text-xl shadow-inner">
                    <i className="fas fa-heart"></i>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-purple-200">
                  <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">
                    কাস্টমাইজেশন রেডি
                  </span>
                  <span>নাম ও ছবি এডিটযোগ্য</span>
                </div>
              </div>

              {/* Card 4: Video Ads Watched */}
              <div className="bg-gradient-to-br from-amber-900/50 to-amber-800/30 border border-amber-700/50 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-amber-300">ভিডিও অ্যাড দেখা হয়েছে</p>
                    <h3 className="text-3xl font-black text-white mt-1.5">{adsWatched} টি</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl shadow-inner">
                    <i className="fas fa-play-circle"></i>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-amber-200">
                  <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    ১৫ সেকেন্ডের অ্যাড
                  </span>
                  <span>ক্রেডিট রিচার্জ কাউন্টার</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-slate-800/70 border border-slate-700 rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm">
                  <i className="fas fa-bolt"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">কুইক অ্যাকশন (Quick Actions)</h4>
                  <p className="text-[11px] text-slate-400">এডমিন কাজের জন্য শর্টকাট বোতাম</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleAddNewProfile}
                  className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <i className="fas fa-plus"></i>
                  <span>নতুন প্রোফাইল যোগ করুন</span>
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('bondhu-trigger-test-welcome'));
                    showToast('✓ ৩টি অটোমেটিক মেসেজ টেস্ট ট্রিগার করা হয়েছে!');
                  }}
                  className="bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="নতুন ইউজার ঢুকলে ৩টি আইডি থেকে পাঠানো মেসেজ টেস্ট করুন"
                >
                  <i className="fas fa-robot"></i>
                  <span>৩টি অটো মেসেজ টেস্ট</span>
                </button>
                <button
                  onClick={async () => {
                    await notificationService.sendTestNotification();
                    showToast('✓ ফোনে ২-ঘণ্টার পুশ নোটিফিকেশন পাঠানো হয়েছে!');
                  }}
                  className="bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="ফোনে ২ ঘণ্টার ব্যবধানে যে পুশ নোটিফিকেশন যাবে তা টেস্ট করুন"
                >
                  <i className="fas fa-bell"></i>
                  <span>২-ঘণ্টার নোটিফিকেশন টেস্ট</span>
                </button>
                <button
                  onClick={handleAddTestUser}
                  className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <i className="fas fa-user-plus"></i>
                  <span>+১ টেস্ট সাইন আপ</span>
                </button>
                <button
                  onClick={() => handleSimulateInstall('Android')}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <i className="fas fa-mobile-alt"></i>
                  <span>+১ টেস্ট ইনস্টল (Android)</span>
                </button>
                <button
                  onClick={handleResetProfiles}
                  className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-undo"></i>
                  <span>ডিফল্ট রিস্টোর</span>
                </button>
              </div>
            </div>

            {/* Split Grid: Recent Signups & Recent Installs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Signups */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm">
                      <i className="fas fa-user-check"></i>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">সাম্প্রতিক সাইন আপ ইউজার</h4>
                      <p className="text-[11px] text-slate-400">অ্যাপে নতুন নিবন্ধিত ইউজারগণ</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('signups')}
                    className="text-xs text-blue-400 hover:underline cursor-pointer"
                  >
                    সব দেখুন ({signups.length}) &rarr;
                  </button>
                </div>

                <div className="space-y-2.5 flex-1">
                  {signups.slice(0, 5).map((user) => (
                    <div
                      key={user.id}
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex items-center justify-between hover:bg-slate-900/90 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`}
                          alt={user.name}
                          className="w-10 h-10 rounded-full border border-blue-500/40 object-cover bg-slate-800"
                        />
                        <div>
                          <h5 className="font-bold text-xs text-white">{user.name}</h5>
                          <p className="text-[11px] text-slate-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                          {user.method}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {new Date(user.createdAt).toLocaleDateString('bn-BD', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {signups.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-6">এখনো কোনো সাইন আপ রেকর্ড হয়নি।</p>
                  )}
                </div>
              </div>

              {/* Recent Installs */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">
                      <i className="fas fa-download"></i>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">সাম্প্রতিক অ্যাপ ইনস্টল</h4>
                      <p className="text-[11px] text-slate-400">PWA এবং ব্রাউজার ইনস্টলেশন লগ</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('installs')}
                    className="text-xs text-emerald-400 hover:underline cursor-pointer"
                  >
                    সব দেখুন ({installs.length}) &rarr;
                  </button>
                </div>

                <div className="space-y-2.5 flex-1">
                  {installs.slice(0, 5).map((inst) => (
                    <div
                      key={inst.id}
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex items-center justify-between hover:bg-slate-900/90 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-sm">
                          <i
                            className={`fas ${
                              inst.platform === 'Android'
                                ? 'fa-robot'
                                : inst.platform === 'iOS'
                                ? 'fa-apple-alt'
                                : 'fa-laptop'
                            }`}
                          ></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-xs text-white">{inst.platform} Device</h5>
                            <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              ইনস্টল সফল
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{inst.source}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-mono">
                          {new Date(inst.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[9px] text-slate-500">
                          {new Date(inst.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {installs.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-6">এখনো কোনো ইনস্টল লগ হয়নি।</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. PROFILES CUSTOMIZATION TAB ================= */}
        {activeTab === 'profiles' && (
          <div className="space-y-5 max-w-7xl mx-auto">
            {/* Header and Controls */}
            {/* Global Cloud Sync Status Banner */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-base shadow-inner">
                  <i className="fas fa-globe"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-white">রিয়েল ওয়েবসাইট গ্লোবাল ক্লাউড সিঙ্ক</h4>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-extrabold border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      লাইভ সক্রিয় (Live Active)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    এডমিন প্যানেলে করা প্রতিটি পরিবর্তন সরাসরি ক্লাউডের মাধ্যমে রিয়েল ওয়েবসাইটের সকল ভিজিটর ও ব্যবহারকারীদের কাছে আপডেট হয়।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={handleManualSyncToCloud}
                  disabled={isManualSyncing}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="সকল পরিবর্তন এখনই রিয়েল ওয়েবসাইটের সকল ব্যবহারকারীদের কাছে লাইভ পাঠান"
                >
                  <i className={`fas fa-sync-alt ${isManualSyncing ? 'fa-spin' : ''}`}></i>
                  <span>{isManualSyncing ? 'সিঙ্ক হচ্ছে...' : 'লাইভ ওয়েবসাইটে সিঙ্ক করুন'}</span>
                </button>
                <button
                  onClick={handleOpenExportModal}
                  className="bg-slate-700/80 hover:bg-slate-600 active:scale-95 text-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="প্রোফাইলের সম্পূর্ণ ডেটা ব্যাকআপ বা কোডে ব্যবহারের জন্য কপি করুন"
                >
                  <i className="fas fa-file-code text-blue-400"></i>
                  <span>কোড ব্যাকআপ / এক্সপোর্ট</span>
                </button>
              </div>
            </div>

            {/* Header and Controls */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>অ্যাপের সকল প্রোফাইল কাস্টমাইজেশন</span>
                  <span className="bg-blue-500/20 text-blue-400 text-xs px-2.5 py-0.5 rounded-full font-extrabold border border-blue-500/30">
                    {profiles.length} টি প্রোফাইল
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  যেকোনো প্রোফাইলের নাম ও ছবি পরিবর্তন করলে তা সাথে সাথে Bondhu অ্যাপের ভেতরে ও লাইভ সাইটে আপডেট হয়ে যাবে।
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={handleAddNewProfile}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <i className="fas fa-user-plus"></i>
                  <span>নতুন প্রোফাইল যোগ করুন</span>
                </button>
                <button
                  onClick={handleResetProfiles}
                  className="bg-slate-700/80 hover:bg-slate-600 active:scale-95 text-slate-300 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-600"
                  title="আগের ডিফল্ট ৪৪টি প্রোফাইলে ফিরিয়ে নিন"
                >
                  <i className="fas fa-undo"></i>
                  <span>ডিফল্ট রিস্টোর</span>
                </button>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  placeholder="নাম, জেলা অথবা স্ট্যাটাস দিয়ে প্রোফাইল খুঁজুন..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                />
                <i className="fas fa-search absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                {profileSearch && (
                  <button
                    onClick={() => setProfileSearch('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">জেলা:</span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs text-white rounded-2xl py-2.5 px-3 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'সকল জেলা (All)' : c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Profile Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProfiles.map((p, idx) => (
                <div
                  key={p.id}
                  className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-4 shadow-xl hover:border-blue-500/50 transition-all flex flex-col justify-between group hover:shadow-blue-500/10"
                >
                  <div>
                    {/* Avatar & Online status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="relative">
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-600 group-hover:border-blue-500 shadow-md bg-slate-700 transition-colors"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = AVATAR_PRESETS[0];
                          }}
                        />
                        <button
                          onClick={() => handleToggleOnline(p)}
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-800 flex items-center justify-center cursor-pointer ${
                            p.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                          }`}
                          title={p.isOnline ? 'অনলাইন (ক্লিক করে অফলাইন করুন)' : 'অফলাইন (ক্লিক করে অনলাইন করুন)'}
                        >
                          <i className="fas fa-circle text-[6px] text-white"></i>
                        </button>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-full border border-slate-800">
                          #{idx + 1}
                        </span>
                        {profiles.findIndex((x) => x.id === p.id) < 3 && (
                          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <i className="fas fa-robot text-[8px]"></i>
                            <span>অটো-মেসেজ ID #{profiles.findIndex((x) => x.id === p.id) + 1}</span>
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.isOnline
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {p.isOnline ? 'Active Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    {/* Name & Details */}
                    <div className="mt-3">
                      <h4 className="font-bold text-sm text-white truncate">{p.name}</h4>
                      <p className="text-[11px] text-blue-400 font-medium flex items-center gap-1 mt-0.5">
                        <i className="fas fa-map-marker-alt text-[9px]"></i>
                        <span>{p.location}, Bangladesh • {p.age} yrs</span>
                      </p>
                      <p className="text-xs text-slate-300 mt-2 line-clamp-2 italic bg-slate-900/40 p-2 rounded-xl border border-slate-800/60">
                        "{p.status}"
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center gap-2">
                    <button
                      onClick={() => handleEditProfile(p)}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <i className="fas fa-edit"></i>
                      <span>এডিট করুন</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(p)}
                      className="w-8 h-8 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 flex items-center justify-center transition-colors cursor-pointer"
                      title="প্রোফাইল মুছে ফেলুন"
                    >
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredProfiles.length === 0 && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-12 text-center text-slate-400">
                <i className="fas fa-user-slash text-4xl mb-3 text-slate-500"></i>
                <p className="text-sm font-semibold">কোনো প্রোফাইল পাওয়া যায়নি।</p>
                <p className="text-xs text-slate-500 mt-1">অন্য কোনো নাম বা জেলা দিয়ে সার্চ করুন।</p>
              </div>
            )}
          </div>
        )}

        {/* ================= 3. USER SIGNUPS TAB ================= */}
        {activeTab === 'signups' && (
          <div className="space-y-5 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>সাইন আপ করা সকল ইউজারের তালিকা</span>
                  <span className="bg-blue-500/20 text-blue-400 text-xs px-2.5 py-0.5 rounded-full font-extrabold border border-blue-500/30">
                    {signups.length} জন ইউজার
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ব্যবহারকারী অ্যাপে সাইন আপ করলে স্বয়ংক্রিয়ভাবে এখানে তালিকাভুক্ত হয়।
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddTestUser}
                  className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-user-plus"></i>
                  <span>+ টেস্ট ইউজার যোগ</span>
                </button>
                <button
                  onClick={() => {
                    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(signups, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute('href', dataStr);
                    downloadAnchor.setAttribute('download', `bondhu_signups_${Date.now()}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    showToast('✓ ইউজার ডাটা ডাউনলোড হয়েছে!');
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer border border-slate-600"
                  title="ইউজার তালিকা এক্সপোর্ট করুন"
                >
                  <i className="fas fa-file-export"></i>
                  <span>JSON এক্সপোর্ট</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="ইউজারের নাম অথবা ইমেইল দিয়ে সার্চ করুন..."
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
              />
              <i className="fas fa-search absolute left-3.5 top-3 text-slate-400 text-xs"></i>
            </div>

            {/* Users Table */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">ইউজার (Name & Avatar)</th>
                      <th className="py-3.5 px-4">ইমেইল ঠিকানা</th>
                      <th className="py-3.5 px-4">সাইন আপ সময়</th>
                      <th className="py-3.5 px-4">মেথড</th>
                      <th className="py-3.5 px-4">স্ট্যাটাস</th>
                      <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${u.name}`}
                              alt={u.name}
                              className="w-8 h-8 rounded-full border border-blue-400/40 bg-slate-700 object-cover"
                            />
                            <div>
                              <span className="font-bold text-white block">{u.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">#{i + 1}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(u.createdAt).toLocaleString('bn-BD', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              u.method === 'google'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            <i className={`fab mr-1 ${u.method === 'google' ? 'fa-google' : 'fa-envelope'}`}></i>
                            {u.method}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              if (window.confirm(`আপনি কি "${u.name}" ইউজার রেকর্ডটি ডিলিট করতে চান?`)) {
                                adminService.deleteSignup(u.id);
                                showToast(`🗑️ ${u.name} ইউজার রেকর্ড মুছে ফেলা হয়েছে।`);
                              }
                            }}
                            className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="ইউজার ডিলিট করুন"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  কোনো ইউজার পাওয়া যায়নি।
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= 4. APP INSTALLS TAB ================= */}
        {activeTab === 'installs' && (
          <div className="space-y-5 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>অ্যাপ ডাউনলোড ও ইনস্টল ট্র্যাকিং</span>
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-extrabold border border-emerald-500/30">
                    {installs.length} বার ইনস্টল হয়েছে
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ব্যবহারকারীরা ব্রাউজার বা PWA প্রম্পট থেকে ফোনে বা পিসিতে অ্যাপ ইনস্টল করলে এখানে রেকর্ড হয়।
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSimulateInstall('Android')}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-mobile-alt"></i>
                  <span>+ টেস্ট ইনস্টল (Android)</span>
                </button>
                <button
                  onClick={() => handleSimulateInstall('iOS')}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer border border-slate-600"
                >
                  <i className="fab fa-apple"></i>
                  <span>+ টেস্ট ইনস্টল (iOS)</span>
                </button>
              </div>
            </div>

            {/* Platform Distribution Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {['Android', 'iOS', 'Windows', 'Other'].map((platform) => {
                const count = installs.filter((i) => i.platform === platform).length;
                return (
                  <div
                    key={platform}
                    className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-center shadow-md"
                  >
                    <div className="text-2xl text-emerald-400 mb-1">
                      <i
                        className={`fas ${
                          platform === 'Android'
                            ? 'fa-robot'
                            : platform === 'iOS'
                            ? 'fa-apple-alt'
                            : platform === 'Windows'
                            ? 'fa-laptop'
                            : 'fa-globe'
                        }`}
                      ></i>
                    </div>
                    <span className="text-xs font-semibold text-slate-300 block">{platform}</span>
                    <span className="text-xl font-black text-white mt-0.5 block">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Installs Timeline Table */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-700/80 bg-slate-900/60 flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  বিস্তারিত ইনস্টলেশন রেকর্ড ({installs.length})
                </span>
                <span className="text-[11px] text-slate-400">রিয়েল-টাইম লগ</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">ইনস্টল আইডি</th>
                      <th className="py-3 px-4">প্ল্যাটফর্ম (Platform)</th>
                      <th className="py-3 px-4">সোর্স (Source)</th>
                      <th className="py-3 px-4">তারিখ ও সময়</th>
                      <th className="py-3 px-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {installs.map((inst, i) => (
                      <tr key={inst.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          #{i + 1} - {inst.id}
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                            <i
                              className={`fas ${
                                inst.platform === 'Android'
                                  ? 'fa-robot'
                                  : inst.platform === 'iOS'
                                  ? 'fa-apple-alt'
                                  : 'fa-laptop'
                              }`}
                            ></i>
                            {inst.platform}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium">{inst.source}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(inst.timestamp).toLocaleString('bn-BD', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              adminService.deleteInstall(inst.id);
                              showToast('🗑️ ইনস্টল লগ মুছে ফেলা হয়েছে।');
                            }}
                            className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="লগ ডিলিট করুন"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. SETTINGS & CREDENTIALS TAB ================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* Admin Credentials Card */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-700">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
                  <i className="fas fa-key"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">এডমিন লগইন ইউজারনেম ও পাসওয়ার্ড</h3>
                  <p className="text-xs text-slate-400">
                    লগইন পেজে এই ইউজারনেম এবং পাসওয়ার্ড দিলেই স্বয়ংক্রিয়ভাবে এডমিন প্যানেল ওপেন হবে।
                  </p>
                </div>
              </div>

              {credSaved && (
                <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <i className="fas fa-check-circle"></i>
                  <span>এডমিন ক্রেডেনশিয়াল সফলভাবে আপডেট হয়েছে!</span>
                </div>
              )}

              <form onSubmit={handleSaveCredentials} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    এডমিন ইউজারনেম (Username / Email)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                      placeholder="যেমন: admin অথবা admin@bondhu.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                    <i className="fas fa-user-shield absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    ডিফল্ট: <code className="text-blue-400">admin</code> অথবা <code className="text-blue-400">admin@bondhu.com</code>
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    এডমিন পাসওয়ার্ড (Password)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      placeholder="পাসওয়ার্ড লিখুন"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                    <i className="fas fa-lock absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    ডিফল্ট: <code className="text-blue-400">admin123</code> (অথবা <code className="text-blue-400">admin</code>)
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 text-white text-xs font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fas fa-save"></i>
                    <span>নতুন ক্রেডেনশিয়াল সেভ করুন</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Adsterra Smartlink & Monetization Card */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-700">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
                  <i className="fas fa-ad"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Adsterra Smartlink ও ইন-অ্যাপ অ্যাড মনিটাইজেশন</h3>
                  <p className="text-xs text-slate-400">
                    কথা বলা ও কল করার ক্রেডিট শেষ হলে ১৫ সেকেন্ডের যে অ্যাড দেখাবে তার Smartlink কনফিগারেশন।
                  </p>
                </div>
              </div>

              {smartlinkSaved && (
                <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <i className="fas fa-check-circle"></i>
                  <span>Adsterra Smartlink সফলভাবে সেভ হয়েছে!</span>
                </div>
              )}

              <form onSubmit={handleSaveSmartlink} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Adsterra Direct / Smartlink URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={smartlink}
                      onChange={(e) => setSmartlink(e.target.value)}
                      placeholder="https://auctionr.org/..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                      required
                    />
                    <i className="fas fa-link absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    বর্তমান সক্রিয় লিঙ্ক: <span className="text-emerald-400 break-all">{smartlink}</span>
                  </span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">মোট অ্যাড দেখা হয়েছে:</span>
                    <span className="font-bold text-amber-400 text-sm">{adsWatched} বার</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">প্রতি অ্যাডে রিওয়ার্ড:</span>
                    <span className="font-bold text-emerald-400">+৩টি কথা বলার ক্রেডিট</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">অ্যাডের সময়সীমা:</span>
                    <span className="font-bold text-blue-400">১৫ সেকেন্ড কাউন্টডাউন</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">পেজ রিডাইরেক্ট:</span>
                    <span className="font-bold text-teal-400">বন্ধ (ইউজার একই পেজে থাকবে)</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white text-xs font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fas fa-save"></i>
                    <span>স্মার্টলিঙ্ক সেভ করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTestAdModal(true)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold py-3 rounded-xl border border-slate-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fas fa-play-circle text-amber-400"></i>
                    <span>১৫ সেকেন্ড অ্যাড টেস্ট করুন</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 2-Hour Notification Configuration Card */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-xl">
                  <i className="fas fa-bell"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">অ্যাপে প্রতি ২ ঘণ্টা পর পর পুশ নোটিফিকেশন</h3>
                  <p className="text-xs text-slate-400">
                    যে সকল ইউজার অ্যাপটি ফোনে ইনস্টল করেছেন, তাদের প্রতি ২ ঘণ্টা পর পর নতুন নতুন প্রোফাইল থেকে নোটিফিকেশন পাঠানো হবে।
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">নোটিফিকেশনের ব্যবধান:</span>
                  <span className="font-bold text-teal-400">প্রতি ২ ঘণ্টা পরপর</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">বার্তা প্রেরক:</span>
                  <span className="font-bold text-blue-400">নতুন নতুন প্রোফাইল (রোটেট করে)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">মেসেজ পাওয়ার পর চ্যাট/কল শর্ত:</span>
                  <span className="font-bold text-amber-400">কথা বলতে ক্রেডিট লাগবে (অ্যাড দেখে নিতে হবে)</span>
                </div>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    await notificationService.sendTestNotification();
                    showToast('✓ ফোনে ২-ঘণ্টার পুশ নোটিফিকেশন পাঠানো হয়েছে!');
                  }}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-98 text-white text-xs font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fas fa-paper-plane"></i>
                  <span>এখনই একটি টেস্ট পুশ নোটিফিকেশন পাঠান</span>
                </button>
              </div>
            </div>

            {/* Data Management Card */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fas fa-database text-blue-400"></i>
                <span>ডাটা ব্যাকআপ ও রিসেট</span>
              </h4>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleResetProfiles}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold py-3 px-4 rounded-xl border border-slate-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fas fa-history text-amber-400"></i>
                  <span>সকল প্রোফাইল ডিফল্টে রিসেট করুন</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("আপনি কি নিশ্চিত সমস্ত সাইন আপ ও ইনস্টল পরিসংখ্যান রিসেট করতে চান?")) {
                      adminService.resetStats();
                      showToast("✓ পরিসংখ্যান রিসেট হয়েছে!");
                    }
                  }}
                  className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold py-3 px-4 rounded-xl border border-rose-500/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fas fa-trash-alt text-rose-400"></i>
                  <span>পরিসংখ্যান রিসেট</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= EDIT / ADD PROFILE MODAL ================= */}
      {editingProfile && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div
            className="bg-slate-800 border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-lg">
                  <i className={`fas ${isAddMode ? 'fa-user-plus' : 'fa-user-edit'}`}></i>
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {isAddMode ? 'নতুন প্রোফাইল যোগ করুন' : `প্রোফাইল কাস্টমাইজেশন: ${editingProfile.name || 'Edit'}`}
                  </h3>
                  <p className="text-[11px] text-blue-100">
                    নাম, ছবি ও স্ট্যাটাস পরিবর্তন করুন (অ্যাপের সাথে লাইভ সিঙ্ক হবে)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingProfile(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProfile} noValidate className="p-5 overflow-y-auto scroll-container space-y-4 flex-1">
              {/* Avatar Preview & Customization */}
              <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={editingProfile.avatar || AVATAR_PRESETS[0]}
                      alt="Avatar Preview"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-md bg-slate-800"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = AVATAR_PRESETS[0];
                      }}
                    />
                    <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 border-slate-900">
                      <i className="fas fa-camera"></i>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-bold text-white block mb-1">
                      প্রোফাইল পিকচার (Avatar)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      নিচের গ্যালারি থেকে ছবি বেছে নিন অথবা নিজের মোবাইল/পিসি থেকে ছবি আপলোড করুন:
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <i className="fas fa-upload"></i>
                        <span>ছবি আপলোড করুন</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageFileUpload}
                      />
                    </div>
                  </div>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    অথবা সরাসরি ছবির লিঙ্ক (Image URL):
                  </label>
                  <input
                    type="text"
                    value={editingProfile.avatar}
                    onChange={(e) => setEditingProfile(prev => prev ? { ...prev, avatar: e.target.value } : null)}
                    placeholder="ছবি আপলোড করুন অথবা লিঙ্ক দিন..."
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Preset Avatar Gallery */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    পছন্দের ছবি সিলেক্ট করুন (One-Click Presets):
                  </span>
                  <div className="flex gap-2 overflow-x-auto horizontal-scroll py-1">
                    {AVATAR_PRESETS.map((presetUrl, idx) => (
                      <img
                        key={idx}
                        src={presetUrl}
                        alt="preset"
                        onClick={() => setEditingProfile(prev => prev ? { ...prev, avatar: presetUrl } : null)}
                        className={`w-11 h-11 rounded-xl object-cover cursor-pointer shrink-0 border-2 transition-all hover:scale-105 ${
                          editingProfile.avatar === presetUrl ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-slate-700 opacity-75 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Name & Age Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">প্রোফাইলের নাম (Name)</label>
                  <input
                    type="text"
                    value={editingProfile.name}
                    onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                    placeholder="যেমন: নিলা চৌধুরী"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white block mb-1">বয়স (Age)</label>
                  <input
                    type="number"
                    min={18}
                    max={65}
                    value={editingProfile.age}
                    onChange={(e) => setEditingProfile({ ...editingProfile, age: parseInt(e.target.value) || 20 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Location & Status Message */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">জেলা / শহর (Location)</label>
                  <input
                    type="text"
                    value={editingProfile.location}
                    onChange={(e) => setEditingProfile({ ...editingProfile, location: e.target.value })}
                    placeholder="যেমন: Dhaka, Chittagong..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white block mb-1">অনলাইন স্ট্যাটাস</label>
                  <select
                    value={editingProfile.isOnline ? 'true' : 'false'}
                    onChange={(e) => setEditingProfile({ ...editingProfile, isOnline: e.target.value === 'true' })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="true">🟢 Online (সক্রিয়)</option>
                    <option value="false">⚪ Offline (নিষ্ক্রিয়)</option>
                  </select>
                </div>
              </div>

              {/* Status Note */}
              <div>
                <label className="text-xs font-bold text-white block mb-1">স্ট্যাটাস মেসেজ (Status Line)</label>
                <input
                  type="text"
                  value={editingProfile.status}
                  onChange={(e) => setEditingProfile({ ...editingProfile, status: e.target.value })}
                  placeholder="যেমন: Feeling lonely tonight... ❤️"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-bold text-white block mb-1">বায়ো (Bio)</label>
                <textarea
                  value={editingProfile.bio}
                  onChange={(e) => setEditingProfile({ ...editingProfile, bio: e.target.value })}
                  rows={2}
                  placeholder="প্রোফাইলের সংক্ষিপ্ত বিবরণ..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* First Greeting Message */}
              <div>
                <label className="text-xs font-bold text-white block mb-1">
                  প্রথম অটো মেসেজ (First Greeting Message)
                </label>
                <textarea
                  value={editGreeting}
                  onChange={(e) => setEditGreeting(e.target.value)}
                  rows={2}
                  placeholder="চ্যাট খুললে এই প্রোফাইল প্রথমে কী মেসেজ দেবে..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  ইউজার যখন এই প্রোফাইলের সাথে চ্যাট উইন্ডো খুলবে তখন এই সম্ভাষণ মেসেজটি পাঠানো হবে।
                </span>
                {editingProfile && profiles.findIndex((x) => x.id === editingProfile.id) < 3 && (
                  <span className="text-[10px] text-purple-300 bg-purple-500/20 border border-purple-500/30 p-2 rounded-lg mt-1.5 block font-medium">
                    🤖 <b>অটো-মেসেজ আইডি:</b> যেহেতু এটি টপ ৩টি প্রোফাইলের একটি, নতুন কোনো ইউজার অ্যাপে ঢুকলে আপনার এই অভিবাদন মেসেজটি সরাসরি স্বয়ংক্রিয়ভাবে তার কাছে চলে যাবে।
                  </span>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2.5 text-xs text-slate-400 hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  বাতিল (Cancel)
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-check"></i>
                  <span>সংরক্ষণ করুন (Save)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Video Ad Modal from Admin Panel */}
      {showTestAdModal && (
        <VideoAdModal
          isOpen={showTestAdModal}
          onClose={() => setShowTestAdModal(false)}
          onRewardReceived={() => {
            setAdsWatched(creditService.getTotalAdsWatched());
            showToast('✓ টেস্ট অ্যাড সফলভাবে সম্পন্ন হয়েছে (+৩ ক্রেডিট যোগ হয়েছে)!');
          }}
          reason="topup"
        />
      )}

      {/* Export Profiles JSON Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900/60 to-slate-800 p-5 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg">
                  <i className="fas fa-file-code"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">প্রোফাইল ডেটা ব্যাকআপ ও কোড এক্সপোর্ট</h3>
                  <p className="text-xs text-slate-400">সকল প্রোফাইলের বর্তমান JSON ডেটা কপি বা ব্যাকআপ রাখুন</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              <p className="text-xs text-slate-300">
                নিচের কোডটি কপি করে আপনি যে কোনো সময় ব্যাকআপ রাখতে পারেন অথবা সরাসরি প্রোফাইলগুলো সংরক্ষণ করতে পারেন:
              </p>
              <textarea
                readOnly
                value={exportedJsonText}
                className="w-full h-80 bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-blue-300 focus:outline-none select-all scroll-container"
              />
            </div>

            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white font-semibold transition-colors cursor-pointer"
              >
                বন্ধ করুন
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(exportedJsonText);
                  showToast('✓ সম্পূর্ণ JSON ডেটা ক্লিপবোর্ডে কপি করা হয়েছে!');
                }}
                className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <i className="fas fa-copy"></i>
                <span>ক্লিপবোর্ডে কপি করুন (Copy JSON)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
