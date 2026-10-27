import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { creditService } from '../services/creditService';

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
  const [hasTapped, setHasTapped] = useState<boolean>(false);
  const smartlinkUrl = creditService.getSmartlink();

  // Reset tap hint whenever profile or refresh changes
  useEffect(() => {
    setHasTapped(false);
  }, [profile?.id, iframeKey]);

  if (!isOpen || !profile) return null;

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasTapped(false);
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

            {/* Actions: Refresh & Close (NO URL text, 100% clean) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleRefresh}
                className="w-8 h-8 rounded-full bg-slate-700/80 hover:bg-slate-600 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer text-xs"
                title="রিফ্রেশ করুন"
              >
                <i className="fas fa-sync-alt"></i>
              </button>
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

        {/* ================= 2. THE IN-APP BROWSER (NO PLAIN WHITE SCREEN) ================= */}
        <div 
          className="flex-1 w-full bg-slate-950 relative overflow-hidden flex flex-col min-h-0"
          onMouseDown={() => setHasTapped(true)}
          onTouchStart={() => setHasTapped(true)}
        >
          {/* Active Tap-To-Load Hint Overlay (Passes clicks directly through to the iframe) */}
          {!hasTapped && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs p-6 text-center space-y-3 pointer-events-none transition-opacity duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl shadow-xl shadow-blue-500/25 animate-bounce">
                <i className="fas fa-play ml-0.5"></i>
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-sm font-bold text-white">
                  বিজ্ঞাপনটি দেখতে স্ক্রিনে ট্যাপ করুন
                </p>
                <p className="text-xs text-slate-300">
                  যেকোনো জায়গায় চাপ দিলেই বিজ্ঞাপন সরাসরি চালু হবে
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-[11px] font-bold">
                <i className="fas fa-hand-pointer text-[10px] animate-pulse"></i>
                <span>স্ক্রিনে চাপুন</span>
              </span>
            </div>
          )}

          {/* Embedded In-App Browser Frame (Standard Permissions, No Restrictive Sandbox) */}
          <iframe
            id="story-browser-frame"
            key={`${profile.id}-${iframeKey}`}
            src={smartlinkUrl}
            className="w-full h-full border-0 bg-white"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            title={`${profile.name} Story Browser`}
          />
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
