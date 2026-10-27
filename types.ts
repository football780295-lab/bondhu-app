
export interface Profile {
  id: string;
  name: string;
  location: string;
  age: number;
  avatar: string;
  bio: string;
  isOnline: boolean;
  status: string;
}

export interface Message {
  id: string;
  senderId: 'me' | string;
  text: string;
  timestamp: Date;
  type: 'text' | 'image' | 'voice';
  imageUrl?: string;
  voiceDuration?: number;
}

export type CallType = 'audio' | 'video' | null;

export interface ChatSession {
  profileId: string;
  messages: Message[];
}
