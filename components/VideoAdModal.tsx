import React, { useState, useEffect, useRef } from 'react';
import { creditService, openInChrome, AD_REWARD_CREDITS, AD_DURATION_SECONDS } from '../services/creditService';

export type AdModalReason = 'video_call' | 'audio_call' | 'voice_message' | 'message' | 'call' | 'topup';

interface VideoAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardReceived?: (newBalance: number) => void;
  reason?: AdModalReason;
}

const VideoAdModal: React.FC<VideoAdModalProps> = ({ 
  isOpen, 
  onClose, 
  onRewardReceived, 
  reason = 'topup' 
}) => {
  const [timeLeft, setTimeLeft] = useState(AD_DURATION_SECONDS);
  const [isCompleted, setIsCompleted] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const smartlinkUrl = creditService.getSmartlink();

  const getReasonText = () => {
    switch (reason) {
      case 'video_call':
        return '📹 ভিডিও কল করতে ৫ ক্রেডিট প্রয়োজন (১৫ সেকেন্ড অ্যাড দেখে ফ্রি ক্রেডিট নিন)';
      case 'audio_call':
        return '📞 অডিও কল করতে ৩ ক্রেডিট প্রয়োজন (১৫ সেকেন্ড অ্যাড দেখে ফ্রি ক্রেডিট নিন)';
      case 'voice_message':
        return '🎙️ ভয়েস মেসেজ পাঠাতে ২ ক্রেডিট প্রয়োজন (১৫ সেকেন্ড অ্যাড দেখে ফ্রি ক্রেডিট নিন)';
      case 'message':
        return '💬 মেসেজ পাঠাতে ১ ক্রেডিট প্রয়োজন (১৫ সেকেন্ড অ্যাড দেখে ফ্রি ক্রেডিট নিন)';
      case 'call':
        return '📞 কল করার জন্য পর্যাপ্ত ক্রেডিট প্রয়োজন';
      default:
        return '🪙 ১৫ সেকেন্ড অ্যাড দেখে +৩ ফ্রি টকিং ক্রেডিট নিন';
    }
  };

  // Play celebration sound when 15 seconds finishes
  const playRewardSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.3);
      });
    } catch (_) {}
  };

  const handleOpenExternal = () => {
    openInChrome(smartlinkUrl);
  };


  const handleRefreshIframe = () => {
    setIframeLoaded(false);
    const frame = document.getElementById('adsterra-browser-frame') as HTMLIFrameElement;
    if (frame) {
      frame.src = `${smartlinkUrl}${smartlinkUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(AD_DURATION_SECONDS);
      setIsCompleted(false);
      setIframeLoaded(false);

      // Start 15-second Countdown Timer inside the in-app browser
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, smartlinkUrl]);

  const handleComplete = () => {
    setIsCompleted(true);
    playRewardSound();
    const newBal = creditService.rewardAdCredits(AD_REWARD_CREDITS);
    if (onRewardReceived) {
      onRewardReceived(newBal);
    }
  };

  if (!isOpen) return null;

  const progressPercent = ((AD_DURATION_SECONDS - timeLeft) / AD_DURATION_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-0 sm:p-4">
      {/* In-App Browser Window Container */}
      <div 
        className="w-full h-full sm:h-[94vh] sm:max-w-md bg-slate-900 border-0 sm:border sm:border-slate-700 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= 1. IN-APP BROWSER TOP BAR ================= */}
        <div className="bg-slate-800 text-white px-3 py-2.5 flex items-center gap-2 border-b border-slate-700 shrink-0">
          {/* Close or Back Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            title={isCompleted ? "অ্যাপে ফিরে যান" : "বন্ধ করুন"}
          >
            <i className={`fas ${isCompleted ? 'fa-arrow-left text-emerald-400' : 'fa-times text-xs'}`}></i>
          </button>

          {/* Browser Address / URL Bar */}
          <div className="flex-1 min-w-0 bg-slate-950/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-inner">
            <i className="fas fa-lock text-emerald-400 text-[10px] shrink-0"></i>
            <span className="text-[11px] font-mono text-slate-300 truncate select-all">
              {smartlinkUrl.replace('https://', '')}
            </span>
          </div>

          {/* Refresh Page Button */}
          <button
            onClick={handleRefreshIframe}
            className="w-8 h-8 rounded-full bg-slate-700/80 hover:bg-slate-600 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 text-xs"
            title="পেজ রিলোড করুন"
          >
            <i className="fas fa-sync-alt"></i>
          </button>

          {/* Open in Chrome Browser Button */}
          <button
            onClick={handleOpenExternal}
            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 text-xs shadow-sm"
            title="ক্রোম ব্রাউজারে খুলুন"
          >
            <i className="fab fa-chrome"></i>
          </button>
        </div>

        {/* Tiered Credit Reason Alert Strip */}
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 py-1.5 flex items-center justify-center gap-1.5 text-center shrink-0">
          <span className="text-[11px] font-bold text-amber-300 truncate">
            {getReasonText()}
          </span>
        </div>

        {/* ================= 2. 15-SECOND TIMER & REWARD BAR ================= */}
        <div className="bg-slate-900 border-b border-slate-700/80 shrink-0">
          {/* Animated Progress Bar */}
          <div className="w-full bg-slate-800 h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-linear ${
                isCompleted 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                  : 'bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Timer Notice Strip */}
          <div className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
            {!isCompleted ? (
              <div className="flex items-center gap-2 text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                <span className="font-extrabold text-[12px] flex items-center gap-1">
                  <i className="fas fa-stopwatch text-amber-400"></i>
                  <span>অ্যাড ব্রাউজার: <b>{timeLeft} সেকেন্ড বাকি</b></span>
                </span>
                <span className="text-[10px] text-slate-400 hidden xs:inline">| +৩ ক্রেডিট ফ্রি পাবেন</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400">
                <i className="fas fa-check-circle text-emerald-400 text-sm"></i>
                <span className="font-extrabold text-[12px]">
                  🎉 ১৫ সেকেন্ড দেখা সম্পন্ন! <b>+{AD_REWARD_CREDITS} ক্রেডিট যোগ হয়েছে!</b>
                </span>
              </div>
            )}

            {isCompleted ? (
              <button
                onClick={onClose}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[11px] px-3 py-1 rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0 animate-bounce"
              >
                <span>অ্যাপে ফিরে যান ✓</span>
              </button>
            ) : (
              <button
                onClick={handleOpenExternal}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1"
              >
                <i className="fab fa-chrome text-[9px] text-blue-400"></i>
                <span>ক্রোমে দেখুন &rarr;</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= 3. IN-APP BROWSER WEBVIEW (DIRECT ADS IFRAME) ================= */}
        <div className="flex-1 w-full bg-white relative overflow-hidden flex flex-col">
          <iframe
            id="adsterra-browser-frame"
            src={smartlinkUrl}
            className="w-full h-full border-0 bg-white"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            title="Adsterra In-App Browser"
          />

          {/* Automatic Chrome Open: When visitor taps the ad, it launches Chrome */}
          <div
            onClick={handleOpenExternal}
            className="absolute inset-0 z-10 cursor-pointer bg-transparent"
            title="ক্রোম ব্রাউজারে দেখতে ট্যাপ করুন"
          />

          {/* Floating Action Banner at bottom of In-App Browser */}
          <div className="absolute bottom-3 left-3 right-3 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <i className="fas fa-coins text-sm"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {isCompleted ? '🎉 +৩ ক্রেডিট জমা হয়েছে' : `⏱️ আরও ${timeLeft} সেকেন্ড ব্রাউজারে থাকুন`}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {isCompleted ? 'কথা বলা শুরু করতে অ্যাপে ফিরে যান' : 'সময় শেষ হলে স্বয়ংক্রিয় ক্রেডিট দেওয়া হবে'}
                </p>
              </div>
            </div>

            {isCompleted ? (
              <button
                onClick={onClose}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>{reason === 'call' ? 'কল করুন' : 'চ্যাট করুন'}</span>
                <i className="fas fa-arrow-right text-[10px]"></i>
              </button>
            ) : (
              <button
                onClick={handleOpenExternal}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] px-3 py-2 rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <i className="fab fa-chrome text-[10px]"></i>
                <span>ক্রোমে খুলুন</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoAdModal;
