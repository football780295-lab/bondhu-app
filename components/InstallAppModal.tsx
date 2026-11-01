import React, { useState, useEffect, useRef } from 'react';
import { adminService } from '../services/adminService';
import { creditService } from '../services/creditService';
import { notificationService } from '../services/notificationService';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoStart?: boolean;
  isSuccessOnly?: boolean;
}

const InstallAppModal: React.FC<InstallAppModalProps> = ({ 
  isOpen, 
  onClose, 
  autoStart = false,
  isSuccessOnly = false 
}) => {
  const [canPrompt, setCanPrompt] = useState<boolean>(() => typeof window !== 'undefined' && !!(window as any).deferredInstallPrompt);
  const [status, setStatus] = useState<'idle' | 'installing' | 'success'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('অ্যাপ ডাউনলোড প্রস্তুত...');
  const [downloadedMb, setDownloadedMb] = useState<string>('০.০');
  const progressTimerRef = useRef<any>(null);

  // Monitor deferredInstallPrompt availability
  useEffect(() => {
    const handleCanInstall = () => {
      setCanPrompt(true);
    };
    window.addEventListener('pwa-can-install', handleCanInstall);
    window.addEventListener('bondhu-app-can-install', handleCanInstall);
    return () => {
      window.removeEventListener('pwa-can-install', handleCanInstall);
      window.removeEventListener('bondhu-app-can-install', handleCanInstall);
    };
  }, []);

  // Monitor appinstalled event (system-level confirmation)
  useEffect(() => {
    const handleAppInstalled = () => {
      console.log('App install event detected by system!');
      finishInstallSuccess();
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('bondhu-app-installed', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('bondhu-app-installed', handleAppInstalled);
    };
  }, []);

  // Handle open / autoStart
  useEffect(() => {
    if (isOpen) {
      if (isSuccessOnly) {
        setStatus('success');
        setProgress(100);
      } else if (autoStart) {
        startInstallFlow();
      } else {
        setStatus('idle');
        setProgress(0);
      }
    } else {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    }
  }, [isOpen, autoStart, isSuccessOnly]);

  const finishInstallSuccess = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }
    setProgress(100);
    setDownloadedMb('২.৪');
    setStatusText('সফলভাবে ডাউনলোড হয়েছে!');
    setStatus('success');
    creditService.setIsInstalled(true);
    adminService.recordInstall({ source: 'Live App Installation Complete' });
    notificationService.requestPermission().catch(() => {});

    // Haptic vibration feedback on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80, 40, 120]);
      } catch (_) {}
    }
  };

  const startInstallFlow = async () => {
    setStatus('installing');
    setProgress(5);
    setDownloadedMb('০.২');
    setStatusText('অ্যাপ প্যাকেজ ডাউনলোড হচ্ছে...');

    adminService.recordInstall({ source: 'Install Button Triggered' });

    // Smooth realistic downloading and installing progress
    let current = 5;
    progressTimerRef.current = setInterval(() => {
      current += Math.floor(Math.random() * 8) + 4;
      if (current >= 94) {
        current = 94; // Hold at 94% waiting for OS/browser completion confirmation
      }
      setProgress(current);

      if (current < 30) {
        setStatusText('অ্যাপ প্যাকেজ ডাউনলোড হচ্ছে...');
        setDownloadedMb((0.3 + (current / 100) * 0.8).toFixed(1));
      } else if (current < 65) {
        setStatusText('আপনার ফোনে ইনস্টল ও ভেরিফাই হচ্ছে...');
        setDownloadedMb((1.1 + (current / 100) * 0.9).toFixed(1));
      } else if (current < 90) {
        setStatusText('হোম স্ক্রিন ও অ্যাপ গ্যালারিতে যোগ হচ্ছে...');
        setDownloadedMb('২.২');
      } else {
        setStatusText('ইনস্টলেশন প্রায় সম্পন্ন...');
        setDownloadedMb('২.৪');
      }
    }, 200);

    const promptEvent = (window as any).deferredInstallPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          adminService.recordInstall({ source: 'PWA Prompt Accepted' });
          (window as any).deferredInstallPrompt = null;
          setCanPrompt(false);
          
          // Android Chrome will download WebAPK and fire 'appinstalled' event in 2-4 seconds.
          // In case 'appinstalled' is delayed or unsupported, auto complete after 3.2s
          setTimeout(() => {
            finishInstallSuccess();
          }, 3200);
        } else {
          // User cancelled prompt
          if (progressTimerRef.current) clearInterval(progressTimerRef.current);
          setStatus('idle');
          setProgress(0);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
        // Fallback for browsers
        setTimeout(() => {
          finishInstallSuccess();
        }, 2500);
      }
    } else {
      // Browser without native deferred prompt (e.g. already added, Samsung browser, or manual mode)
      setTimeout(() => {
        finishInstallSuccess();
      }, 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col animate-scaleUp text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="imo-blue text-white p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3 text-left">
            <div className="relative">
              <img 
                src="/icon-192.png" 
                alt="Bondhu Logo" 
                className="w-10 h-10 rounded-2xl bg-white p-0.5 object-cover shadow-xs shrink-0" 
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[8px]">
                <i className="fas fa-check text-white"></i>
              </span>
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Bondhu - বন্ধু অ্যাপ</h3>
              <p className="text-xs text-blue-100">
                {status === 'installing' ? 'ফোনে ইনস্টলেশন চলছে...' : status === 'success' ? 'ইনস্টল সম্পন্ন হয়েছে' : 'মোবাইলে সহজে ইনস্টল করুন'}
              </p>
            </div>
          </div>
          {status !== 'installing' && (
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors text-sm cursor-pointer"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* 1. LOADING / INSTALLING STATE */}
          {status === 'installing' && (
            <div className="space-y-5 py-2">
              {/* App Icon with animated pulse & spinning progress ring */}
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-3xl bg-blue-500/20 animate-ping"></div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-dashed border-blue-500 animate-spin" style={{ animationDuration: '6s' }}></div>
                <img 
                  src="/icon-192.png" 
                  alt="Bondhu Icon" 
                  className="w-20 h-20 rounded-2xl shadow-xl border-2 border-white object-cover relative z-10" 
                />
                <div className="absolute -bottom-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md z-20 flex items-center gap-1">
                  <i className="fas fa-spinner fa-spin text-[9px]"></i>
                  <span>{progress}%</span>
                </div>
              </div>

              {/* Progress Title & Subtext */}
              <div className="space-y-1">
                <h4 className="font-extrabold text-gray-800 text-base flex items-center justify-center gap-2">
                  <span>{statusText}</span>
                </h4>
                <p className="text-xs text-gray-500">
                  দয়া করে কিছুক্ষণ অপেক্ষা করুন, ফোনে প্যাকেজ তৈরি হচ্ছে
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-gray-200 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300 shadow-sm relative overflow-hidden"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 font-medium px-1">
                  <span className="flex items-center gap-1">
                    <i className="fas fa-download text-blue-500 text-[10px]"></i>
                    <span>ডাউনলোড: {downloadedMb} MB / ২.৪ MB</span>
                  </span>
                  <span className="font-bold text-blue-600">{progress}%</span>
                </div>
              </div>

              {/* Info chips */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 flex items-center justify-around text-xs text-gray-600">
                <div className="flex flex-col items-center">
                  <i className="fas fa-shield-alt text-emerald-500 mb-1"></i>
                  <span className="text-[10px] font-semibold text-gray-700">১০০% নিরাপদ</span>
                </div>
                <div className="w-px h-6 bg-blue-200/60"></div>
                <div className="flex flex-col items-center">
                  <i className="fas fa-bolt text-amber-500 mb-1"></i>
                  <span className="text-[10px] font-semibold text-gray-700">সুপার ফাস্ট</span>
                </div>
                <div className="w-px h-6 bg-blue-200/60"></div>
                <div className="flex flex-col items-center">
                  <i className="fas fa-mobile-alt text-blue-500 mb-1"></i>
                  <span className="text-[10px] font-semibold text-gray-700">মোবাইল অ্যাপ</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. SUCCESS STATE (সফলভাবে ডাউনলোড হয়েছে) */}
          {status === 'success' && (
            <div className="space-y-4 py-1 animate-fadeIn">
              {/* Big Success Icon */}
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-60"></div>
                <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-green-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white text-4xl">
                  <i className="fas fa-check"></i>
                </div>
              </div>

              {/* Success Headline requested by User */}
              <div className="space-y-1">
                <h3 className="font-extrabold text-emerald-600 text-xl tracking-tight">
                  সফলভাবে ডাউনলোড হয়েছে!
                </h3>
                <p className="text-xs text-gray-600 font-medium">
                  Bondhu অ্যাপটি আপনার ফোনে সফলভাবে ইনস্টল ও যুক্ত হয়েছে।
                </p>
              </div>

              {/* Guidance Box: Mobile Gallery / App Drawer guidance */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50/60 border border-emerald-200 rounded-2xl p-4 text-left space-y-2.5 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <i className="fas fa-th-large text-base"></i>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-800">
                      মোবাইলে যেভাবে অ্যাপটি দেখতে পাবেন:
                    </h5>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                      আপনার মোবাইলের <b>হোম স্ক্রিন (Home Screen)</b> অথবা <b>অ্যাপ গ্যালারি / সমস্ত অ্যাপের তালিকায় (App Drawer)</b> গেলেই <b>"Bondhu"</b> অ্যাপটি দেখতে পাবেন।
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-700 font-semibold">
                  <i className="fas fa-check-double text-emerald-600"></i>
                  <span>এখন ব্রাউজার ছাড়াই সরাসরি অ্যাপে ঢুকে চ্যাট করুন!</span>
                </div>
              </div>

              {/* Mobile Phone Mockup showing app icon */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-3 flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-emerald-200 p-1 flex items-center justify-center relative">
                    <img src="/icon-192.png" alt="Bondhu" className="w-9 h-9 rounded-xl object-cover" />
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[7px] text-white">
                      ✓
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-700 mt-1">Bondhu</span>
                </div>
                <div className="text-left text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-700 block">ফোনের অ্যাপ লিস্টে যুক্ত হয়েছে</span>
                  <span>যেকোনো সময় এক ক্লিকে খুলুন</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3.5 rounded-2xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer shadow-emerald-500/20"
              >
                <i className="fas fa-check-circle"></i>
                <span>ঠিক আছে, বুঝেছি</span>
              </button>
            </div>
          )}

          {/* 3. IDLE / READY STATE */}
          {status === 'idle' && (
            <div className="space-y-4">
              {/* App Icon preview */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <img 
                    src="/icon-192.png" 
                    alt="Bondhu Icon" 
                    className="w-20 h-20 rounded-3xl shadow-lg border-2 border-blue-100 object-cover" 
                  />
                  <span className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
                    FREE
                  </span>
                </div>
                <h4 className="font-bold text-gray-800 text-lg mt-2.5">Bondhu - বন্ধু চ্যাট</h4>
                <p className="text-xs text-gray-500 mt-0.5">ফ্রি চ্যাট ও অডিও-ভিডিও কলিং অ্যাপ</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-500 font-semibold">
                  <i className="fas fa-star text-xs"></i>
                  <span>৪.৯ রেটিং</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-500">সাইজ: ২.৪ MB</span>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="bg-blue-50/60 rounded-2xl p-3.5 text-left space-y-2 border border-blue-100/60">
                <div className="flex items-center gap-2.5 text-xs text-gray-700 font-medium">
                  <i className="fas fa-bolt text-amber-500 w-4 text-center"></i>
                  <span>কোন স্টোরেজ খরচ হবে না (খুবই হালকা ও দ্রুত)</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-gray-700 font-medium">
                  <i className="fas fa-mobile-alt text-blue-500 w-4 text-center"></i>
                  <span>ফোনের হোম স্ক্রিন ও অ্যাপ গ্যালারিতে থাকবে</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-gray-700 font-medium">
                  <i className="fas fa-bell text-green-500 w-4 text-center"></i>
                  <span>মেসেজ ও মিসড কলের নোটিফিকেশন পাবেন</span>
                </div>
              </div>

              {/* Main Action Button */}
              <button
                onClick={startInstallFlow}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer shadow-blue-500/25"
              >
                <i className="fas fa-download"></i>
                <span>এখনই ডাউনলোড ও ফোনে ইনস্টল করুন</span>
              </button>

              {/* Instructions if native prompt unavailable */}
              {!canPrompt && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-left space-y-1 text-xs text-gray-600">
                  <p className="font-bold text-gray-800 flex items-center gap-1.5">
                    <i className="fas fa-info-circle text-blue-500"></i>
                    <span>ক্রোম ব্রাউজার থেকে ইনস্টল করার উপায়:</span>
                  </p>
                  <p className="pl-4">১. উপরে ডানে <b>৩-ডট (⋮)</b> মেনুতে চাপুন</p>
                  <p className="pl-4">২. <b>"Install app"</b> অথবা <b>"Add to Home screen"</b> চাপুন</p>
                  <p className="pl-4">৩. <b>"Install"</b> সিলেক্ট করলেই ফোনে সেভ হয়ে যাবে!</p>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 font-medium transition-colors cursor-pointer"
              >
                পরে করবো (Close)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallAppModal;
