import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { creditService } from '../services/creditService';
import { notificationService } from '../services/notificationService';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoStart?: boolean;
  isSuccessOnly?: boolean;
}

type ModalTab = 'options' | 'guide';

const InstallAppModal: React.FC<InstallAppModalProps> = ({ 
  isOpen, 
  onClose, 
  autoStart = false,
  isSuccessOnly = false 
}) => {
  const [canPrompt, setCanPrompt] = useState<boolean>(
    () => typeof window !== 'undefined' && !!(window as any).deferredInstallPrompt
  );
  const [status, setStatus] = useState<'idle' | 'prompting' | 'installing' | 'success'>('idle');
  const [activeTab, setActiveTab] = useState<ModalTab>('options');
  const [guideBrowser, setGuideBrowser] = useState<'chrome' | 'samsung' | 'iphone'>('chrome');
  const [dismissMessage, setDismissMessage] = useState<string | null>(null);

  // Monitor deferredInstallPrompt availability
  useEffect(() => {
    const checkPrompt = () => {
      if (typeof window !== 'undefined' && (window as any).deferredInstallPrompt) {
        setCanPrompt(true);
      }
    };
    checkPrompt();

    const handleCanInstall = () => setCanPrompt(true);
    window.addEventListener('pwa-can-install', handleCanInstall);
    window.addEventListener('bondhu-app-can-install', handleCanInstall);
    return () => {
      window.removeEventListener('pwa-can-install', handleCanInstall);
      window.removeEventListener('bondhu-app-can-install', handleCanInstall);
    };
  }, []);

  // Monitor genuine appinstalled event from Android / Browser
  useEffect(() => {
    const handleAppInstalled = () => {
      console.log('App install event detected genuinely by system!');
      finishInstallSuccess();
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('bondhu-app-installed', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('bondhu-app-installed', handleAppInstalled);
    };
  }, []);

  // Handle open / props
  useEffect(() => {
    if (isOpen) {
      setDismissMessage(null);
      if (isSuccessOnly || creditService.checkIsStandalone()) {
        setStatus('success');
      } else {
        setStatus('idle');
        setActiveTab('options');
      }
    }
  }, [isOpen, isSuccessOnly]);

  const finishInstallSuccess = () => {
    setStatus('success');
    creditService.setIsInstalled(true);
    adminService.recordInstall({ source: 'Real PWA App Installation Complete' });
    notificationService.requestPermission().catch(() => {});

    // Haptic vibration feedback on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80, 40, 120]);
      } catch (_) {}
    }
  };

  const handleInstallOptionClick = async () => {
    setDismissMessage(null);
    const promptEvent = (window as any).deferredInstallPrompt;

    if (promptEvent) {
      try {
        setStatus('prompting');
        adminService.recordInstall({ source: 'Install Option Triggered' });
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;

        if (choice && choice.outcome === 'accepted') {
          adminService.recordInstall({ source: 'PWA Choice Accepted' });
          (window as any).deferredInstallPrompt = null;
          setCanPrompt(false);
          setStatus('installing');

          // Wait for system installation
          setTimeout(() => {
            finishInstallSuccess();
          }, 3500);
        } else {
          // User dismissed or closed the prompt
          setStatus('idle');
          setDismissMessage('ইনস্টলেশন বাতিল হয়েছে। আপনি নিচের ৩-ডট গাইড দেখে যেকোনো সময় ইনস্টল করতে পারেন।');
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
        setStatus('idle');
        setActiveTab('guide');
      }
    } else {
      // If prompt is not currently available, show the interactive guide
      setActiveTab('guide');
    }
  };

  const handleCreateShortcutClick = async () => {
    // If native prompt is available, it provides "Create shortcut" (as seen in Chrome Image 1)
    if ((window as any).deferredInstallPrompt) {
      handleInstallOptionClick();
    } else {
      setActiveTab('guide');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col animate-scaleUp text-left relative max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white p-0.5 object-cover shadow-sm shrink-0 flex items-center justify-center">
              <img src="/icon-192.png" alt="Bondhu" className="w-full h-full rounded-xl object-cover" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Install and create shortcut</h3>
              <p className="text-[11px] text-blue-100">প্লে-স্টোর ছাড়াই সরাসরি ফোনে যুক্ত করুন</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-sm cursor-pointer"
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* 1. SUCCESS STATE */}
          {status === 'success' && (
            <div className="space-y-4 py-2 text-center animate-fadeIn">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-60"></div>
                <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white text-4xl">
                  <i className="fas fa-check"></i>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-extrabold text-emerald-600 text-xl tracking-tight">
                  সফলভাবে ইনস্টল হয়েছে!
                </h3>
                <p className="text-xs text-gray-600 font-medium">
                  Bondhu অ্যাপটি আপনার ফোনে সফলভাবে যুক্ত হয়েছে।
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <i className="fas fa-mobile-alt text-base"></i>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-800">
                      মোবাইলে যেভাবে অ্যাপটি পাবেন:
                    </h5>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                      আপনার ফোনের <b>হোম স্ক্রিন (Home Screen)</b> অথবা <b>সমস্ত অ্যাপসের তালিকায় (App Drawer)</b> গেলেই <b>Bondhu</b> আইকনটি দেখতে পাবেন।
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-3.5 rounded-2xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <i className="fas fa-check-circle"></i>
                <span>ঠিক আছে, বুঝেছি</span>
              </button>
            </div>
          )}

          {/* 2. PROMPTING / INSTALLING STATE */}
          {(status === 'prompting' || status === 'installing') && (
            <div className="space-y-5 py-4 text-center animate-fadeIn">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-3xl bg-blue-500/20 animate-ping"></div>
                <img 
                  src="/icon-192.png" 
                  alt="Bondhu Icon" 
                  className="w-16 h-16 rounded-2xl shadow-lg border-2 border-white object-cover relative z-10" 
                />
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-gray-800 text-base">
                  {status === 'prompting' ? 'ফোনের স্ক্রিনে অপশন দেখুন' : 'ফোনে ইনস্টল হচ্ছে...'}
                </h4>
                <p className="text-xs text-gray-500">
                  {status === 'prompting' 
                    ? '👉 নিচে ব্রাউজারের পপআপে "Install" বাটনে চাপ দিন!' 
                    : 'দয়া করে কিছুক্ষণ অপেক্ষা করুন...'}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-800 flex items-center gap-2 text-left">
                <i className="fas fa-arrow-down text-blue-600 text-sm animate-bounce shrink-0"></i>
                <span>নিচে ব্রাউজারের <b>"Install"</b> বা <b>"Create shortcut"</b> চাপলেই ফোনে যুক্ত হয়ে যাবে।</span>
              </div>
            </div>
          )}

          {/* 3. IDLE / SELECTION STATE */}
          {status === 'idle' && (
            <div className="space-y-4">
              {/* Dismissed notification if any */}
              {dismissMessage && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                  <i className="fas fa-info-circle text-amber-600 shrink-0"></i>
                  <span>{dismissMessage}</span>
                </div>
              )}

              {/* Tab Switcher */}
              <div className="flex bg-gray-100 p-1 rounded-2xl text-xs font-bold">
                <button
                  onClick={() => setActiveTab('options')}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'options' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className="fas fa-download text-xs"></i>
                  <span>ইনস্টল অপশনসমূহ</span>
                </button>
                <button
                  onClick={() => setActiveTab('guide')}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'guide' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className="fas fa-book-open text-xs"></i>
                  <span>কীভাবে ইনস্টল করবেন?</span>
                </button>
              </div>

              {/* TAB 1: OPTIONS (Matching Image 1) */}
              {activeTab === 'options' && (
                <div className="space-y-3 animate-fadeIn">
                  <p className="text-xs text-gray-500 font-medium">
                    নিচের যেকোনো একটি অপশনে চাপ দিয়ে ফোনে সেভ করুন:
                  </p>

                  {/* Option 1: Install App */}
                  <div
                    onClick={handleInstallOptionClick}
                    className="p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 hover:from-blue-100/70 hover:to-indigo-100/70 border-2 border-blue-200/80 rounded-2xl flex items-center justify-between cursor-pointer transition-all active:scale-98 group shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-white p-1 border border-blue-200 shadow-xs flex items-center justify-center">
                          <img src="/icon-192.png" alt="Bondhu" className="w-10 h-10 rounded-xl object-cover" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 text-white rounded-full border border-white flex items-center justify-center text-[9px] shadow-xs">
                          <i className="fas fa-arrow-down"></i>
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-sm">Install (অ্যাপ হিসেবে ইনস্টল)</h4>
                          <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            প্রস্তাবিত
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          ফুল-স্ক্রিন অ্যাপ হিসেবে ফোনের অ্যাপ গ্যালারিতে সেভ হবে
                        </p>
                      </div>
                    </div>
                    <i className="fas fa-chevron-right text-gray-400 group-hover:text-blue-600 text-sm transition-colors"></i>
                  </div>

                  {/* Option 2: Create Shortcut */}
                  <div
                    onClick={handleCreateShortcutClick}
                    className="p-3.5 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-2xl flex items-center justify-between cursor-pointer transition-all active:scale-98 group shadow-2xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-white p-1 border border-gray-200 shadow-xs flex items-center justify-center">
                          <img src="/icon-192.png" alt="Bondhu" className="w-10 h-10 rounded-xl object-cover" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 text-white rounded-full border border-white flex items-center justify-center text-[9px] shadow-xs">
                          <i className="fab fa-chrome"></i>
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">Create shortcut (হোম শর্টকাট)</h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          হোম স্ক্রিন থেকে ১-ক্লিকে ব্রাউজার ছাড়াই সরাসরি খুলবে
                        </p>
                      </div>
                    </div>
                    <i className="fas fa-chevron-right text-gray-400 group-hover:text-gray-700 text-sm transition-colors"></i>
                  </div>

                  {/* Safety & Storage Perks */}
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-around text-[11px] text-gray-600">
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <i className="fas fa-shield-alt text-emerald-500"></i> ১০০% নিরাপদ
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1 font-semibold text-blue-700">
                      <i className="fas fa-bolt text-amber-500"></i> মাত্র ২.৪ MB
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1 font-semibold text-purple-700">
                      <i className="fas fa-ban text-red-500"></i> প্লে-স্টোর ছাড়াই
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: STEP-BY-STEP VISUAL GUIDE */}
              {activeTab === 'guide' && (
                <div className="space-y-3 animate-fadeIn text-xs">
                  {/* Browser selector pills */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setGuideBrowser('chrome')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        guideBrowser === 'chrome' ? 'bg-blue-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Google Chrome
                    </button>
                    <button
                      onClick={() => setGuideBrowser('samsung')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        guideBrowser === 'samsung' ? 'bg-blue-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Samsung / Xiaomi
                    </button>
                    <button
                      onClick={() => setGuideBrowser('iphone')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        guideBrowser === 'iphone' ? 'bg-blue-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      iPhone Safari
                    </button>
                  </div>

                  {guideBrowser === 'chrome' && (
                    <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-3">
                      <h5 className="font-bold text-gray-800 flex items-center gap-2">
                        <i className="fab fa-chrome text-blue-600 text-sm"></i>
                        <span>ক্রোম (Chrome) থেকে ইনস্টল করার ৩টি সহজ ধাপ:</span>
                      </h5>
                      <div className="space-y-2 text-gray-700">
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">১</span>
                          <p>ব্রাউজারের উপরে ডানদিকের <b>৩-ডট (⋮) মেনুতে</b> চাপুন।</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">২</span>
                          <p>মেনু থেকে <b>"Install app"</b> অথবা <b>"Add to Home screen"</b> সিলেক্ট করুন।</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">৩</span>
                          <p>পপআপে <b>"Install"</b> বা <b>"Add"</b> চাপুন — সাথে সাথে অ্যাপটি ফোনে ইনস্টল হয়ে যাবে!</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {guideBrowser === 'samsung' && (
                    <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-3">
                      <h5 className="font-bold text-gray-800 flex items-center gap-2">
                        <i className="fas fa-mobile-screen text-purple-600 text-sm"></i>
                        <span>Samsung / Xiaomi / Vivo ব্রাউজারে নিয়ম:</span>
                      </h5>
                      <div className="space-y-2 text-gray-700">
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">১</span>
                          <p>ব্রাউজারের নিচের বা উপরের <b>মেনু (☰ বা ⋮)</b> চাপুন।</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">২</span>
                          <p><b>"Add page to"</b> অথবা <b>"Add to Home screen"</b> চাপুন।</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">৩</span>
                          <p><b>"Home screen"</b> সিলেক্ট করলেই ফোনে শর্টকাট অ্যাপ তৈরি হয়ে যাবে!</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {guideBrowser === 'iphone' && (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                      <h5 className="font-bold text-gray-800 flex items-center gap-2">
                        <i className="fab fa-apple text-gray-800 text-sm"></i>
                        <span>আইফোন (Safari) থেকে ইনস্টল নিয়ম:</span>
                      </h5>
                      <div className="space-y-2 text-gray-700">
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">১</span>
                          <p>সাফারির নিচের মাঝখানের <b>Share (শেয়ার) আইকনে</b> চাপুন।</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">২</span>
                          <p>মেনু থেকে স্ক্রোল করে <b>"Add to Home Screen"</b> এ চাপুন।</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">৩</span>
                          <p>উপরে <b>"Add"</b> চাপলেই আইফোনের হোম স্ক্রিনে অ্যাপ এসে যাবে!</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveTab('options')}
                    className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer shadow-xs"
                  >
                    ইনস্টল অপশনে ফিরে যান
                  </button>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 font-medium transition-colors cursor-pointer text-center block"
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
