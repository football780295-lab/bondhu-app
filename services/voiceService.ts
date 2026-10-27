// High-fidelity Audio, Sweet Bengali Female TTS Synthesizer, and Speech Recognition Service

const FEMALE_VOICE_REGEX = /female|woman|girl|zira|samantha|victoria|karen|tania|kalpana|aditi|swara|priya|pooja|sangeeta|maya|heera|neerja|ananya|anupama|hazel|susan|allison|ava|cora|jessica|serena|fiona|moira|veena|মহিলা|মেয়ে/i;

const MALE_VOICE_REGEX = /(?:\bmale\b|david|mark|george|hemant|ravi|guy|stefan|paul|james|richard|charles|aslam|rahul|amit|tarik|samir|\bman\b|\bboy\b|পুরুষ|ছেলে)/i;

class VoiceService {
  private ringOscillator1: OscillatorNode | null = null;
  private ringOscillator2: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private ringInterval: any = null;
  private audioCtx: AudioContext | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.initVoices();
  }

  // Pre-load and cache browser speech synthesis voices
  private initVoices(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const load = () => {
      try {
        const list = window.speechSynthesis.getVoices();
        if (list && list.length > 0) {
          this.cachedVoices = list;
        }
      } catch (_) {}
    };

    load();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', load);
    } else if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }

  private isMaleVoice(v: SpeechSynthesisVoice): boolean {
    const raw = `${v.name} ${v.voiceURI || ''} ${v.lang || ''}`.toLowerCase();
    // If it explicitly contains female keywords, it is NEVER male
    if (FEMALE_VOICE_REGEX.test(raw)) {
      return false;
    }
    return MALE_VOICE_REGEX.test(raw);
  }

  private isFemaleVoice(v: SpeechSynthesisVoice): boolean {
    const raw = `${v.name} ${v.voiceURI || ''}`.toLowerCase();
    if (this.isMaleVoice(v)) return false;
    return FEMALE_VOICE_REGEX.test(raw);
  }

  // Guaranteed Sweet Female Voice Picker (Strictly Excludes Any Male Voices)
  public getBestFemaleVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;

    let voices = this.cachedVoices;
    if (!voices || voices.length === 0) {
      voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        this.cachedVoices = voices;
      }
    }

    if (!voices || voices.length === 0) return null;

    // Filter out ANY voice with male keywords
    const nonMaleVoices = voices.filter(v => !this.isMaleVoice(v));

    // Priority 1: Confirmed Bengali Female Voice (e.g. Google বাংলা Female, Microsoft Kalpana/Tanisha)
    const bnFemale = nonMaleVoices.find(v => 
      (v.lang.toLowerCase().startsWith('bn') || v.name.toLowerCase().includes('bangla') || v.name.toLowerCase().includes('bengali')) &&
      this.isFemaleVoice(v)
    );
    if (bnFemale) return bnFemale;

    // Priority 2: Bengali voice that is NOT male
    const bnNonMale = nonMaleVoices.find(v => 
      v.lang.toLowerCase().startsWith('bn') || v.name.toLowerCase().includes('bangla') || v.name.toLowerCase().includes('bengali')
    );
    if (bnNonMale) return bnNonMale;

    // Priority 3: South Asian Female Voice (Hindi/Indian English female voices speak Avro/Bangla with a sweet local accent)
    const southAsianFemale = nonMaleVoices.find(v => 
      (v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase().startsWith('en-in')) &&
      this.isFemaleVoice(v)
    );
    if (southAsianFemale) return southAsianFemale;

    // Priority 4: Explicitly identified Female voice (Microsoft Zira, Google US English Female, Samantha, Victoria)
    const explicitFemale = nonMaleVoices.find(v => this.isFemaleVoice(v));
    if (explicitFemale) return explicitFemale;

    // Priority 5: Any non-male voice
    if (nonMaleVoices.length > 0) return nonMaleVoices[0];

    // Fallback: If ALL voices are flagged as male, pick null and use high pitch modulation
    return null;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // 1. Realistic Phone Ringtone Generator (US/BD Standard 440Hz + 480Hz dual cadence)
  public startRingtone(): void {
    this.stopRingtone();
    try {
      const ctx = this.getAudioContext();

      const pulse = () => {
        try {
          if (ctx.state === 'closed') return;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(440, ctx.currentTime);
          osc2.frequency.setValueAtTime(480, ctx.currentTime);

          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          // Ring for 1.8 seconds, then fade out
          gain.gain.setValueAtTime(0.08, ctx.currentTime + 1.6);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(ctx.currentTime);
          osc2.start(ctx.currentTime);
          osc1.stop(ctx.currentTime + 1.8);
          osc2.stop(ctx.currentTime + 1.8);
        } catch (e) {
          console.warn("Ringtone pulse error:", e);
        }
      };

      // Play first ring immediately
      pulse();
      // Repeat every 3.5 seconds
      this.ringInterval = setInterval(pulse, 3500);
    } catch (e) {
      console.warn("Could not start ringtone:", e);
    }
  }

  public stopRingtone(): void {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.ringGain && this.audioCtx) {
      try {
        this.ringGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      } catch (e) {}
    }
    this.ringOscillator1 = null;
    this.ringOscillator2 = null;
    this.ringGain = null;
  }

  // 2. Pleasant Connection Beep
  public playConnectedChime(): void {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  // 3. Natural Sweet Bengali Female Speech Synthesis (Guaranteed Sweet Female Voice)
  public speak(
    text: string, 
    onStart?: () => void, 
    onEnd?: () => void
  ): boolean {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onEnd) onEnd();
      return false;
    }

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const femaleVoice = this.getBestFemaleVoice();

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      // Sweet, soft feminine tone settings:
      // Pitch: 1.35 gives a naturally bright, sweet young female vocal frequency
      // Rate: 0.92 gives an affectionate, intimate, relaxed cadence
      utterance.pitch = 1.35; 
      utterance.rate = 0.92;
      utterance.volume = 1.0;

      if (onStart) utterance.onstart = onStart;
      utterance.onend = () => {
        if (onEnd) onEnd();
      };
      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (e) {
      console.warn("Speech synthesis exception:", e);
      if (onEnd) onEnd();
      return false;
    }
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }

  // 4. Speech Recognition (Speech-to-Text) for Talking to AI on calls or voice input
  public createRecognition(
    onResult: (transcript: string) => void,
    onError?: (err: any) => void
  ): any {
    if (typeof window === 'undefined') return null;
    const SpeechRecognitionClass = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognitionClass) return null;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'bn-BD'; // Default to Bangla Bangladesh

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          onResult(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (onError) onError(event);
      };

      return recognition;
    } catch (e) {
      console.warn("SpeechRecognition init error:", e);
      return null;
    }
  }

  // 5. Pre-crafted Realistic Voice Notes from Companion Profiles
  public getCompanionVoiceNotes(profileName: string): { caption: string; duration: number }[] {
    const nick = profileName.split(' ')[0];
    return [
      {
        caption: `শুনছো? তোমার মেসেজ না পেলে মনটা খারাপ লাগে। কী করছো এখন বলো না? ❤️`,
        duration: 5
      },
      {
        caption: `হ্যালো! আজকের দিনটা কেমন কাটলো তোমার? আমার কথা কি একবারও মনে পড়েছিল? 😉`,
        duration: 4
      },
      {
        caption: `আমি তোমার মেসেজের অপেক্ষায় আছি। অবসর পেলে কিন্তু আমাকে একটা মিষ্টি কল দিও, কেমন? 📞`,
        duration: 5
      },
      {
        caption: `ভালোবাসি তোমাকে! নিজের ঠিকমতো যত্ন নিয়ো কিন্তু, সময়মতো খেয়ে নিয়ো। ❤️`,
        duration: 4
      }
    ];
  }
}

export const voiceService = new VoiceService();
