import React from 'react';
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
  if (!isOpen || !profile) return null;

  const smartlinkUrl = creditService.getSmartlink();

  const handleOpenAd = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window !== 'undefined') {
      window.open(smartlinkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleStartChat = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        className="w-full h-full sm:h-[94vh] sm:max-w-md bg-slate-950 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col relative border-0 sm:border sm:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= 1. STORY HEADER BAR ================= */}
        <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-3.5 flex flex-col gap-2.5 shrink-0 z-30">
          {/* Static Story Progress Bar (No auto-timer, user watches as long as they want) */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
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
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-xs">
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
                onClick={handleOpenAd}
                className="w-8 h-8 rounded-full bg-blue-600/80 hover:bg-blue-600 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer text-xs shadow-xs"
                title="বিজ্ঞাপনটি সরাসরি ব্রাউজারে খুলুন"
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

        {/* ================= 2. AD STORY VISUAL SHOWCASE ================= */}
        <div 
          className="flex-1 w-full relative overflow-hidden flex flex-col justify-between p-5 bg-gradient-to-b from-slate-900 via-slate-950 to-black cursor-pointer"
          onClick={handleOpenAd}
          title="বিজ্ঞাপনটি দেখতে যেকোনো জায়গায় ক্লিক করুন"
        >
          {/* Blurred Background Image of Companion */}
          <div className="absolute inset-0 overflow-hidden opacity-25 pointer-events-none">
            <img 
              src={profile.avatar} 
              alt="bg" 
              className="w-full h-full object-cover scale-125 blur-xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-950/80 to-transparent"></div>
          </div>

          {/* Top Banner Notice */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-500/30 text-blue-300 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>বিজ্ঞাপন ও স্পেশাল অফার সক্রিয়</span>
            </div>
          </div>

          {/* Center Interactive Ad Card */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-4 my-auto">
            {/* Glowing Avatar / Story Ring */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-2xl animate-spin-slow">
                <img 
                  src={profile.avatar} 
                  alt={profile.name} 
                  className="w-full h-full rounded-full object-cover bg-slate-900"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&h=400&auto=format&fit=crop";
                  }}
                />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider whitespace-nowrap">
                ★ SPONSORED
              </div>
            </div>

            {/* Headline and Copy */}
            <div className="space-y-1.5 max-w-xs">
              <h2 className="text-xl font-extrabold text-white leading-tight">
                {profile.name}-এর স্টোরি বিজ্ঞাপন
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                আপনার জন্য চমৎকার স্পনসরড অফার! যত খুশি সময় নিয়ে দেখুন, কোনো সময়সীমা বা কাউন্টডাউন নেই।
              </p>
            </div>

            {/* Big Glowing Main Call To Action Button */}
            <button
              onClick={handleOpenAd}
              className="w-full max-w-xs bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-95 text-white font-black text-sm py-3.5 px-6 rounded-2xl shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-400/30 group"
            >
              <span>👉 বিজ্ঞাপনটি দেখতে ক্লিক করুন</span>
              <i className="fas fa-external-link-alt text-xs group-hover:translate-x-0.5 transition-transform"></i>
            </button>

            {/* Smartlink Info */}
            <p className="text-[10px] text-slate-400 font-mono break-all max-w-xs bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              {smartlinkUrl}
            </p>
          </div>

          {/* ================= 3. BOTTOM ACTION DOCK ================= */}
          <div className="relative z-10 flex items-center gap-2.5 pt-2 border-t border-slate-800/80">
            <button
              onClick={handleStartChat}
              className="flex-1 bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-700 shadow-md"
            >
              <i className="fas fa-comment-dots text-blue-400 text-sm"></i>
              <span>{profile.name}-কে মেসেজ দিন</span>
            </button>

            <button
              onClick={onClose}
              className="bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white text-xs font-bold py-3 px-4 rounded-xl transition-all cursor-pointer border border-slate-700"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryAdModal;
