
export enum Stage {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday'
}

export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export interface DGPState {
  rawSentence: string;
  currentStage: Stage;
  completedStages: Stage[];
  history: Record<Stage, any>;
  feedback: string;
  isLoading: boolean;
  musicEnabled: boolean;
  difficulty: Difficulty;
  sentencePool: string[];
}

export type PartOfSpeech = 
  | 'Noun' | 'Verb' | 'Pronoun' | 'Adjective' | 'Adverb' 
  | 'Preposition' | 'Conjunction' | 'Interjection';

export interface FridaySlot {
  id: string;
  type: 'subject' | 'verb' | 'object' | 'modifier';
  wordIdx: number | null;
  rotation: 0 | 45; 
}
