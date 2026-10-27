import React, { useState } from 'react';
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
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const smartlinkUrl = creditService.getSmartlink();

  if (!isOpen || !profile) return null;

  const handleOpenExternal = () => {
    if (typeof window !== 'undefined') {
      window.open(smartlinkUrl, '_blank', 'noopener,noreferrer');
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in p-0 sm:p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full h-full sm:h-[94vh] sm:max-w-md bg-slate-900 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col relative border-0 sm:border sm:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= 1. STORY HEADER BAR ================= */}
        <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-3 flex flex-col gap-2 shrink-0 z-20">
          {/* Static Story Progress Bar (No auto-timer, user watches as long as they want) */}
          <div className="w-full bg-slate-700/60 h-1 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 w-full rounded-full"></div>
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Companion Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img 
                  src={profile.avatar} 
                  alt={profile.name} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-500 shadow-md bg-slate-800"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&h=400&auto=format&fit=crop";
                  }}
                />
                {profile.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-white truncate leading-tight">
                    {profile.name}
                  </h3>
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0 shadow-xs">
                    Ad Story
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                  <span>{profile.location}, Bangladesh</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">স্পনসরড স্টোরি</span>
                </p>
              </div>
            </div>

            {/* Actions: Open link in tab + Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleOpenExternal}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer text-xs"
                title="ব্রাউজারে সরাসরি খুলুন"
              >
                <i className="fas fa-external-link-alt"></i>
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-600 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer text-sm"
                title="স্টোরি বন্ধ করুন"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>

        {/* ================= 2. AD STORY CONTENT AREA ================= */}
        <div className="flex-1 w-full bg-slate-950 relative overflow-hidden flex flex-col">
          {/* Loading Indicator */}
          {!iframeLoaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm p-6 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">স্টোরি বিজ্ঞাপন লোড হচ্ছে...</p>
                <p className="text-[11px] font-mono text-emerald-400 break-all max-w-xs">{smartlinkUrl}</p>
                <p className="text-[10px] text-slate-400">আপনার ইচ্ছেমতো সময় নিয়ে দেখতে পারবেন</p>
              </div>
            </div>
          )}

          {/* Embedded Smartlink Ad Frame */}
          <iframe
            src={smartlinkUrl}
            onLoad={() => setIframeLoaded(true)}
            className="w-full h-full border-0 bg-white"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            title="Bondhu Ad Story"
          />

          {/* Fallback Banner Overlay at bottom of Story */}
          <div className="absolute bottom-3 left-3 right-3 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white p-3.5 rounded-2xl shadow-2xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <i className="fas fa-bullhorn text-sm"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-white truncate">
                    {profile.name}-এর স্পনসরড স্টোরি
                  </p>
                  <p className="text-[11px] text-emerald-400 font-semibold truncate">
                    যতক্ষণ খুশি দেখুন • কোনো সময়সীমা নেই
                  </p>
                </div>
              </div>

              <button
                onClick={handleStartChat}
                className="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
              >
                <i className="fas fa-comment-dots text-xs"></i>
                <span>চ্যাট</span>
              </button>
            </div>

            {/* Prominent Direct Click Action Button */}
            <button
              onClick={handleOpenExternal}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-98 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>👉 অফারটি সরাসরি ব্রাউজারে দেখতে ক্লিক করুন</span>
              <i className="fas fa-external-link-alt text-[10px]"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryAdModal;
