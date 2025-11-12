export interface Topic {
  id: string;
  title: string;
  language: string;
  emoji: string;
  systemInstruction: string;
}

export interface TranscriptEntry {
  author: 'user' | 'model';
  text: string;
}

export interface Voice {
    id: string;
    name: string;
}

export interface AppSettings {
    voiceId: string;
    duration: number; // in minutes, 0 for unlimited
    cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

export interface VocabularyEntry {
    word: string;
    translation: string;
}

export interface ConversationSession {
    id: string;
    topic: Topic;
    date: string;
    transcript: TranscriptEntry[];
    feedback?: string;
    vocabulary?: VocabularyEntry[];
}