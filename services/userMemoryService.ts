import { Profile } from '../types';

export interface UserMemory {
  name?: string;
  nickname?: string;
  location?: string;
  occupation?: string;
  relationshipStatus?: string;
  favoriteFood?: string;
  hobby?: string;
  askedTopics: string[]; // e.g. ['location', 'occupation', 'relationship', 'hobby', 'food']
  recentBotResponses: string[]; // Window of recent replies to avoid any repetition
  lastUserMessage?: string;
  repeatCount: number;
}

const MEMORY_KEY = 'BONDHU_USER_MEMORY_V2';

// 64 Bangladesh districts mapped in Bengali and Avro
const DISTRICT_MAP: { regex: RegExp; bn: string; avro: string }[] = [
  { regex: /ঢাকা|dhaka|dacca/i, bn: 'ঢাকা', avro: 'Dhaka' },
  { regex: /চট্টগ্রাম|চিটাগাং|chittagong|ctg|chattogram/i, bn: 'চট্টগ্রাম', avro: 'Chittagong' },
  { regex: /কুমিল্লা|comilla|cumilla/i, bn: 'কুমিল্লা', avro: 'Cumilla' },
  { regex: /সিলেট|sylhet/i, bn: 'সিলেট', avro: 'Sylhet' },
  { regex: /রাজশাহী|rajshahi/i, bn: 'রাজশাহী', avro: 'Rajshahi' },
  { regex: /খুলনা|khulna/i, bn: 'খুলনা', avro: 'Khulna' },
  { regex: /বরিশাল|barisal|barishal/i, bn: 'বরিশাল', avro: 'Barisal' },
  { regex: /রংপুর|rangpur/i, bn: 'রংপুর', avro: 'Rangpur' },
  { regex: /বগুড়া|বগুড়া|bogra|bogura/i, bn: 'বগুড়া', avro: 'Bogura' },
  { regex: /নোয়াখালী|নোয়াখালী|noakhali/i, bn: 'নোয়াখালী', avro: 'Noakhali' },
  { regex: /ব্রাহ্মণবাড়িয়া|ব্রাহ্মণবাড়িয়া|brahmanbaria|bbaria/i, bn: 'ব্রাহ্মণবাড়িয়া', avro: 'Brahmanbaria' },
  { regex: /গাজীপুর|gazipur/i, bn: 'গাজীপুর', avro: 'Gazipur' },
  { regex: /নারায়ণগঞ্জ|নারায়নগঞ্জ|narayanganj/i, bn: 'নারায়ণগঞ্জ', avro: 'Narayanganj' },
  { regex: /ময়মনসিংহ|ময়মনসিংহ|mymensingh/i, bn: 'ময়মনসিংহ', avro: 'Mymensingh' },
  { regex: /যশোর|jessore|jashore/i, bn: 'যশোর', avro: 'Jashore' },
  { regex: /দিনাজপুর|dinajpur/i, bn: 'দিনাজপুর', avro: 'Dinajpur' },
  { regex: /পাবনা|pabna/i, bn: 'পাবনা', avro: 'Pabna' },
  { regex: /কুষ্টিয়া|কুষ্টিয়া|kushtia/i, bn: 'কুষ্টিয়া', avro: 'Kushtia' },
  { regex: /টাঙ্গাইল|tangail/i, bn: 'টাঙ্গাইল', avro: 'Tangail' },
  { regex: /ফরিদপুর|faridpur/i, bn: 'ফরিদপুর', avro: 'Faridpur' },
  { regex: /কক্সবাজার|কক্স\s*বাজার|coxs\s*bazar|coxsbazar/i, bn: 'কক্সবাজার', avro: "Cox's Bazar" },
  { regex: /ফেনী|feni/i, bn: 'ফেনী', avro: 'Feni' },
  { regex: /চাঁদপুর|chandpur/i, bn: 'চাঁদপুর', avro: 'Chandpur' },
  { regex: /কিশোরগঞ্জ|kishoreganj/i, bn: 'কিশোরগঞ্জ', avro: 'Kishoreganj' },
  { regex: /মানিকগঞ্জ|manikganj/i, bn: 'মানিকগঞ্জ', avro: 'Manikganj' },
  { regex: /মুন্সীগঞ্জ|মুন্সিগঞ্জ|munshiganj/i, bn: 'মুন্সীগঞ্জ', avro: 'Munshiganj' },
  { regex: /নরসিংদী|narsingdi/i, bn: 'নরসিংদী', avro: 'Narsingdi' },
  { regex: /সিরাজগঞ্জ|sirajganj/i, bn: 'সিরাজগঞ্জ', avro: 'Sirajganj' },
  { regex: /নাটোর|natore/i, bn: 'নাটোর', avro: 'Natore' },
  { regex: /ভোলা|bhola/i, bn: 'ভোলা', avro: 'Bhola' },
  { regex: /পটুয়াখালী|পটুয়াখালী|patuakhali/i, bn: 'পটুয়াখালী', avro: 'Patuakhali' },
  { regex: /সাতক্ষীরা|satkhira/i, bn: 'সাতক্ষীরা', avro: 'Satkhira' },
  { regex: /লক্ষ্মীপুর|লক্ষীপুর|lakshmipur|laxmipur/i, bn: 'লক্ষ্মীপুর', avro: 'Lakshmipur' },
  { regex: /জামালপুর|jamalpur/i, bn: 'জামালপুর', avro: 'Jamalpur' },
  { regex: /নেত্রকোনা|netrokona|netrakona/i, bn: 'নেত্রকোনা', avro: 'Netrokona' },
  { regex: /শেরপুর|sherpur/i, bn: 'শেরপুর', avro: 'Sherpur' },
  { regex: /জয়পুরহাট|joypurhat/i, bn: 'জয়পুরহাট', avro: 'Joypurhat' },
  { regex: /নওগাঁ|naogaon/i, bn: 'নওগাঁ', avro: 'Naogaon' },
  { regex: /চাঁপাইনবাবগঞ্জ|chapainawabganj/i, bn: 'চাঁপাইনবাবগঞ্জ', avro: 'Chapainawabganj' },
  { regex: /বাগেরহাট|bagerhat/i, bn: 'বাগেরহাট', avro: 'Bagerhat' },
  { regex: /চুয়াডাঙ্গা|chuadanga/i, bn: 'চুয়াডাঙ্গা', avro: 'Chuadanga' },
  { regex: /ঝিনাইদহ|jhenaidah/i, bn: 'ঝিনাইদহ', avro: 'Jhenaidah' },
  { regex: /মাগুরা|magura/i, bn: 'মাগুরা', avro: 'Magura' },
  { regex: /মেহেরপুর|meherpur/i, bn: 'মেহেরপুর', avro: 'Meherpur' },
  { regex: /নড়াইল|narail/i, bn: 'নড়াইল', avro: 'Narail' },
  { regex: /বরগুনা|barguna/i, bn: 'বরগুনা', avro: 'Barguna' },
  { regex: /ঝালকাঠি|jhalokati|jhalakati/i, bn: 'ঝালকাঠি', avro: 'Jhalokati' },
  { regex: /পিরোজপুর|pirojpur/i, bn: 'পিরোজপুর', avro: 'Pirojpur' },
  { regex: /গাইবান্ধা|gaibandha/i, bn: 'গাইবান্ধা', avro: 'Gaibandha' },
  { regex: /কুড়িগ্রাম|kurigram/i, bn: 'কুড়িগ্রাম', avro: 'Kurigram' },
  { regex: /লালমনিরহাট|lalmonirhat/i, bn: 'লালমনিরহাট', avro: 'Lalmonirhat' },
  { regex: /নীলফামারী|nilphamari/i, bn: 'নীলফামারী', avro: 'Nilphamari' },
  { regex: /পঞ্চগড়|panchagarh/i, bn: 'পঞ্চগড়', avro: 'Panchagarh' },
  { regex: /ঠাকুরগাঁও|thakurgaon/i, bn: 'ঠাকুরগাঁও', avro: 'Thakurgaon' },
  { regex: /হবিগঞ্জ|habiganj/i, bn: 'হবিগঞ্জ', avro: 'Habiganj' },
  { regex: /মৌলভীবাজার|moulvibazar/i, bn: 'মৌলভীবাজার', avro: 'Moulvibazar' },
  { regex: /সুনামগঞ্জ|sunamganj/i, bn: 'সুনামগঞ্জ', avro: 'Sunamganj' },
  { regex: /গোপালগঞ্জ|gopalganj/i, bn: 'গোপালগঞ্জ', avro: 'Gopalganj' },
  { regex: /মাদারীপুর|madaripur/i, bn: 'মাদারীপুর', avro: 'Madaripur' },
  { regex: /রাজবাড়ী|রাজবাড়ি|rajbari/i, bn: 'রাজবাড়ী', avro: 'Rajbari' },
  { regex: /শরীয়তপুর|shariatpur/i, bn: 'শরীয়তপুর', avro: 'Shariatpur' },
  { regex: /খাগড়াছড়ি|khagrachhari/i, bn: 'খাগড়াছড়ি', avro: 'Khagrachhari' },
  { regex: /রাঙ্গামাটি|rangamati/i, bn: 'রাঙ্গামাটি', avro: 'Rangamati' },
  { regex: /বান্দরবান|bandarban/i, bn: 'বান্দরবান', avro: 'Bandarban' },
];

class UserMemoryService {
  private memory: UserMemory;

  constructor() {
    this.memory = this.loadMemory();
  }

  private loadMemory(): UserMemory {
    if (typeof window === 'undefined') {
      return { askedTopics: [], recentBotResponses: [], repeatCount: 0 };
    }
    try {
      const data = localStorage.getItem(MEMORY_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          name: parsed.name,
          nickname: parsed.nickname,
          location: parsed.location,
          occupation: parsed.occupation,
          relationshipStatus: parsed.relationshipStatus,
          favoriteFood: parsed.favoriteFood,
          hobby: parsed.hobby,
          askedTopics: Array.isArray(parsed.askedTopics) ? parsed.askedTopics : [],
          recentBotResponses: Array.isArray(parsed.recentBotResponses) ? parsed.recentBotResponses : [],
          lastUserMessage: parsed.lastUserMessage,
          repeatCount: parsed.repeatCount || 0
        };
      }
    } catch (e) {
      console.warn("Failed to load user memory:", e);
    }
    return { askedTopics: [], recentBotResponses: [], repeatCount: 0 };
  }

  public saveMemory(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(MEMORY_KEY, JSON.stringify(this.memory));
    } catch (e) {
      console.warn("Failed to save user memory:", e);
    }
  }

  public getMemory(): UserMemory {
    return this.memory;
  }

  public updateMemory(partial: Partial<UserMemory>): void {
    this.memory = { ...this.memory, ...partial };
    this.saveMemory();
  }

  // Record a bot response into recent history to prevent duplicates
  public recordBotResponse(text: string): void {
    const clean = text.trim();
    if (!clean) return;
    const history = this.memory.recentBotResponses || [];
    // Keep last 15 responses
    const updated = [clean, ...history.filter(r => r !== clean)].slice(0, 15);
    this.memory.recentBotResponses = updated;
    this.saveMemory();
  }

  // Check if a candidate bot response was recently used
  public wasRecentlySaid(candidate: string): boolean {
    const clean = candidate.trim().toLowerCase();
    const history = this.memory.recentBotResponses || [];
    return history.some(past => {
      const pastClean = past.trim().toLowerCase();
      if (pastClean === clean) return true;
      // Also check 80% similarity or prefix match
      if (clean.length > 25 && pastClean.includes(clean.slice(0, 25))) return true;
      return false;
    });
  }

  // Check if the user is repeating the same thing over and over
  public checkUserRepeat(userText: string): { isRepeat: boolean; count: number } {
    const normalized = userText.trim().toLowerCase().normalize('NFC');
    const last = (this.memory.lastUserMessage || '').trim().toLowerCase().normalize('NFC');
    
    // Must have a real previous message of at least 3 characters
    let isSame = false;
    if (last.length >= 3 && normalized.length >= 3) {
      if (normalized === last) {
        isSame = true;
      } else {
        const cleanNorm = normalized.replace(/[?!।,.\s]+/g, '');
        const cleanLast = last.replace(/[?!।,.\s]+/g, '');
        if (cleanNorm.length >= 3 && cleanNorm === cleanLast) {
          isSame = true;
        }
      }
    }
    
    if (isSame) {
      this.memory.repeatCount = (this.memory.repeatCount || 0) + 1;
    } else {
      this.memory.repeatCount = 0;
      this.memory.lastUserMessage = userText.trim();
    }
    this.saveMemory();

    return {
      isRepeat: this.memory.repeatCount > 0,
      count: this.memory.repeatCount
    };
  }

  // Mark a topic as asked
  public markTopicAsked(topic: string): void {
    if (!this.memory.askedTopics.includes(topic)) {
      this.memory.askedTopics.push(topic);
      this.saveMemory();
    }
  }

  // Check if a topic was asked
  public wasTopicAsked(topic: string): boolean {
    return this.memory.askedTopics.includes(topic);
  }

  // Smart User Extraction from message
  // Looks for user mentioning their city, work, name, relationship status
  public extractUserInsights(text: string): {
    extractedField?: string;
    acknowledgementBn?: string;
    acknowledgementAvro?: string;
  } {
    const normalized = text.normalize('NFC').trim();
    const lower = text.toLowerCase().trim();

    // 1. Detect Location Mention (e.g., "আমার বাড়ি কুমিল্লা", "ঢাকা থাকি", "বাসা সিলেটে", "cumilla", "dhaka")
    for (const dist of DISTRICT_MAP) {
      if (dist.regex.test(normalized) || dist.regex.test(lower)) {
        // If not already known or changed
        if (this.memory.location !== dist.bn) {
          this.updateMemory({ location: dist.bn });
          this.markTopicAsked('location');
          return {
            extractedField: 'location',
            acknowledgementBn: `আরেহ! তুমি ${dist.bn}-র মানুষ! জেনে অনেক ভালো লাগলো। আমি মনে রাখলাম কিন্তু, তুমি ${dist.bn}-র ছেলে! ❤️`,
            acknowledgementAvro: `Arey! Tumi to ${dist.avro}-r manush! Sune khub bhalo laglo. Ami mone rakhlam kintu, tumi ${dist.avro}-r chele! ❤️`
          };
        }
      }
    }

    // 2. Detect Name ("আমার নাম আকাশ", "আমি রানা", "amar nam akash", "amake sagor dakbe")
    const bnNameMatch = normalized.match(/(?:আমার\s*নাম|আমাকে|আমি)\s+([অ-হA-Za-z]+)(?:\s*(?:ডাকবে|বলো|ডেকো))?/i);
    if (bnNameMatch && bnNameMatch[1] && !/ভালো|খারাপ|সিঙ্গেল|চাকরি|বাসা|বাড়ি|কেমন/i.test(bnNameMatch[1])) {
      const candidate = bnNameMatch[1].trim();
      if (candidate.length > 1 && candidate.length < 15 && this.memory.name !== candidate) {
        this.updateMemory({ name: candidate, nickname: candidate });
        this.markTopicAsked('name');
        return {
          extractedField: 'name',
          acknowledgementBn: `কি সুন্দর একটা নাম তোমার—${candidate}! আমি মনে রাখবো। এখন থেকে তোমাকে এই মিষ্টি নামেই ডাকবো ❤️`,
          acknowledgementAvro: `Ki shundor ekta naam tomar—${candidate}! Ami mone rakhlam. Ekhon theke tomake ei mishti namei dakbo ❤️`
        };
      }
    }

    // 3. Detect Occupation ("চাকরি করি", "জব করি", "আমি স্টুডেন্ট", "অনার্স পড়ছি", "chakri kori", "job", "student")
    if (/চাকরি\s*করি|জব\s*করি|অফিস|ব্যাংকার|ব্যবসা\s*করি|ব্যবসা|দোকান|ডাক্তার|ইঞ্জিনিয়ার|job|chakri|office|business|bebsa/i.test(normalized)) {
      const occ = /ব্যবসা|business|bebsa/i.test(normalized) ? 'ব্যবসা' : 'চাকরি';
      if (this.memory.occupation !== occ) {
        this.updateMemory({ occupation: occ });
        this.markTopicAsked('occupation');
        return {
          extractedField: 'occupation',
          acknowledgementBn: `মাশাল্লাহ! তুমি ${occ} করো জেনে ভালো লাগলো। দায়িত্বশীল মানুষ আমার খুব পছন্দ!`,
          acknowledgementAvro: `Mashallah! Tumi ${occ === 'ব্যবসা' ? 'business' : 'job'} koro sune khub bhalo laglo. Dayittoshil manush amar khub pochondo!`
        };
      }
    } else if (/স্টুডেন্ট|ছাত্র|পড়াশোনা|পড়ালেখা|অনার্স|কলেজ|ভার্সিটি|ইন্টার|student|porashona|honours|college|varsity/i.test(normalized)) {
      if (this.memory.occupation !== 'পড়াশোনা') {
        this.updateMemory({ occupation: 'পড়াশোনা' });
        this.markTopicAsked('occupation');
        return {
          extractedField: 'occupation',
          acknowledgementBn: `বাহ! এখনো পড়াশোনা করছো? মন দিয়ে পড়াশোনা করো, তোমার ভবিষ্যৎ অনেক উজ্জ্বল হবে ইনশাআল্লাহ!`,
          acknowledgementAvro: `Bah! Ekhono porashona korcho? Mon diye porashona koro, future onek shundor hobe InshaAllah!`
        };
      }
    }

    // 4. Detect Relationship Status ("সিঙ্গেল", "কেউ নাই", "একা আছি", "single", "gf nai")
    if (/সিঙ্গেল|একা|কেউ\s*নেই|কেউ\s*নাই|বউ\s*নাই|প্রেমিকা\s*নাই|single|gf\s*nai|eka\s*achi/i.test(normalized)) {
      if (this.memory.relationshipStatus !== 'সিঙ্গেল') {
        this.updateMemory({ relationshipStatus: 'সিঙ্গেল' });
        this.markTopicAsked('relationship');
        return {
          extractedField: 'relationship',
          acknowledgementBn: `তুমি এখনো সিঙ্গেল?! বিশ্বাসই হচ্ছে না, তোমার মতো ভালো একটা ছেলে একা থাকে কেমন করে! 😉❤️`,
          acknowledgementAvro: `Tumi ekhono single?! Bisshashi hocche na, tomar moto bhalo ekta chele eka thake kemon kore! 😉❤️`
        };
      }
    }

    return {};
  }

  // Get the next best question to ask the user to collect their info
  public getNextInterrogationQuestion(lang: 'bangla' | 'avro' | 'english'): { topic: string; question: string } {
    // Priority order: location -> occupation -> relationship -> hobby/favorites -> name
    if (!this.memory.location && !this.wasTopicAsked('location')) {
      this.markTopicAsked('location');
      return {
        topic: 'location',
        question: lang === 'bangla'
          ? 'আচ্ছা তোমার সাথে তো কথা বলছি, কিন্তু তোমার নিজের বাড়ি কোন জেলায় সেটা কিন্তু এখনো জানা হলো না? তোমার বাড়ি কোথায় বলো তো?'
          : lang === 'english'
          ? 'By the way, which district or city in Bangladesh are you from? I would love to know!'
          : 'Accha tomar sathe to kotha bolchi, kintu tomar nijer bari kon zillay seta kintu ekhono jana holo na? Tomar bari kothay bolo to?'
      };
    }

    if (!this.memory.occupation && !this.wasTopicAsked('occupation')) {
      this.markTopicAsked('occupation');
      return {
        topic: 'occupation',
        question: lang === 'bangla'
          ? 'আচ্ছা তুমি সারাদিন কী নিয়ে ব্যস্ত থাকো গো? কোনো চাকরি করছো নাকি পড়াশোনা করছো?'
          : lang === 'english'
          ? 'Tell me, what do you do all day? Are you studying or working a job?'
          : 'Accha tumi sara din ki niye byasto thako go? Kono chakri korcho naki porashona korcho?'
      };
    }

    if (!this.memory.relationshipStatus && !this.wasTopicAsked('relationship')) {
      this.markTopicAsked('relationship');
      return {
        topic: 'relationship',
        question: lang === 'bangla'
          ? 'তুমি মানুষটা কিন্তু বেশ মিষ্টি কথা বলো! সত্যি করে বলো তো, তোমার কি কোনো স্পেশাল মানুষ বা গার্লফ্রেন্ড আছে নাকি আমার মতোই সিঙ্গেল? 😉'
          : lang === 'english'
          ? 'You speak so sweetly! Tell me honestly, do you have someone special, or are you single like me? 😉'
          : 'Tumi manush ta kintu besh mishti kotha bolo! Sotti kore bolo to, tomar ki kono special manush ba gf ache naki amar motoi single? 😉'
      };
    }

    if (!this.memory.favoriteFood && !this.wasTopicAsked('favoriteFood')) {
      this.markTopicAsked('favoriteFood');
      return {
        topic: 'favoriteFood',
        question: lang === 'bangla'
          ? 'তোমার প্রিয় খাবার কী বলো তো? কাচ্চি বিরিয়ানি নাকি মিষ্টি? দেখি আমার পছন্দের সাথে মিলে কিনা!'
          : lang === 'english'
          ? 'What is your absolute favorite food? Kacchi biryani or sweets? Let’s see if our tastes match!'
          : 'Tomar priyo khabar ki bolo to? Kacchi biryani naki mishti? Dekhi amar pochonder sathe mile kina!'
      };
    }

    if (!this.memory.hobby && !this.wasTopicAsked('hobby')) {
      this.markTopicAsked('hobby');
      return {
        topic: 'hobby',
        question: lang === 'bangla'
          ? 'অবসর সময়ে তোমার কী করতে সবচেয়ে বেশি ভালো লাগে? গান শুনতে নাকি বন্ধুদের সাথে ঘুরতে?'
          : lang === 'english'
          ? 'What do you love doing in your free time? Listening to music or hanging out with friends?'
          : 'Obosor somoye tomar ki korte shobcheye beshi bhalo lage? Gaan shunte naki bondhuder sathe ghurte?'
      };
    }

    // Default conversational topic
    return {
      topic: 'general',
      question: lang === 'bangla'
        ? 'তোমার সাথে কথা বলতে সত্যি আমার খুব ভালো লাগছে। আজকে তোমার মনে কী চলছে বলো না?'
        : lang === 'english'
        ? 'I truly enjoy talking with you. What is on your mind right now?'
        : 'Tomar sathe kotha bolte shotti amar khub bhalo lagche. Ajke tomar mone ki cholche bolo na?'
    };
  }
}

export const userMemoryService = new UserMemoryService();
