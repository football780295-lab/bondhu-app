import React, { useState, useRef, useEffect } from 'react';
import { Profile, Message } from '../types';
import { geminiService } from '../services/geminiService';
import { firebaseService } from '../services/firebaseService';
import { voiceService } from '../services/voiceService';

interface ChatWindowProps {
  profile: Profile;
  messages: Message[];
  onSendMessage: (text: string, isFromMe?: boolean, type?: 'text' | 'image' | 'voice', voiceDuration?: number) => boolean;
  onCall: (type: 'audio' | 'video') => void;
  onBack: () => void;
  credits?: number;
  onOpenAdModal?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  profile, 
  messages, 
  onSendMessage, 
  onCall, 
  onBack,
  credits = 0,
  onOpenAdModal
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTranscript, setRecordingTranscript] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isRecording]);

  // Clean up any ongoing speech when unmounting or switching chats
  useEffect(() => {
    return () => {
      voiceService.stopSpeaking();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const currentInput = inputText.trim();

    // Check if user specifically asked for a voice message
    const requestedVoice = /(?:ভয়েস|ভয়েস|অডিও|গলার\s*আওয়াজ|voice|audio|গান\s*শোনাও|কথা\s*বলো)/i.test(currentInput);

    // 1. User sends message -> isFromMe = true (Right side, Blue bubble)
    const wasSent = onSendMessage(currentInput, true, 'text');
    if (!wasSent) {
      return;
    }

    setInputText('');
    setIsTyping(true);
    const currentUser = firebaseService.getCurrentUser();
    const userName = currentUser?.displayName && currentUser.displayName !== 'Guest User'
      ? currentUser.displayName
      : undefined;

    try {
      const updatedHistory = [
        ...messages,
        {
          id: Math.random().toString(),
          senderId: 'me' as const,
          text: currentInput,
          timestamp: new Date(),
          type: 'text' as const
        }
      ];
      const response = await geminiService.getChatResponse(profile, currentInput, updatedHistory, userName);

      // Reply with voice ONLY if the user explicitly requested a voice message in text (e.g. "ভয়েস দাও", "কথা বলো", "গান শোনাও")
      // Regular text messages ALWAYS receive a clean text reply!
      const shouldReplyWithVoice = requestedVoice;
      onSendMessage(response, false, shouldReplyWithVoice ? 'voice' : 'text', shouldReplyWithVoice ? 5 : undefined);
    } catch (err) {
      console.error("Chat reply error:", err);
      const fallback = geminiService.generateSmartContextualReply(
        profile,
        currentInput,
        messages,
        geminiService.detectLanguage(currentInput),
        userName
      );
      onSendMessage(fallback, false, 'text');
    } finally {
      setIsTyping(false);
    }
  };

  // Toggle Voice Note Playback
  const togglePlayVoice = (msgId: string, text: string) => {
    if (playingVoiceId === msgId) {
      voiceService.stopSpeaking();
      setPlayingVoiceId(null);
    } else {
      voiceService.stopSpeaking();
      setPlayingVoiceId(msgId);
      voiceService.speak(
        text,
        () => setPlayingVoiceId(msgId),
        () => setPlayingVoiceId(null)
      );
    }
  };

  // Start User Voice Recording (requires 2 credits)
  const startVoiceRecording = () => {
    if (credits < 2 && onOpenAdModal) {
      onOpenAdModal();
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = voiceService.createRecognition(
        (transcript) => {
          setRecordingTranscript(transcript);
        },
        (err) => {
          console.warn("Speech recognition warning:", err);
        }
      );
    }

    setIsRecording(true);
    setRecordingTranscript('');
    try {
      recognitionRef.current?.start();
    } catch (e) {}
  };

  // Finish and Send User Voice Recording
  const sendVoiceRecording = async () => {
    setIsRecording(false);
    try { recognitionRef.current?.stop(); } catch (e) {}

    const transcript = recordingTranscript.trim() || '🎤 মিষ্টি ভয়েস মেসেজ';
    const wasSent = onSendMessage(transcript, true, 'voice', 4);
    if (!wasSent) return;

    setRecordingTranscript('');
    setIsTyping(true);

    const currentUser = firebaseService.getCurrentUser();
    const userName = currentUser?.displayName && currentUser.displayName !== 'Guest User'
      ? currentUser.displayName
      : undefined;

    setTimeout(async () => {
      try {
        const response = await geminiService.getChatResponse(profile, transcript, messages, userName);
        // Partner responds with sweet voice note!
        onSendMessage(response, false, 'voice', 5);
      } catch (e) {
        const fallback = geminiService.generateSmartContextualReply(
          profile,
          transcript,
          messages,
          'bangla',
          userName
        );
        onSendMessage(fallback, false, 'voice', 5);
      } finally {
        setIsTyping(false);
      }
    }, 1100);
  };

  const cancelVoiceRecording = () => {
    setIsRecording(false);
    setRecordingTranscript('');
    try { recognitionRef.current?.stop(); } catch (e) {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {};
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      className="flex flex-col h-full h-[100dvh] max-h-[100dvh] w-full max-w-md mx-auto bg-[#f0f2f5] overflow-hidden relative shadow-2xl"
      style={{ height: '100dvh', maxHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="imo-blue text-white px-3.5 py-2.5 flex items-center justify-between shadow-md z-10 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button onClick={onBack} className="p-1 hover:opacity-80 transition-opacity shrink-0">
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
          <div className="relative shrink-0">
            <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full border border-white/30 object-cover" />
            {profile.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-base leading-tight truncate">{profile.name}</h2>
            <p className="text-[11px] text-blue-100 flex items-center gap-1 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${profile.isOnline ? 'bg-green-400' : 'bg-gray-300'}`}></span>
              {profile.isOnline ? 'Active now' : 'Recently Active'}
            </p>
          </div>
        </div>

        {/* Call & Top-up Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenAdModal && (
            <button
              onClick={onOpenAdModal}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs shrink-0"
              title="১৫ সেকেন্ডের অ্যাড দেখে ফ্রি কথা বলার ক্রেডিট নিন"
            >
              <i className="fas fa-coins text-amber-300 text-xs"></i>
              <span>{credits}</span>
              <span className="text-[9px] bg-amber-400 text-slate-900 px-1 py-0.2 rounded-full font-black leading-tight">+ফ্রি</span>
            </button>
          )}

          {/* Audio Call Button (3 credits) */}
          <button 
            onClick={() => onCall('audio')} 
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center transition-colors text-white cursor-pointer shadow-xs" 
            title="অডিও কল (৩ ক্রেডিট)"
          >
            <i className="fas fa-phone-alt text-xs"></i>
          </button>

          {/* Video Call Button (5 credits) */}
          <button 
            onClick={() => onCall('video')} 
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center transition-colors text-white cursor-pointer shadow-xs" 
            title="ভিডিও কল (৫ ক্রেডিট)"
          >
            <i className="fas fa-video text-xs"></i>
          </button>
        </div>
      </div>

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 scroll-container">
        {messages.map((msg) => {
          const isMe = msg.senderId === 'me';
          return (
            <div 
              key={msg.id} 
              className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {/* Profile Avatar on Left Side for incoming messages */}
              {!isMe && (
                <img 
                  src={profile.avatar} 
                  alt={profile.name} 
                  className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-gray-200 shadow-xs" 
                />
              )}

              <div className={`max-w-[82%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-sm transition-all ${
                isMe 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-xs' 
                  : 'bg-white text-gray-800 rounded-bl-xs border border-gray-200/90'
              }`}>
                {/* 1. Voice Note Bubble */}
                {msg.type === 'voice' ? (
                  <div className="flex flex-col gap-1.5 py-0.5 min-w-[210px] sm:min-w-[240px]">
                    <div className="flex items-center gap-2.5">
                      {/* Play/Pause Button */}
                      <button 
                        onClick={() => togglePlayVoice(msg.id, msg.text)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all cursor-pointer active:scale-95 ${
                          isMe 
                            ? 'bg-white text-blue-600 hover:bg-blue-50' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                        title={playingVoiceId === msg.id ? 'পজ করুন' : 'প্লে করুন'}
                      >
                        <i className={`fas ${playingVoiceId === msg.id ? 'fa-pause' : 'fa-play ml-0.5'} text-xs`}></i>
                      </button>

                      {/* Animated Sound Waveform Bars */}
                      <div className="flex-1 flex items-center gap-1 h-7 px-1">
                        {[25, 50, 85, 45, 95, 65, 35, 80, 45, 75, 90, 60, 30, 70].map((h, i) => (
                          <span 
                            key={i}
                            className={`w-1 rounded-full transition-all duration-150 ${
                              isMe 
                                ? (playingVoiceId === msg.id ? 'bg-white shadow-xs' : 'bg-white/50')
                                : (playingVoiceId === msg.id ? 'bg-blue-600 shadow-xs' : 'bg-gray-300')
                            }`}
                            style={{
                              height: playingVoiceId === msg.id ? `${Math.max(25, (h * Math.random()) + 25)}%` : `${h * 0.7}%`
                            }}
                          />
                        ))}
                      </div>

                      {/* Voice Duration */}
                      <span className={`text-[11px] font-mono shrink-0 font-bold ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
                        0:0{msg.voiceDuration || 5}
                      </span>
                    </div>

                    {/* Subtitle Caption */}
                    <div className={`text-[12px] flex items-center gap-1.5 pt-1 border-t leading-tight ${
                      isMe ? 'border-white/20 text-blue-50' : 'border-gray-100 text-gray-600'
                    }`}>
                      <i className="fas fa-microphone-alt text-[10px] text-emerald-400 shrink-0"></i>
                      <span className="truncate">"{msg.text}"</span>
                    </div>
                  </div>
                ) : msg.type === 'text' ? (
                  <p className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <img src={msg.imageUrl} alt="shared" className="rounded-lg max-w-full" />
                )}
                
                {/* Timestamp */}
                <div className={`text-[10px] mt-1 flex items-center gap-1 ${
                  isMe ? 'justify-end text-blue-100' : 'justify-start text-gray-400'
                }`}>
                  <span>
                    {(() => {
                      try {
                        const d = new Date(msg.timestamp);
                        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      } catch (_) {
                        return '';
                      }
                    })()}
                  </span>
                  {isMe && <i className="fas fa-check-double text-[9px] text-blue-200"></i>}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator from profile */}
        {isTyping && (
          <div className="flex items-end gap-2 justify-start animate-fadeIn">
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-gray-200 shadow-xs" 
            />
            <div className="bg-white rounded-2xl rounded-bl-xs px-3.5 py-2.5 shadow-sm border border-gray-200 flex space-x-1.5 items-center">
              <span className="text-xs text-blue-600 font-semibold mr-1">টাইপ করছে</span>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-75"></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Pinned to Bottom with Voice Note Recording */}
      <div 
        className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-2 shrink-0 z-20 shadow-lg"
        style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))' }}
      >
        {/* Normal Input vs Live Voice Recording Mode */}
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between bg-rose-50 border border-rose-200 rounded-full px-4 py-2 animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0"></span>
              <span className="text-xs font-bold text-rose-600 shrink-0">ভয়েস রেকর্ড হচ্ছে...</span>
              <span className="text-xs text-gray-700 truncate italic">
                {recordingTranscript ? `"${recordingTranscript}"` : 'কথা বলুন'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button 
                onClick={cancelVoiceRecording}
                className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center text-xs cursor-pointer"
                title="বাতিল করুন"
              >
                <i className="fas fa-times"></i>
              </button>
              <button 
                onClick={sendVoiceRecording}
                className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center text-xs shadow-md cursor-pointer"
                title="পাঠান"
              >
                <i className="fas fa-check"></i>
              </button>
            </div>
          </div>
        ) : (
          <>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="p-1.5 text-blue-500 hover:text-blue-600 transition-colors shrink-0 cursor-pointer"
              title="ছবি পাঠান"
            >
              <i className="fas fa-plus-circle text-2xl"></i>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="মেসেজ লিখুন... (১ ক্রেডিট)"
                className="w-full bg-gray-100 rounded-full py-2 px-4 pr-9 focus:outline-none border border-transparent focus:border-blue-400 text-sm text-gray-800"
              />
              <button 
                onClick={() => setInputText(prev => prev + ' ❤️')}
                className="absolute right-3 top-2 text-gray-400 hover:text-rose-500 cursor-pointer text-sm"
                title="হার্ট ইমোজি"
              >
                ❤️
              </button>
            </div>

            {/* If user typed text -> Show Send Button; If empty -> Show Microphone Voice Button */}
            {inputText.trim() ? (
              <button 
                onClick={handleSend}
                className="p-2 rounded-full w-10 h-10 flex items-center justify-center transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95 cursor-pointer shrink-0"
                aria-label="Send message"
                title="মেসেজ পাঠান (১ ক্রেডিট)"
              >
                <i className="fas fa-paper-plane text-sm"></i>
              </button>
            ) : (
              <button 
                onClick={startVoiceRecording}
                className="p-2 rounded-full w-10 h-10 flex items-center justify-center transition-all bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-95 cursor-pointer shrink-0 animate-pulse"
                aria-label="ভয়েস মেসেজ রেকর্ড করুন"
                title="ভয়েস মেসেজ পাঠান (২ ক্রেডিট)"
              >
                <i className="fas fa-microphone text-base"></i>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
