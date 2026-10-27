import React, { useState, useEffect } from 'react';
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

// Natural Bengali link sticker captions for each companion to feel 100% genuine & personal
const getCompanionStoryLinkText = (profileId: string): string => {
  const map: Record<string, string> = {
    nila: "আমার নতুন এক্সক্লুসিভ ছবি দেখুন 💋",
    ayesha: "আমার সিক্রেট ভিডিও ও মুহূর্ত দেখুন ✨",
    sumaiya: "আমার পার্সোনাল অ্যালবাম দেখুন 💖",
    mim: "আমার সাথে সরাসরি কানেক্ট হন 🌸",
    priya: "আমার স্পেশাল মুহূর্তগুলো দেখুন 💕",
    riya: "আমার নতুন রিলস ও ভিডিও 🎵",
    tania: "আমার পার্সোনাল প্রোফাইল দেখুন 📸",
    sadiya: "আমার নতুন ছবি দেখতে এখানে চাপুন ❤️",
    nusrat: "আমার ড্রিম আর্ট ও স্পেশাল ছবি 🎨",
    zara: "আমার আরও সুন্দর মুহূর্তগুলো দেখুন ✨",
  };
  return map[profileId] || "আমার নতুন ছবি ও মুহূর্ত দেখুন 💋";
};

const StoryAdModal: React.FC<StoryAdModalProps> = ({
  isOpen,
  profile,
  allProfiles = [],
  onClose,
  onSelectProfile,
  onStartChat
}) => {
  const [replyText, setReplyText] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [reactionEffect, setReactionEffect] = useState<string | null>(null);
  const smartlinkUrl = creditService.getSmartlink();

  // Reset state whenever profile changes
  useEffect(() => {
    setReplyText('');
    setReactionEffect(null);
  }, [profile?.id]);

  if (!isOpen || !profile) return null;

  // Find current index among available story profiles
  const currentIndex = allProfiles.findIndex(p => p.id === profile.id);

  const handleNextStory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (allProfiles.length > 0 && currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % allProfiles.length;
      if (onSelectProfile) {
        onSelectProfile(allProfiles[nextIndex]);
      }
    }
  };

  const handlePrevStory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (allProfiles.length > 0 && currentIndex !== -1) {
      const prevIndex = (currentIndex - 1 + allProfiles.length) % allProfiles.length;
      if (onSelectProfile) {
        onSelectProfile(allProfiles[prevIndex]);
      }
    }
  };

  const handleSendReply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = replyText.trim();
    if (!text) return;
    if (onStartChat) {
      onStartChat(profile, text);
    }
    onClose();
  };

  const handleSendReaction = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReactionEffect(emoji);
    setTimeout(() => {
      if (onStartChat) {
        onStartChat(profile, emoji);
      }
      onClose();
    }, 600);
  };

  const handleOpenLinkSticker = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      window.open(smartlinkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in select-none p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Phone Canvas Container */}
      <div 
        className="w-full h-full sm:h-[95vh] sm:max-w-md bg-black sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col relative border-0 sm:border sm:border-slate-800"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* ================= 1. FULL-BLEED VERTICAL PERSONAL STORY IMAGE ================= */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
          <img 
            src={profile.avatar} 
            alt={profile.name} 
            className={`w-full h-full object-cover transition-transform duration-700 ${isPaused ? 'scale-100' : 'scale-105'}`}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&h=400&auto=format&fit=crop";
            }}
          />
          {/* Top Dark Gradient for Header Readability */}
          <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none"></div>
          {/* Bottom Dark Gradient for Engagement Bar Readability */}
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none"></div>
        </div>

        {/* Floating Heart / Reaction Burst Animation */}
        {reactionEffect && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-bounce">
            <span className="text-7xl drop-shadow-2xl">{reactionEffect}</span>
          </div>
        )}

        {/* ================= 2. TOP STORY HEADER (REAL PERSONAL STORY STYLE) ================= */}
        <div className="relative z-20 p-3 pt-3.5 space-y-2 shrink-0">
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

          {/* User Info & Actions Bar (100% Personal, No Ad Branding) */}
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
                <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-medium drop-shadow-xs">
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

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20 shrink-0 text-sm shadow-md"
              title="স্টোরি বন্ধ করুন"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* ================= 3. TAP NAVIGATION ZONES (LEFT / RIGHT) ================= */}
        <div className="flex-1 relative z-10 flex">
          {/* Left Tap Zone: Previous Story */}
          <div 
            className="w-1/3 h-full cursor-pointer"
            onClick={handlePrevStory}
            title="আগের স্টোরি"
          ></div>

          {/* Middle/Content Zone */}
          <div className="w-1/3 h-full pointer-events-none"></div>

          {/* Right Tap Zone: Next Story */}
          <div 
            className="w-1/3 h-full cursor-pointer"
            onClick={handleNextStory}
            title="পরের স্টোরি"
          ></div>
        </div>

        {/* ================= 4. PERSONAL STORY CAPTION & NATURAL LINK STICKER ================= */}
        <div className="relative z-20 px-4 pb-3 space-y-2.5 pointer-events-auto">
          {/* Personal Status Caption from Companion */}
          <div className="bg-black/45 backdrop-blur-md border border-white/15 text-white px-4 py-2 rounded-2xl shadow-lg inline-block max-w-[90%]">
            <p className="text-xs font-semibold leading-relaxed">
              "{profile.status || 'আজকের দিনটা দারুণ লাগছে... ❤️'}"
            </p>
          </div>

          {/* Natural Instagram Story Link Sticker (Looks 100% like a personal link sticker) */}
          <div 
            onClick={handleOpenLinkSticker}
            className="inline-flex items-center gap-2.5 bg-white/95 hover:bg-white active:scale-95 text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl cursor-pointer transition-all border border-white/40 max-w-[95%] group backdrop-blur-md"
            title={getCompanionStoryLinkText(profile.id)}
          >
            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs shrink-0 shadow-2xs group-hover:rotate-45 transition-transform">
              <i className="fas fa-link"></i>
            </div>
            <span className="text-xs font-extrabold truncate text-slate-800">
              {getCompanionStoryLinkText(profile.id)}
            </span>
            <i className="fas fa-arrow-up-right-from-square text-[10px] text-slate-400 group-hover:text-blue-600 transition-colors shrink-0"></i>
          </div>

          {/* ================= 5. STORY ENGAGEMENT (REPLY & REACTIONS) ================= */}
          <div className="space-y-2 pt-1">
            {/* Quick Reaction Emoji Row */}
            <div className="flex items-center justify-around bg-black/40 backdrop-blur-md rounded-full py-1.5 px-2 border border-white/10">
              {['❤️', '😍', '🔥', '🥰', '😘'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => handleSendReaction(emoji, e)}
                  className="text-xl hover:scale-130 active:scale-90 transition-transform cursor-pointer p-1"
                  title={`${profile.name}-কে ${emoji} রিয়েক্ট পাঠান`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Quick Message Input Form */}
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input 
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`${profile.name.split(' ')[0]}-কে মেসেজ লিখুন...`}
                className="flex-1 bg-black/50 hover:bg-black/60 focus:bg-black/75 text-white placeholder-white/60 text-xs px-4 py-3 rounded-full border border-white/25 focus:outline-none focus:border-blue-400 backdrop-blur-md transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm shadow-md transition-all cursor-pointer shrink-0 ${
                  replyText.trim() 
                    ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95' 
                    : 'bg-white/20 text-white/40 cursor-not-allowed'
                }`}
                title="মেসেজ পাঠান"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryAdModal;
