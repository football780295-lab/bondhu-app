import React, { useState, useRef } from 'react';
import { Profile } from '../types';
import { creditService, openInChrome } from '../services/creditService';

interface StoryAdModalProps {
  isOpen: boolean;
  profile: Profile | null;
  onClose: () => void;
  onStartChat?: (profile: Profile) => void;
}

const StoryAdModal: React.FC<StoryAdModalProps> = ({
  isOpen,
  profile,
  onClose,
  onStartChat
}) => {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [showChromeToast, setShowChromeToast] = useState<boolean>(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastOpenTimeRef = useRef<number>(0);
  const smartlinkUrl = creditService.getSmartlink();

  if (!isOpen || !profile) return null;

  const handleOpenChrome = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    const now = Date.now();
    if (now - lastOpenTimeRef.current < 1200) return;
    lastOpenTimeRef.current = now;

    openInChrome(smartlinkUrl);
    setShowChromeToast(true);
    setTimeout(() => {
      setShowChromeToast(false);
    }, 2800);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const deltaTime = Date.now() - touchStartRef.current.time;

    if (deltaX < 20 && deltaY < 20 && deltaTime < 450) {
      handleOpenChrome(e);
    }
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIframeKey((prev) => prev + 1);
    const frame = document.getElementById('story-browser-frame') as HTMLIFrameElement;
    if (frame) {
      frame.src = `${smartlinkUrl}${smartlinkUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    }
  };

  const handleStartChat = () => {
    onClose();
    if (onStartChat) {
      onStartChat(profile);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in select-none p-0 sm:p-4"
      onClick={onClose}
    >
      {/* In-App Browser Canvas Container */}
      <div 
        className="w-full h-full sm:h-[94vh] sm:max-w-md bg-slate-900 border-0 sm:border sm:border-slate-700 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= 1. IN-APP STORY BROWSER TOP BAR ================= */}
        <div className="bg-slate-800 text-white border-b border-slate-700 flex flex-col shrink-0 z-30 shadow-md">
          {/* Single Continuous Story Bar (Only for this Profile) */}
          <div className="w-full bg-slate-900 h-1 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 w-full"></div>
          </div>

          <div className="p-2.5 flex items-center justify-between gap-2">
            {/* Profile Avatar & Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img 
                  src={profile.avatar} 
                  alt={profile.name} 
                  className="w-9 h-9 rounded-full object-cover border-2 border-white/50 shadow-xs bg-slate-700"
                />
                {profile.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white truncate leading-tight">
                    {profile.name}
                  </h3>
                  <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                    ✓
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium truncate flex items-center gap-1.5 mt-0.5">
                  <span>২৫ মিনিট আগে</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>অ্যাক্টিভ</span>
                  </span>
                  <span>•</span>
                  <span>{profile.location}</span>
                </p>
              </div>
            </div>

            {/* Actions: Chrome Browser, Refresh & Close (Clean, No URL text) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Dedicated Chrome Button */}
              <button
                onClick={handleOpenChrome}
                className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer text-xs shadow-xs"
                title="ক্রোম ব্রাউজারে খুলুন"
              >
                <i className="fab fa-chrome"></i>
              </button>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                className="w-8 h-8 rounded-full bg-slate-700/80 hover:bg-slate-600 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer text-xs"
                title="রিফ্রেশ করুন"
              >
                <i className="fas fa-sync-alt"></i>
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-700 hover:bg-rose-600 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer text-xs shadow-xs"
                title="স্টোরি বন্ধ করুন"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>

        {/* ================= 2. THE IN-APP BROWSER (DIRECT SMARTLINK LOADING) ================= */}
        <div className="flex-1 w-full bg-white relative overflow-hidden flex flex-col min-h-0">
          <iframe
            id="story-browser-frame"
            key={`${profile.id}-${iframeKey}`}
            src={smartlinkUrl}
            className="w-full h-full border-0 bg-white"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            title={`${profile.name} Story Browser`}
          />

          {/* Automatic Chrome Open: When visitor taps/clicks anywhere on the ad inside this in-app browser */}
          <div
            onClick={handleOpenChrome}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="absolute inset-0 z-10 cursor-pointer bg-transparent"
            title="ক্রোম ব্রাউজারে দেখতে ট্যাপ করুন"
          />

          {/* Toast Notification when Chrome opens */}
          {showChromeToast && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-blue-500/60 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 pointer-events-none animate-fade-in">
              <i className="fab fa-chrome text-blue-400"></i>
              <span>ক্রোম ব্রাউজারে ওপেন হচ্ছে...</span>
            </div>
          )}
        </div>

        {/* ================= 3. BOTTOM CHAT & ENGAGEMENT BAR ================= */}
        <div className="bg-slate-900 border-t border-slate-800 p-2.5 flex items-center gap-2 shrink-0 z-30">
          <button
            onClick={handleStartChat}
            className="flex-1 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <i className="fas fa-comment-dots text-blue-400"></i>
            <span>{profile.name.split(' ')[0]}-কে মেসেজ পাঠান...</span>
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center text-xs border border-slate-700 shrink-0 cursor-pointer"
            title="বন্ধ করুন"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryAdModal;

