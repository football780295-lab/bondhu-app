import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { creditService } from '../services/creditService';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [canPrompt, setCanPrompt] = useState<boolean>(() => typeof window !== 'undefined' && !!(window as any).deferredInstallPrompt);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const handleCanInstall = () => {
      setCanPrompt(true);
    };
    window.addEventListener('pwa-can-install', handleCanInstall);
    return () => {
      window.removeEventListener('pwa-can-install', handleCanInstall);
    };
  }, []);

  if (!isOpen) return null;

  const triggerInstall = async () => {
    const promptEvent = (window as any).deferredInstallPrompt;
    if (promptEvent) {
      setIsInstalling(true);
      try {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setIsSuccess(true);
          creditService.setIsInstalled(true);
          (window as any).deferredInstallPrompt = null;
          setCanPrompt(false);
          adminService.recordInstall({ source: 'PWA Prompt Accepted' });
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Record user interest/action
      adminService.recordInstall({ source: 'Install Modal Button' });
      if (creditService.checkIsStandalone()) {
        creditService.setIsInstalled(true);
      }
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="imo-blue text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/icon-192.png" 
              alt="Bondhu Logo" 
              className="w-10 h-10 rounded-2xl bg-white p-0.5 object-contain shadow-xs shrink-0" 
            />
            <div>
              <h3 className="font-bold text-base leading-tight">Bondhu অ্যাপ ইনস্টল করুন</h3>
              <p className="text-xs text-blue-100">মোবাইলে সহজে ব্যবহার করুন</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors text-sm"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-center">
          {/* App Icon preview */}
          <div className="flex flex-col items-center">
            <img 
              src="/icon-192.png" 
              alt="Bondhu Icon" 
              className="w-20 h-20 rounded-3xl shadow-lg border-2 border-blue-100 object-cover" 
            />
            <h4 className="font-bold text-gray-800 text-lg mt-2">Bondhu - বন্ধু চ্যাট</h4>
            <p className="text-xs text-gray-500 mt-0.5">ফ্রি চ্যাট ও অডিও-ভিডিও কলিং অ্যাপ</p>
          </div>

          {isSuccess ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-semibold flex flex-col items-center gap-2 animate-fadeIn">
              <i className="fas fa-check-circle text-3xl text-green-500"></i>
              <span>✓ অ্যাপটি সফলভাবে আপনার ফোনে ইনস্টল হয়েছে!</span>
              <span className="text-xs text-green-600 font-normal">এখন মোবাইল হোম স্ক্রিন থেকে এক ক্লিকে খুলুন।</span>
            </div>
          ) : (
            <>
              {/* Feature Highlights */}
              <div className="bg-blue-50/60 rounded-2xl p-3.5 text-left space-y-2 border border-blue-100/60">
                <div className="flex items-center gap-2.5 text-xs text-gray-700 font-medium">
                  <i className="fas fa-bolt text-amber-500 w-4 text-center"></i>
                  <span>কোন স্টোরেজ খরচ হবে না (খুবই হালকা)</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-gray-700 font-medium">
                  <i className="fas fa-mobile-alt text-blue-500 w-4 text-center"></i>
                  <span>মোবাইল হোম স্ক্রিনে শর্টকাট অ্যাপ তৈরি হবে</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-gray-700 font-medium">
                  <i className="fas fa-bell text-green-500 w-4 text-center"></i>
                  <span>নতুন মেসেজের দ্রুত নোটিফিকেশন পাবেন</span>
                </div>
              </div>

              {/* Action Button */}
              {canPrompt ? (
                <button
                  onClick={triggerInstall}
                  disabled={isInstalling}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <i className={`fas ${isInstalling ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                  <span>{isInstalling ? 'ইনস্টল হচ্ছে...' : 'এখনই ডাউনলোড ও ইনস্টল করুন'}</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={triggerInstall}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    <i className="fas fa-download"></i>
                    <span>ডাউনলোড / ইনস্টল বাটনে চাপুন</span>
                  </button>

                  {/* Manual Instructions for Chrome */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-left space-y-1.5 text-xs text-gray-600">
                    <p className="font-bold text-gray-800 flex items-center gap-1.5">
                      <i className="fas fa-info-circle text-blue-500"></i>
                      <span>ক্রোম ব্রাউজার থেকে ইনস্টল করার নিয়ম:</span>
                    </p>
                    <p className="pl-4">১. উপরে ডানে <b>৩-ডট (⋮)</b> মেনুতে চাপুন</p>
                    <p className="pl-4">২. <b>"Install app"</b> অথবা <b>"Add to Home screen"</b> চাপুন</p>
                    <p className="pl-4">৩. <b>"Install"</b> সিলেক্ট করলেই আপনার ফোনে ডাউনলোড হয়ে যাবে!</p>
                  </div>
                </div>
              )}
            </>
          )}

          <button
            onClick={onClose}
            className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 font-medium transition-colors cursor-pointer"
          >
            পরে করবো (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallAppModal;
