import React, { useState } from 'react';
import { Profile } from '../types';
import { creditService } from '../services/creditService';

interface StoryAdModalProps {
  isOpen: boolean;
  profile: Profile | null;
  allProfiles?: Profile[];
  onClose: () => void;
  onSelectProfile?: (profile: Profile) => void;
  onStartChat?: (profile: Profile, initialMessage?: string) => void;
}

const StoryAdModal: React.FC<StoryAdModalProps> = ({
  isOpen,
  profile,
  allProfiles = [],
  onClose,
  onSelectProfile,
  onStartChat
}) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const smartlinkUrl = creditService.getSmartlink();

  if (!isOpen || !profile) return null;

  const currentIndex = allProfiles.findIndex(p => p.id === profile.id);

  const handleNextStory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (allProfiles.length > 0 && currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % allProfiles.length;
      if (onSelectProfile) {
        setIframeLoaded(false);
        onSelectProfile(allProfiles[nextIndex]);
      }
    }
  };

  const handlePrevStory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (allProfiles.length > 0 && currentIndex !== -1) {
      const prevIndex = (currentIndex - 1 + allProfiles.length) % allProfiles.length;
      if (onSelectProfile) {
        setIframeLoaded(false);
        onSelectProfile(allProfiles[prevIndex]);
      }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in select-none p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Phone Canvas Container */}
      <div 
        className="w-full h-full sm:h-[95vh] sm:max-w-md bg-slate-900 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col relative border-0 sm:border sm:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= 1. TOP STORY HEADER (REAL PERSONAL STORY STYLE) ================= */}
        <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-3.5 space-y-2 bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-auto">
          {/* Segmented Story Progress Bars */}
          <div className="flex items-center gap-1.5 w-full">
            {(allProfiles.length > 0 ? allProfiles : [profile]).map((p, idx) => {
              const isPast = currentIndex > idx;
              const isCurrent = currentIndex === idx || currentIndex === -1;
              return (
                <div key={p.id || idx} className="flex-1 bg-white/30 h-1 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      isPast 
                        ? 'bg-white w-full' 
                        : isCurrent 
                        ? 'bg-white w-full shadow-sm' 
                        : 'bg-transparent w-0'
                    }`}
                  ></div>
                </div>
              );
            })}
          </div>

          {/* User Info & Actions Bar (100% Personal, Looks like her real story) */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img 
                  src={profile.avatar} 
                  alt={profile.name} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md bg-slate-800"
                />
                {profile.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-black rounded-full"></span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white truncate drop-shadow-md">
                    {profile.name}
                  </h3>
                  <span className="bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-xs">
                    ✓
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/90 font-medium drop-shadow-xs">
                  <span>২৫ মিনিট আগে</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>অ্যাক্টিভ</span>
                  </span>
                  <span>•</span>
                  <span>{profile.location}</span>
                </div>
              </div>
            </div>

            {/* Actions: Prev / Next / Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              {allProfiles.length > 1 && (
                <>
                  <button
                    onClick={handlePrevStory}
                    className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center text-xs backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-xs active:scale-95"
                    title="আগের স্টোরি"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <button
                    onClick={handleNextStory}
                    className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center text-xs backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-xs active:scale-95"
                    title="পরের স্টোরি"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20 text-sm shadow-md"
                title="স্টোরি বন্ধ করুন"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>

        {/* ================= 2. THE STORY CONTENT: THE LIVE ADS ================= */}
        <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-950 flex flex-col pt-18 pb-16">
          {/* Subtle Loading Spinner behind iframe */}
          {!iframeLoaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 p-6 text-center space-y-3">
              <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-300">স্টোরি লোড হচ্ছে...</p>
            </div>
          )}

          {/* Embedded Live Ad Content filling the entire story */}
          <iframe 
            key={profile.id}
            src={smartlinkUrl}
            onLoad={() => setIframeLoaded(true)}
            className="w-full h-full border-0 bg-white"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
            title={`${profile.name} Story Ad`}
          />
        </div>

        {/* ================= 3. BOTTOM FLOATING ENGAGEMENT BAR ================= */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-3 pb-3.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleStartChat}
            className="flex-1 bg-white/20 hover:bg-white/30 active:scale-98 text-white font-semibold text-xs py-2.5 px-4 rounded-full backdrop-blur-md border border-white/25 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <i className="fas fa-comment-dots text-blue-300"></i>
            <span>{profile.name.split(' ')[0]}-কে মেসেজ পাঠান...</span>
          </button>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center text-xs backdrop-blur-md border border-white/20 shrink-0 cursor-pointer"
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
