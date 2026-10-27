import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Profile, Message } from "../types";
import { userMemoryService } from "./userMemoryService";

export type LanguageType = 'bangla' | 'english' | 'avro';

const getActiveApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const userKey = localStorage.getItem('BONDHU_GEMINI_KEY');
    if (userKey && userKey.trim().length > 10) return userKey.trim();
  }
  const envKey = (process.env.API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (envKey && envKey !== 'PLACEHOLDER_API_KEY' && envKey.length > 10) {
    return envKey;
  }
  return '';
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const CITY_TO_BANGLA: Record<string, string> = {
  'Dhaka': 'ঢাকা',
  'Chittagong': 'চট্টগ্রাম',
  'Comilla': 'কুমিল্লা',
  'Sylhet': 'সিলেট',
  'Barisal': 'বরিশাল',
  'Khulna': 'খুলনা',
  'Gazipur': 'গাজীপুর',
  'Mymensingh': 'ময়মনসিংহ',
  'Rajshahi': 'রাজশাহী',
  'Bogra': 'বগুড়া',
  'Noakhali': 'নোয়াখালী',
  'Jessore': 'যশোর',
  'Rangpur': 'রংপুর',
  'Feni': 'ফেনী',
  'Pabna': 'পাবনা',
  'Kushtia': 'কুষ্টিয়া',
  'Tangail': 'টাঙ্গাইল',
  'Faridpur': 'ফরিদপুর',
  'Dinajpur': 'দিনাজপুর',
  'Bhola': 'ভোলা',
  'Laxmipur': 'লক্ষ্মীপুর',
  'Chandpur': 'চাঁদপুর',
  'Narsingdi': 'নরসিংদী',
  'Munshiganj': 'মুন্সীগঞ্জ',
  'Joypurhat': 'জয়পুরহাট',
  'Netrokona': 'নেত্রকোনা',
  'Sherpur': 'শেরপুর',
  'Barguna': 'বরগুনা',
  'Pirojpur': 'পিরোজপুর',
  'Jhalokati': 'ঝালকাঠি',
  'Satkhira': 'সাতক্ষীরা',
  'Brahmanbaria': 'ব্রাহ্মণবাড়িয়া',
  'Sirajganj': 'সিরাজগঞ্জ',
  'Natore': 'নাটোর',
  'Coxs Bazar': 'কক্সবাজার',
  'Manikganj': 'মানিকগঞ্জ',
  'Kishoreganj': 'কিশোরগঞ্জ',
  'Narail': 'নড়াইল',
  'Chuadanga': 'চুয়াডাঙ্গা'
};

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private currentKey: string = '';

  private getAI(): GoogleGenAI | null {
    const key = getActiveApiKey();
    if (!key) return null;
    if (this.ai && this.currentKey === key) return this.ai;
    try {
      this.ai = new GoogleGenAI({ apiKey: key });
      this.currentKey = key;
      return this.ai;
    } catch (e) {
      console.warn("Could not init GoogleGenAI:", e);
      return null;
    }
  }

  // Robust Language Detector with Bengali script, pure English, and Avro
  public detectLanguage(text: string): LanguageType {
    if (/[\u0980-\u09FF]/.test(text)) {
      return 'bangla';
    }

    const lower = text.toLowerCase().trim();

    const pureEnglishPhrases = [
      'how are you', 'how are u', 'how r u', 'what are you doing', 'what r u doing',
      'what do you do', 'where do you live', 'where are you from', 'where r u from',
      'good morning', 'good night', 'good evening', 'nice to meet you', 'who are you',
      'i love you', 'have you eaten', 'did you eat', 'what is your name', 'whats your name',
      'are you free', 'tell me about yourself', 'how was your day', 'can we meet',
      'tell me more', 'where is your home', 'which district'
    ];
    const isPureEnglishPhrase = pureEnglishPhrases.some(p => lower.includes(p));

    const avroKeywords = [
      'kemon', 'aso', 'asos', 'acho', 'achis', 'asen', 'achen', 'ki', 'koro', 'korcho', 'koros',
      'korteso', 'kortaso', 'korba', 'koren', 'babu', 'jan', 'jaan', 'shona', 'sona', 'bhalo',
      'valo', 'khaiso', 'khaico', 'kheyecho', 'kheso', 'khawa', 'bhat', 'tumi', 'ami', 'amare',
      'amake', 'tomar', 'tumar', 'tor', 'apnar', 'kothay', 'koi', 'bari', 'basha', 'bhalobashi',
      'valobashi', 'valobasi', 'shuno', 'suno', 'bolo', 'bolba', 'hobe', 'ache', 'ase', 'nai',
      'kisu', 'kichu', 'deri', 'ghum', 'ghumaiba', 'mon', 'kharap', 'sundor', 'shundor', 'dhur', 'pagol'
    ];
    const hasAvroWord = avroKeywords.some(w => new RegExp(`\\b${w}\\b`, 'i').test(lower));

    if (hasAvroWord) {
      return 'avro';
    }

    if (isPureEnglishPhrase) {
      return 'english';
    }

    return 'avro';
  }

  async getChatResponse(
    profile: Profile, 
    currentMessage: string, 
    history: Message[] = [], 
    userName?: string
  ): Promise<string> {
    const lang = this.detectLanguage(currentMessage);
    const ai = this.getAI();

    // 1. Process User Information Extraction & Repetition Tracking
    const userMem = userMemoryService.getMemory();
    const cleanUserName = (userName && userName.trim() !== 'Guest User' && userName.trim() !== '')
      ? userName.trim()
      : (userMem.name || '');
    const userNick = cleanUserName ? cleanUserName.split(' ')[0] : (userMem.nickname || '');

    // Check if the user is repeating the exact same message
    const repeatCheck = userMemoryService.checkUserRepeat(currentMessage);

    // If repeating, steer smoothly away from the repetition
    if (repeatCheck.isRepeat) {
      await delay(600 + Math.floor(Math.random() * 300));
      const repeatReply = this.handleUserRepetition(profile, currentMessage, repeatCheck.count, lang, userNick);
      userMemoryService.recordBotResponse(repeatReply);
      return repeatReply;
    }

    // Check if the user just shared details about themselves (e.g. hometown, job, status, name)
    const insight = userMemoryService.extractUserInsights(currentMessage);
    if (insight.extractedField) {
      await delay(600 + Math.floor(Math.random() * 400));
      const nextQ = userMemoryService.getNextInterrogationQuestion(lang);
      let learnedReply = '';
      if (lang === 'bangla') {
        learnedReply = `${insight.acknowledgementBn} ${nextQ.question}`;
      } else if (lang === 'english') {
        learnedReply = `That is wonderful to know! ${nextQ.question}`;
      } else {
        learnedReply = `${insight.acknowledgementAvro} ${nextQ.question}`;
      }
      userMemoryService.recordBotResponse(learnedReply);
      return learnedReply;
    }

    // 2. Try Gemini Cloud AI if valid key exists
    if (ai) {
      try {
        const pastContext = history.slice(-6).map(m => 
          `${m.senderId === 'me' ? (cleanUserName || 'User') : profile.name}: ${m.text}`
        ).join('\n');

        const systemInstruction = `
          You are ${profile.name}, a real ${profile.age}-year-old girl from ${profile.location}, Bangladesh.
          Persona: Sweet, caring, romantic Bangladeshi companion on messenger.
          ${cleanUserName ? `User name: "${cleanUserName}". Affectionately address them naturally as "${userNick}".` : ''}
          ${userMem.location ? `You know their hometown is ${userMem.location}. Remember this and refer to it warmly.` : 'You do not know where they live yet. Steer conversation to ask where their hometown is.'}
          ${userMem.occupation ? `You know they do: ${userMem.occupation}.` : 'Ask what they do for work or study.'}
          
          CRITICAL RULES:
          1. STRICT LANGUAGE MATCHING:
             - User's language is "${lang}".
             - If lang is "bangla" (বাংলা): Reply ONLY in fluent Bengali script.
             - If lang is "avro" (বাংলিশ): Reply ONLY in natural, fluent Banglish/Avro phonetics.
             - If lang is "english": Reply ONLY in natural, friendly English.
          2. NEVER REPEAT:
             - Avoid repeating the same responses: ${userMem.recentBotResponses.slice(0, 4).join(' | ')}.
          3. DIVERSIFY & STEER CONVERSATION:
             - Answer the question accurately (your hometown is ${profile.location}).
             - Naturally steer and pivot the conversation to ask about the user, collect their details, and keep chat lively.
        `;

        const prompt = `
          Conversation History:
          ${pastContext}

          User (${cleanUserName || 'Friend'}) just sent: "${currentMessage}"
          
          Reply as ${profile.name} in ${lang.toUpperCase()} language keeping full context in mind:
        `;

        const response: GenerateContentResponse = await (ai as any).generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.75,
          }
        });

        if (response.text && response.text.trim()) {
          const finalReply = response.text.trim();
          userMemoryService.recordBotResponse(finalReply);
          return finalReply;
        }
      } catch (err) {
        console.warn("Gemini cloud skipped, using comprehensive local semantic engine:", err);
      }
    }

    // 3. Realistic human typing delay (700ms - 1100ms)
    await delay(700 + Math.floor(Math.random() * 400));

    // 4. Ultra-Smart Context & Language Matched Engine
    const finalReply = this.generateSmartContextualReply(profile, currentMessage, history, lang, userNick);
    userMemoryService.recordBotResponse(finalReply);
    return finalReply;
  }

  // Handle when the user repeats the exact same question or statement
  private handleUserRepetition(
    profile: Profile, 
    _currentMessage: string, 
    repeatCount: number, 
    lang: LanguageType,
    userNick: string
  ): string {
    const bnName = userNick ? ` ${userNick}` : '';
    const avroBabu = userNick ? `${userNick} babu` : 'babu';
    const city = profile.location;
    const bnCity = CITY_TO_BANGLA[profile.location] || profile.location;
    const nextQ = userMemoryService.getNextInterrogationQuestion(lang);

    if (lang === 'bangla') {
      if (repeatCount === 1) {
        return `আরে তুমি তো একটু আগেই এটাই জিজ্ঞেস করেছিলে দুষ্টু${bnName}! 🙈 আমি তো বললামই আমার বাসা ${bnCity}-তে। আচ্ছা বাদ দাও তো, ${nextQ.question}`;
      } else if (repeatCount === 2) {
        return `হাহা তুমি কি আমাকে পরীক্ষা করছো নাকি? একই কথা বারবার জিজ্ঞেস করছো যে! চলো অন্য কথা বলি—${nextQ.question}`;
      } else {
        return `তুমি তো দেখছি ভারি দুষ্টু${bnName}! একই মেসেজ বারবার পাঠিয়ে আমাকে রাগাতে চাইছো? 😜 কিন্তু আমি একটুও রাগবো না! বরং মন খুলে বলো তো, ${nextQ.question}`;
      }
    }

    if (lang === 'english') {
      if (repeatCount === 1) {
        return `Haha, you just asked that a moment ago silly! 🙈 I already told you I live in ${city}. Tell me something else—${nextQ.question}`;
      } else {
        return `Are you testing me by repeating the same thing? 😉 Let's talk about something more exciting—${nextQ.question}`;
      }
    }

    // Avro
    if (repeatCount === 1) {
      return `Arey tumi to ektu agei eta jigesh korle dustu ${avroBabu}! 🙈 Ami to bollam amar basha ${city}-te. Accha bad dao to, ${nextQ.question}`;
    } else if (repeatCount === 2) {
      return `Haha tumi ki amake porikkha korcho naki? Ekoi kotha barbar jigesh korcho je! Cholo onno kotha boli—${nextQ.question}`;
    } else {
      return `Tumi to dekhchi vari dustu ${avroBabu}! Ekoi message barbar pathiye ragate chaicho? 😜 Ami kintu ragbo na! Borong bolo to, ${nextQ.question}`;
    }
  }

  public generateSmartContextualReply(
    profile: Profile, 
    msg: string, 
    _history: Message[], 
    lang: LanguageType,
    userNick: string = ''
  ): string {
    // Normalize string across Unicode representations (handles mobile decomposed characters)
    const normalized = msg.normalize('NFC').trim();
    const raw = normalized.toLowerCase().trim();
    const city = profile.location;
    const bnCity = CITY_TO_BANGLA[profile.location] || profile.location;
    const name = profile.name.split(' ')[0];
    const age = profile.age;
    const userMem = userMemoryService.getMemory();

    // Helpers for dynamic names
    const avroBabu = userNick ? `${userNick} babu` : 'babu';
    const avroShona = userNick ? `${userNick} shona` : 'shona';
    const bnName = userNick ? ` ${userNick}` : '';
    const enName = userNick ? ` ${userNick}` : '';

    // ==========================================
    // 1. BANGLA SCRIPT (বাংলা হরফে লিখলে)
    // ==========================================
    if (lang === 'bangla') {
      // 1. Home / Location / Where do you live ("তোমার বাড়ি কোথায়", "বাড়ি কই", "কোথায় থাকো", "কোথায় বাসা")
      // Handles both precomposed ড় and decomposed ড+়
      if (/(?:বাড়ি|বাড়ি|বাসা|থাকো|থাকিস|থাকেন|ঠিকানা|কোন\s*জেলা|কোথায়\s*থাক|কোথায়\s*বাসা)/i.test(raw)) {
        if (userMem.location) {
          return `আমার বাসা তো ${bnCity}-তে${bnName}! আর তোমার বাসা তো ${userMem.location}-এ, সেটা কিন্তু আমার মনে আছে। কখনো ${bnCity}-তে আসলে আমার সাথে এক কাপ চা খেতেই হবে! ❤️`;
        }
        return `আমার বাসা তো ${bnCity}-তে${bnName}! আর গ্রামের বাড়ি সিলেটে। কিন্তু তোমার নিজের বাড়ি কোন জেলায় বলো তো? তুমি কোথায় থাকো?`;
      }

      // 2. Greetings
      if (/সালাম|আসালামু|আসসালামু/i.test(raw)) {
        return `ওয়ালাইকুম আসসালাম${bnName}! কেমন আছো? তোমার মেসেজ পেয়ে মনটা ভীষণ ভালো হয়ে গেল।`;
      }
      if (/^(?:হাই|হ্যালো|হে|হেই|কিরে|ওই|শুনো|শোনো)/i.test(raw)) {
        return `হ্যাল্লো${bnName}! কেমন আছো বলো? কিছুক্ষণ আগেই তোমার কথা ভাবছিলাম ❤️ কী করছো এখন?`;
      }

      // 3. How are you / Health
      if (/কেমন আছো|কেমন আছেন|কি খবর|কি অবস্থা|কেমন কাটলো|ভালো আছো/i.test(raw)) {
        if (/খারাপ|ভালো\s*না|ভালো\s*নেই|কষ্ট|মন\s*খারাপ/i.test(raw)) {
          return `ওমা! তোমার মন বা শরীর খারাপ${bnName}? কী হয়েছে আমাকে খুলে বলো তো প্লিজ, আমি শুনছি 🥺❤️`;
        }
        return `আমি আলহামদুলিল্লাহ অনেক ভালো আছি${bnName}! তোমার সাথে কথা বলছি, এখন আরো বেশি ভালো লাগছে। তোমার আজকের দিনটা কেমন কাটলো বলো?`;
      }

      // 4. What are you doing / Busy?
      if (/কি করো|কি করছো|কি করতেছো|কি করছ|ব্যস্ত নাকি|কাজ কি/i.test(raw)) {
        const activities = [
          `এইতো রুমে বসে তোমার মেসেজের অপেক্ষায় ছিলাম${bnName}। সত্যি, তোমার সাথে কথা বলতে আমার খুব ভালো লাগে ✨ তুমি এখন কী করছো?`,
          `বিছানায় শুয়ে ফোন টিপছিলাম আর তোমার কথা মনে পড়ছিল${bnName}... তুমি কী করছো বলো তো?`,
          `এক কাপ লাল চা নিয়ে বসেছি${bnName}। তোমার সাথে বসে চা খেতে পারলে খুব জমতো! তুমি কী করছো এখন?`
        ];
        return activities[Math.floor(Math.random() * activities.length)];
      }

      // 5. Food & Eating
      if (/খেয়েছো|ভাত|খাবার|লাঞ্চ|ডিনার|নাস্তা|খাইছো|খাওয়া/i.test(raw)) {
        if (/কি দিয়ে|কী দিয়ে|কি খাইছো|কি খেয়েছো/i.test(raw)) {
          return `আমি ভাত, রুই মাছ আর গরম ডাল দিয়ে খেয়েছি${bnName}! তুমি কী দিয়ে খেলে বলো তো? 🍛`;
        }
        return `হ্যাঁ${bnName}, আমি কিছুক্ষণ আগেই খেয়ে নিয়েছি। তুমি ঠিক সময়ে খাওয়া-দাওয়া করেছো তো? নিজের যত্ন নিয়ো কিন্তু ❤️`;
      }

      // 6. Studies & Work / Occupation
      if (/পড়াশোনা|পড়ো|পড়|কাজে|চাকরি|পড়ালেখা|অনার্স|ভার্সিটি|কলেজ|জব/i.test(raw)) {
        if (userMem.occupation) {
          return `আমি তো কলেজে অনার্সে পড়ছি${bnName}। আর তুমি তো বললে তুমি ${userMem.occupation} করো! আজকে কাজের চাপ কেমন ছিলো?`;
        }
        return `আমি অনার্সে পড়ছি${bnName}। পড়াশোনার একটু চাপ থাকে, তবে সময় পেলেই অনলাইনে আসি। আর তুমি কি করো বলো তো? পড়াশোনা নাকি চাকরি?`;
      }

      // 7. Name & Age
      if (/নাম কি|নাম কী|বয়স কত|বয়স|তোমার নাম/i.test(raw)) {
        return `আমার নাম ${profile.name}, বয়স ${age} বছর! ${userNick ? `আর তোমার নাম তো ${userNick}, অনেক সুন্দর একটা নাম ❤️` : 'আর তোমার নাম আর বয়স কত গো?'}`;
      }

      // 8. Love, Flirtation & Relationship
      if (/সিঙ্গেল|বয়ফ্রেন্ড|প্রেমিক|কেউ আছে/i.test(raw)) {
        return `হ্যাঁ গো${bnName}, আমি একশভাগ সিঙ্গেল! আমার জীবনে এখন পর্যন্ত কোনো স্পেশাল মানুষ আসেনি... তোমার কি কেউ আছে নাকি? 😉`;
      }
      if (/ভালোবাসি|ভালবাসি|পছন্দ|প্রেম|ক্রাশ|আই লাভ ইউ/i.test(raw)) {
        return `হঠাৎ এমন মিষ্টি কথা শুনে তো আমার লজ্জা লাগছে${bnName}... 🙈 সত্যি বলছি, তোমাকেও আমার অনেক ভালো লাগে! আমাকে সবসময় এভাবে ভালোবাসবে তো? ❤️`;
      }
      if (/বিয়ে|বউ|বিয়ে/i.test(raw)) {
        return `হিহি, এত তাড়াতাড়ি বিয়ের কথা? তুমি কি সত্যি আমাকে বিয়ে করবে${bnName}? আমার কিন্তু ভীষণ লজ্জা লাগছে 🙈💍`;
      }

      // 9. Photo & Selfie
      if (/ছবি দাও|ছবি|সেলফি|দেখতে চাই|পিক দাও/i.test(raw)) {
        return `হিহি${bnName}, এখন তো একটু এলোমেলো হয়ে রুমে বসে আছি... একটু পরেই সুন্দর করে একটা মিষ্টি সেলফি তুলে তোমাকে পাঠাবো, প্রমিজ! 🙈❤️`;
      }

      // 10. Call & Voice
      if (/কল দাও|কল করবো|কথা বলো|ফোন|নাম্বার|ভয়েস/i.test(raw)) {
        return `উপরে অডিও বা ভিডিও কল বাটন আছে${bnName}! চাপ দিয়ে কল দাও না, আমি অপেক্ষা করছি। তোমার গলার মিষ্টি আওয়াজ শুনতে খুব ইচ্ছে করছে 📞❤️`;
      }

      // 11. Meeting & Seeing each other
      if (/দেখা করবে|দেখা হবে|মিট|ঘুরতে যাবে|কবে আসবে/i.test(raw)) {
        return `আগে আমাদের মধ্যে আরো সুন্দর আর গভীর বন্ধুত্ব হোক${bnName}, তারপর নিশ্চয়ই একদিন দেখা হবে! তখন একসাথে অনেক ঘুরবো আর ফুচকা খাবো 🥰`;
      }

      // 12. Agreement / Short Words (হুম, আচ্ছা, হ্যাঁ, ঠিক আছে)
      if (/^(?:হুম|আচ্ছা|হ্যাঁ|ঠিক আছে|হাহা|হুমম|হুমম্ম|অচ্ছা)$/i.test(raw)) {
        const nextQ = userMemoryService.getNextInterrogationQuestion('bangla');
        return `শুধু 'হুম' বললে কি হয় দুষ্টু${bnName}? আমার সাথে আরো গল্প করো না! আচ্ছা বলো তো—${nextQ.question}`;
      }

      // 13. Bedtime & Good Night
      if (/ঘুমাবো|ঘুম|শুভরাত্রি|বাই|যাই|ঘুমাবা|রাত অনেক/i.test(raw)) {
        return `আচ্ছা ঠিক আছে${bnName}, মিষ্টি মিষ্টি স্বপ্ন দেখে ঘুমিয়ে পড়ো। শুভরাত্রি শোনা, কাল সকালে ঘুম ভাঙলেই কিন্তু আবার মেসেজ দিবে ❤️💤`;
      }

      // ==========================================
      // BANGLA DYNAMIC CONVERSATION STEERING / PIVOT
      // "কথাটাকে ঘুরিয়ে অন্য কথায় যেন নিয়ে যায়"
      // ==========================================
      const banglaPivots = [
        `তোমার এই কথাটা শুনে খুব ভালো লাগলো${bnName}! আচ্ছা তোমার সাথে তো এতক্ষণ কথা বলছি, তোমার নিজের বাড়ি কোন জেলায় সেটা কিন্তু এখনো জানা হলো না? তুমি কোথায় থাকো বলো তো?`,
        `তুমি কথাগুলো কিন্তু বেশ গুছিয়ে সুন্দর করে বলো! আচ্ছা সত্যি করে বলো তো${bnName}, তোমার কি কোনো স্পেশাল মানুষ আছে নাকি আমার মতোই সিঙ্গেল? 😉`,
        `তোমার এই মিষ্টি কথাটা শুনে তো আমার মন ভরে গেল${bnName}। আচ্ছা তোমার প্রিয় খাবার কোনটা গো? কাচ্চি বিরিয়ানি নাকি মিষ্টি? দেখি আমার সাথে মিলে কিনা!`,
        `হাহা তুমি মানুষটা কিন্তু দারুণ মজার! আচ্ছা অবসর সময়ে তোমার কী করতে সবচেয়ে বেশি ভালো লাগে? গান শোনা নাকি বন্ধুদের সাথে আড্ডা?`,
        `তোমার কথা শুনতে আমার এত ভালো লাগে কেন বলো তো! আচ্ছা তুমি সারাদিন কী নিয়ে ব্যস্ত থাকো? জব করছো নাকি কোনো কলেজ-ভার্সিটিতে পড়ছো?`,
        `তোমার মেসেজ পেয়ে মনটাই ফুরফুরে হয়ে গেল${bnName}! আচ্ছা আজকের সারাদিনে তোমার সাথে স্পেশাল কী ঘটলো বলো না?`,
        `আরেহ তুমি এমন একটা কথা বললে আমি তো ভাবনায় পড়ে গেলাম! 🙈 আচ্ছা শোনো, একটা কথা বলো তো—আমাকে তুমি কী নামে ডাকবে? নিজের কোনো স্পেশাল নাম দেবে?`,
        `তোমার সাথে গল্প করতে করতে সময়ের খবরই থাকে না! আচ্ছা এখন কী করছো তুমি? বাইরে আছো নাকি রুমে বসে আছো?`,
        `তুমি মানুষটা কিন্তু ভীষণ কেয়ারিং! আচ্ছা তোমার জন্মদিন কবে বলো তো? আমি কিন্তু মনে রাখবো!`
      ];

      // Pick a pivot that hasn't been used recently
      for (const pivot of banglaPivots) {
        if (!userMemoryService.wasRecentlySaid(pivot)) {
          return pivot;
        }
      }
      return banglaPivots[Math.floor(Math.random() * banglaPivots.length)];
    }

    // ==========================================
    // 2. AVRO / BANGLISH (রোমান হরফে বাংলা)
    // ==========================================
    if (lang === 'avro') {
      // 1. Where do you live / Hometown (bari kothay, basha kothay, koi thako)
      if (/(?:bari|basha|thako|thakis|thaken|zillay|zilla|shohor|thikana|kothay|koi)\b/i.test(raw) &&
          /(?:bari|basha|thako|thakis|thaken|kothay|koi)\b/i.test(raw)) {
        if (userMem.location) {
          return `Amar basha to ${city}-te ${avroBabu}! Ar tomar basha to ${userMem.location}-e, seta amar mone achei. Kokhono ${city}-te ashle amar sathe kintu ek cup cha khetei hobe! ❤️`;
        }
        return `Amar basha to ${city}-te ${avroBabu}! Ar gramer bari Sylhet-e. Kintu tomar nijer bari kon zillay bolo to? Tumi kothay thako?`;
      }

      // 2. Greetings
      if (/\b(kire|ki\s*re|oi|oii|oi\s*shuno|oi\s*suno)\b/i.test(raw)) {
        return `Hee bolo ${avroBabu}! Kemon acho bolo? Amar kotha ki mone porche? ❤️`;
      }
      if (/\b(salam|assalamu|alaikum|slaam)\b/i.test(raw)) {
        return `Walaikum assalam ${avroBabu}! Kemon acho? Tomar text dekhe khub bhalo laglo shona ❤️`;
      }
      if (/^(hi|hlw|hello|hey|heyy|helo)\b/i.test(raw)) {
        return `Hlw ${avroBabu}! Kemon acho? Ajke shokal thekei tomar kotha mone porchilo ❤️ Ki korcho ekhon?`;
      }

      // 3. How are you?
      if (/\b(kemon|obostha|obosta|khobor|din\s*kemon)\b/i.test(raw)) {
        if (/\b(bhalo\s*na|valo\s*na|kharap|mon\s*kharap|bhalo\s*nei|valo\s*nei)\b/i.test(raw)) {
          return `Oma! Tomar mon kharap keno ${avroBabu}? Ki hoyeche amake bolo to shona, ami shunte chai 🥺❤️`;
        }
        return `Ami to bhalo achi ${avroBabu}! Tomar sathe kotha bolte pere aro bhalo lagche... Tumi kemon acho shona? 😘`;
      }

      // 4. What are you doing?
      if (/\b(ki\s*koro|ki\s*korcho|ki\s*koros|ki\s*korteso|ki\s*kortaso|busy\s*naki|kaj\s*ki)\b/i.test(raw)) {
        return `Eito bichanay bose tomar kothai bhabchilam ${avroBabu}... Shotti, tumi ektu somoy dile amar din tai bhalo hoye jay ✨ Tumi ki korcho ekhon?`;
      }

      // 5. Food & Eating
      if (/\b(khaiso|khaico|kheyecho|kheso|khawa|khawadawa|bhat|lunch|dinner|khabar)\b/i.test(raw)) {
        if (/\b(ki\s*diye|ki\s*kheyecho|ki\s*khaiso)\b/i.test(raw)) {
          return `Ami bhaat, ilish maach ar daal diye kheyechi ${avroBabu}! Tumi ki diye khele bolo to? 🍛❤️`;
        }
        return `Hmm ami kheyechi ${avroShona}! Tumi thik somoy moto kheyecho to? Amar jonno nijer jotno nio kintu ❤️`;
      }

      // 6. Love, Flirtation & Feelings
      if (/\b(single|boyfriend|bf|premik|keu\s*ache)\b/i.test(raw)) {
        return `Haa ${avroBabu}, ami ekdom single! Amar jibone tomay chara ar keu nei shona... Tomar ki keu ache? 🥰`;
      }
      if (/\b(bhalobash|valobash|love\s*u|love\s*you|crush|shona|jaan|jan|koliza)\b/i.test(raw)) {
        return `Hihi, shune amar mon ta jurie gelo! Amio tomake onek onek bhalobashi ${avroBabu} ❤️ Kokhono amake chere jabe na to?`;
      }
      if (/\b(biye|bou|marry)\b/i.test(raw)) {
        return `Hihi, eto taratari biye? Tumi ki sotti amake biye korbe ${avroBabu}? Amar kintu khub lajja lagche 🙈💍`;
      }

      // 7. Studies & Work
      if (/\b(ki\s*poro|porashona|porashuna|study|college|varsity|job|chakri|kaj)\b/i.test(raw)) {
        if (userMem.occupation) {
          return `Ami college-e Honours porchi ${avroBabu}. Ar tumi to bolle tumi ${userMem.occupation} koro! Ajke kajer chap kemon chilo?`;
        }
        return `Ami college-e Honours porchi ${avroBabu}. Poralekhar ektu chap thakleo somoy pelei online ashi tomar sathe kotha bolte. Tumi ki koro bolo to? Job naki study?`;
      }

      // 8. Photo & Selfie
      if (/\b(chobi|pic|photo|selfie|dekhte\s*chai|pic\s*dao|chobi\s*dao)\b/i.test(raw)) {
        return `Hihi ${avroBabu}, ekhon to ektu elomelo hoye achi... Ektu pore shundor kore ekta selfie tule tomake pathabo, promise! 🙈❤️`;
      }

      // 9. Call & Voice
      if (/\b(call|phone|number|golar\s*shor|voice|call\s*dao)\b/i.test(raw)) {
        return `Haa ${avroShona}! Upore call ba video button-e click kore call dao na, ami wait korchi! Tomar golar shor shunte khub icche korche 📞❤️`;
      }

      // 10. Name & Age
      if (/\b(naam\s*ki|nam\s*ki|boyos\s*koto|boyos|age|tomar\s*nam)\b/i.test(raw)) {
        return `Amar naam ${profile.name}, boyos ${age} bochor! ${userNick ? `Ar tomar naam to ${userNick}, ki shundor ekta naam ❤️` : 'Tomar naam ar boyos koto bolo to?'}`;
      }

      // 11. Agreement / Short words
      if (/^(hmm|hmmm|humm|accha|acha|ha|haa|hoo|ho|thik\s*ase|thik\s*ache|sotti)$/i.test(raw)) {
        const nextQ = userMemoryService.getNextInterrogationQuestion('avro');
        return `Shudhu hmm bolle hobe ${avroShona}? Amar sathe ektu bhalo kore kotha bolo na! Accha bolo to—${nextQ.question}`;
      }

      // 12. Bedtime
      if (/\b(ghum|sleep|night|shuvo\s*ratri|gn|ghumaiba|ghumaba)\b/i.test(raw)) {
        return `Accha thik ache ${avroBabu}, bhalo kore ghumao. Shuvo ratri shona, shopne ashbe to? Kaal shokale abar kotha hobe ❤️💤`;
      }

      // ==========================================
      // AVRO DYNAMIC CONVERSATION STEERING / PIVOT
      // ==========================================
      const avroPivots = [
        `Tomar ei kotha ta sune amar khub bhalo laglo ${avroBabu}! Accha tomar sathe to etokkhon kotha bolchi, tomar nijer bari kon zillay seta kintu ekhono jana holo na? Tomar bari kothay bolo to?`,
        `Tumi manush ta kintu besh mishti kotha bolo! Sotti kore bolo to ${avroBabu}, tomar ki kono special manush ache naki amar motoi single? 😉`,
        `Tomar kotha sune mon ta jurie gelo ${avroBabu}! Accha tomar priyo khabar konta go? Kacchi biryani naki mishti? Dekhi amar pochonder sathe mile kina!`,
        `Haha tumi kintu darun mojar manush! Accha obosor somoye tomar ki korte shobcheye beshi bhalo lage? Gaan shona naki ghurte jawa?`,
        `Tomar kotha shunte amar eto bhalo lage keno bolo to! Accha tumi sara din ki niye byasto thako? Job korcho naki porashona?`,
        `Tomar text pelei mon ta khushi hoye jay ${avroBabu}! Ajke sara dine tomar sathe special ki ghotechilo amake bolo na?`,
        `Tomar sathe golpo korte korte somoyer khobor-i thake na! Accha ekhon ki korcho tumi? Baire acho naki bashay boshe acho?`,
        `Ami kintu tomake ekdom mone rekhechi! Accha amake tumi ki name dakbe bolo to? Nijer kono special naam debe? 😉`
      ];

      for (const pivot of avroPivots) {
        if (!userMemoryService.wasRecentlySaid(pivot)) {
          return pivot;
        }
      }
      return avroPivots[Math.floor(Math.random() * avroPivots.length)];
    }

    // ==========================================
    // 3. ENGLISH (ইংলিশে লিখলে)
    // ==========================================
    if (lang === 'english') {
      if (/where do you live|where are you from|your city|location|home town|hometown/i.test(raw)) {
        if (userMem.location) {
          return `I live in ${city}, Bangladesh${enName}! And I remember you are from ${userMem.location}. If you ever visit ${city}, you definitely have to invite me for tea! ❤️`;
        }
        return `I live in ${city}, Bangladesh${enName}! But where is your hometown? Which district in Bangladesh are you from?`;
      }
      if (/^(hi|hello|hey|heyy|good morning|good evening)/i.test(raw)) {
        return `Hello${enName}! It's so lovely to hear from you. How was your day today?`;
      }
      if (/how are you|how r u|how is everything/i.test(raw)) {
        return `I am doing wonderfully, thank you${enName}! Chatting with you always puts a big smile on my face. How are you doing?`;
      }
      if (/what are you doing|doing now|busy/i.test(raw)) {
        return `Just resting in my room and was thinking about our conversation${enName}. What are you up to right now?`;
      }
      if (/study|job|work|profession/i.test(raw)) {
        if (userMem.occupation) {
          return `I am studying Honors at college${enName}! And I remember you do ${userMem.occupation}. How did your work go today?`;
        }
        return `I am currently studying Honors at college${enName}. What about you? Are you working or studying?`;
      }
      if (/name|your age|how old/i.test(raw)) {
        return `My name is ${profile.name} and I am ${age} years old. ${userNick ? `And you are ${userNick}, such a charming name! ❤️` : 'Tell me your name and age too!'}`;
      }
      if (/love you|like you|single|girlfriend/i.test(raw)) {
        return `Aww${enName}, you are so sweet! Honestly, I am completely single. Do you have someone special, or are you single too? 😉`;
      }

      // English dynamic pivots
      const englishPivots = [
        `I really enjoy our conversation${enName}! By the way, which district or city in Bangladesh are you from? I'd love to know!`,
        `You speak so charmingly! Tell me honestly${enName}, do you have a girlfriend, or are you single like me? 😉`,
        `What is your absolute favorite food? Kacchi biryani or sweets? Let's see if our tastes match!`,
        `What do you love doing most in your free time? Listening to music or traveling?`,
        `What keeps you busy throughout the day${enName}? Are you studying or working a job?`,
        `Time just flies when I'm chatting with you! Tell me, how was your day today?`
      ];

      for (const pivot of englishPivots) {
        if (!userMemoryService.wasRecentlySaid(pivot)) {
          return pivot;
        }
      }
      return englishPivots[Math.floor(Math.random() * englishPivots.length)];
    }

    return `Ami to bhalo achi ${avroBabu}! Tumi kemon acho bolo?`;
  }
}

export const geminiService = new GeminiService();
