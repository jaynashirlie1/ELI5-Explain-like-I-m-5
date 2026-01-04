
export enum ReadingLevel {
  TODDLER = 'Toddler (Age 3-5)',
  CHILD = 'Child (Age 6-10)',
  TEEN = 'Teenager (Age 13-17)',
  NON_EXPERT = 'Non-Expert Adult',
  SKEPTIC = 'Cynical Skeptic'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  level?: ReadingLevel;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
