
export enum Stage {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday'
}

export interface DGPState {
  rawSentence: string;
  currentStage: Stage;
  completedStages: Stage[];
  history: Record<Stage, any>;
  feedback: string;
  isLoading: boolean;
  musicEnabled: boolean;
}

export type PartOfSpeech = 
  | 'Noun' | 'Verb' | 'Adjective' | 'Adverb' | 'Pronoun' 
  | 'Preposition' | 'Conjunction' | 'Interjection' | 'Article';

export interface FridaySlot {
  id: string;
  type: 'subject' | 'verb' | 'object' | 'modifier';
  wordIdx: number | null;
  rotation: 0 | 45; // 0 for straight, 45 for slanted
}

export interface FridayData {
  slots: FridaySlot[];
}
