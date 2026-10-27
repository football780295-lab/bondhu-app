import React, { useEffect, useRef, useState } from 'react';
import { Profile, CallType } from '../types';
import { voiceService } from '../services/voiceService';
import { geminiService } from '../services/geminiService';
import { firebaseService } from '../services/firebaseService';

interface CallOverlayProps {
  profile: Profile;
  type: CallType;
  onEnd: () => void;
}

const CallOverlay: React.FC<CallOverlayProps> = ({ profile, type, onEnd }) => {
  const [status, setStatus] = useState<'ringing' | 'connected'>('ringing');
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isListening, setIsListening] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  // Clean username
  const currentUser = firebaseService.getCurrentUser();
  const userName = currentUser?.displayName && currentUser.displayName !== 'Guest User'
    ? currentUser.displayName
    : undefined;

  useEffect(() => {
    isMountedRef.current = true;

    // 1. Start authentic ringing sound
    voiceService.startRingtone();

    // 2. Connect after 2.8 seconds
    const ringTimeout = setTimeout(() => {
      if (!isMountedRef.current) return;
      voiceService.stopRingtone();
      voiceService.playConnectedChime();
      setStatus('connected');
    }, 2800);

    // Camera setup for video calls
    if (type === 'video' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        if (videoRef.current && isMountedRef.current) {
          videoRef.current.srcObject = stream;
        }
      }).catch(err => {
        console.warn("Camera access skipped/denied:", err);
      });
    }

    return () => {
      isMountedRef.current = false;
      clearTimeout(ringTimeout);
      clearInterval(timerRef.current);
      voiceService.stopRingtone();
      voiceService.stopSpeaking();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [type]);

  // Handle connected state
  useEffect(() => {
    if (status === 'connected') {
      // Call timer
      timerRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);

      // Initial sweet greeting from the partner
      const greeting = `হ্যালো! কেমন আছো গো? তোমার কলের অপেক্ষাতেই ছিলাম... কী করছো এখন?`;
      partnerSpeak(greeting);

      // Setup speech recognition for user microphone
      startListening();
    }
  }, [status]);

  // Partner speaks with voice and real-time animation
  const partnerSpeak = (text: string) => {
    if (!isMountedRef.current) return;
    setCurrentSubtitle(text);
    setIsSpeaking(true);

    voiceService.speak(
      text,
      () => {
        if (isMountedRef.current) setIsSpeaking(true);
      },
      () => {
        if (isMountedRef.current) {
          setIsSpeaking(false);
          // Resume listening after partner finishes speaking
          startListening();
        }
      }
    );
  };

  // Start speech recognition so the user can talk to AI
  const startListening = () => {
    if (isMuted || !isMountedRef.current) return;

    if (!recognitionRef.current) {
      recognitionRef.current = voiceService.createRecognition(
        (transcript) => {
          if (!isMountedRef.current) return;
          setUserTranscript(transcript);
          handleUserSpeech(transcript);
        },
        (err) => {
          console.warn("Voice input notice:", err?.error || err);
        }
      );
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        // Already started or busy
      }
    }
  };

  // When user speaks something into the mic or taps a chip
  const handleUserSpeech = (text: string) => {
    if (!text.trim() || !isMountedRef.current) return;
    setUserTranscript(text);

    // Stop recognition while AI processes & speaks
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);

    // Generate dynamic smart response from Gemini/Semantic engine
    const reply = geminiService.generateSmartContextualReply(
      profile,
      text,
      [],
      geminiService.detectLanguage(text),
      userName
    );

    // Partner speaks reply
    setTimeout(() => {
      partnerSpeak(reply);
    }, 400);
  };

  const handleEndCall = () => {
    voiceService.stopRingtone();
    voiceService.stopSpeaking();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    onEnd();
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Quick conversation chips for instant talking
  const quickTalkChips = [
    { label: '👋 কেমন আছো?', text: 'তুমি কেমন আছো?' },
    { label: '❤️ ভালোবাসি', text: 'আমি তোমাকে ভালোবাসি!' },
    { label: '🏠 বাড়ি কোথায়?', text: 'তোমার বাড়ি কোথায়?' },
    { label: '🍛 খেয়েছো?', text: 'তুমি ভাত খেয়েছো?' },
    { label: '☕ চা খাবে?', text: 'আমার সাথে এক কাপ চা খাবে?' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 flex flex-col items-center justify-between py-10 px-4 text-white animate-fadeIn select-none">
      
      {/* Video Call Background & Self Camera */}
      {type === 'video' && status === 'connected' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-black">
            <img 
              src={profile.avatar} 
              className="w-full h-full object-cover opacity-50 blur-sm scale-105 transition-transform duration-1000" 
              alt="Partner Background"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <img 
                  src={profile.avatar} 
                  className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 shadow-2xl object-cover transition-all ${
                    isSpeaking 
                      ? 'border-emerald-400 ring-8 ring-emerald-400/30 scale-105' 
                      : 'border-blue-500 ring-4 ring-blue-500/20'
                  }`} 
                  alt="Partner"
                />
                {isSpeaking && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md animate-bounce">
                    Speaking
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* User Self Camera */}
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="absolute top-4 right-4 w-24 h-36 bg-slate-800 rounded-2xl border-2 border-white/40 object-cover shadow-2xl pointer-events-auto"
          />
        </div>
      )}

      {/* Top Header: Partner Info */}
      <div className="z-10 flex flex-col items-center text-center mt-2">
        {type === 'audio' && (
          <div className="relative mb-5">
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 shadow-2xl object-cover transition-all ${
                status === 'ringing' 
                  ? 'border-white/30 animate-pulse scale-95' 
                  : isSpeaking 
                  ? 'border-emerald-400 ring-8 ring-emerald-400/30 scale-105' 
                  : 'border-blue-400 ring-4 ring-blue-400/20'
              }`}
            />
            {isSpeaking && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md animate-pulse">
                Speaking
              </span>
            )}
          </div>
        )}

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-md">
          {profile.name}
        </h2>

        <p className="text-blue-300 text-sm font-semibold mt-1 flex items-center justify-center gap-2">
          {status === 'ringing' ? (
            <span className="animate-pulse flex items-center gap-1.5">
              <i className="fas fa-phone-volume animate-bounce"></i>
              <span>Ringing...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/10 text-emerald-300 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>{formatTime(callDuration)}</span>
            </span>
          )}
        </p>

        {/* Live Audio Waveform Animation */}
        {status === 'connected' && (
          <div className="flex items-center justify-center gap-1.5 mt-3 h-7">
            {[40, 75, 55, 95, 60, 85, 45, 90, 65, 80].map((height, i) => (
              <span 
                key={i} 
                className={`w-1 rounded-full transition-all duration-150 ${
                  isSpeaking 
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' 
                    : 'bg-white/20'
                }`}
                style={{
                  height: isSpeaking ? `${Math.max(15, (height * Math.random()) + 15)}%` : '20%',
                  animationDuration: `${0.3 + (i * 0.05)}s`
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Middle: Live Subtitle Captions & User Speech Feedback */}
      {status === 'connected' && (
        <div className="z-10 w-full max-w-sm flex flex-col items-center gap-2 px-2 my-auto">
          {/* Partner Speech Subtitle */}
          {currentSubtitle && (
            <div className="bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 px-4 py-2.5 rounded-2xl shadow-xl text-center max-w-xs animate-fadeIn">
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
                <i className="fas fa-comment-dots"></i>
                <span>{profile.name.split(' ')[0]} বলছে</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white leading-relaxed">
                "{currentSubtitle}"
              </p>
            </div>
          )}

          {/* User Transcript Subtitle */}
          {userTranscript && (
            <div className="bg-blue-600/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-center max-w-xs border border-blue-400/30 animate-fadeIn">
              <span className="text-[10px] text-blue-200">আপনি বলেছেন: </span>
              <span className="text-xs font-semibold text-white">"{userTranscript}"</span>
            </div>
          )}

          {/* Interactive Quick Talk Chips */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-2">
            {quickTalkChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleUserSpeech(chip.text)}
                className="bg-white/15 hover:bg-white/25 active:scale-95 text-white border border-white/20 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md transition-all cursor-pointer shadow-xs"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Controls: Mic, Speaker, End Call */}
      <div className="z-10 flex flex-col items-center gap-6 w-full max-w-xs mb-2">
        <div className="flex items-center justify-center gap-6">
          {/* Mute Button */}
          <button 
            onClick={() => {
              setIsMuted(prev => !prev);
              if (!isMuted && recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) {}
              }
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md border transition-all cursor-pointer shadow-lg active:scale-95 ${
              isMuted 
                ? 'bg-rose-500/80 border-rose-400 text-white' 
                : 'bg-white/15 hover:bg-white/25 border-white/20 text-white'
            }`}
            title={isMuted ? 'আনমিউট করুন' : 'মিউট করুন'}
          >
            <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-lg`}></i>
          </button>

          {/* Speaker Button */}
          <button 
            onClick={() => setIsSpeakerOn(prev => !prev)}
            className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md border transition-all cursor-pointer shadow-lg active:scale-95 ${
              isSpeakerOn 
                ? 'bg-blue-600/80 border-blue-400 text-white' 
                : 'bg-white/15 hover:bg-white/25 border-white/20 text-white'
            }`}
            title={isSpeakerOn ? 'স্পিকার অন' : 'স্পিকার অফ'}
          >
            <i className={`fas ${isSpeakerOn ? 'fa-volume-up' : 'fa-volume-mute'} text-lg`}></i>
          </button>
        </div>
        
        {/* Hang Up Button */}
        <button 
          onClick={handleEndCall}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-2xl transition-all border-4 border-white/20 cursor-pointer animate-pulse"
          title="কল কাটুন"
        >
          <i className="fas fa-phone-slash text-2xl sm:text-3xl transform rotate-[135deg]"></i>
        </button>
      </div>

    </div>
  );
};

export default CallOverlay;
