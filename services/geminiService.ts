
import { GoogleGenAI, Type } from "@google/genai";
import { Stage, Difficulty } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const gradePrompts = {
  [Difficulty.EASY]: "7th-9th grade level complexity.",
  [Difficulty.MEDIUM]: "10th-12th grade level complexity.",
  [Difficulty.HARD]: "AP English/Freshman College level complexity."
};

export const generateSentenceBatch = async (difficulty: Difficulty, count: number = 4) => {
  const prompt = `Generate a JSON array of exactly ${count} strings. 
  Each string must be a sentence with NO capitalization and NO punctuation.
  Difficulty Level: ${gradePrompts[difficulty]}
  The batch must include a mix of sentence types: Simple, Compound, Complex, and Compound-Complex.
  Each sentence should be 6-12 words long.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    const text = response.text.trim();
    return JSON.parse(text);
  } catch (e) {
    return ["the cat sat on the mat", "the dog barked at the moon"];
  }
};

export const gradeStage = async (stage: Stage, sentence: string, data: any) => {
  const prompt = `
    DGP (Daily Grammar Practice) Grading.
    Target Sentence: "${sentence}"
    Stage: ${stage}
    User Work: ${JSON.stringify(data)}

    Verify if the user's grammar analysis for this specific stage is 100% accurate. 
    Monday: Parts of Speech for every word WITH sub-types. 
    - Nouns: Subject, Direct Object, Indirect Object, Object of Preposition, Appositive, Predicate Nominative, Direct Address.
    - Verbs: Action Transitive, Action Intransitive, Linking, Helping.
    - Verbals: Gerund, Participle, Infinitive.
    - Pronouns: Personal Nominative, Personal Objective, Personal Possessive, Relative, Demonstrative, Indefinite, Reflexive.
    - Adjectives: Common, Proper, Article.
    - Conjunctions: Coordinating, Subordinating, Correlative.
    
    Tuesday: Subject/Verb/Complete Subject/Predicate indices.
    Wednesday: Clause counts and Sentence Type.
    Thursday: Capitalization/Punctuation/Grammar fixes.
    Friday: Reed-Kellogg diagram slots (subject, verb, object, modifiers correctly placed and rotated).

    Return JSON matching the schema.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isCorrect: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING, description: "Hype feedback in Gen Alpha slang. Be encouraging but direct." },
          correctData: { type: Type.STRING }
        },
        required: ["isCorrect", "feedback"]
      }
    }
  });

  return JSON.parse(response.text);
};

/**
 * Generates an instrumental neo-80s background track.
 * Uses strict onomatopoeia to simulate instruments without speaking words.
 */
export const generateAudioTrack = async (stage: Stage) => {
  const prompt = `
    Perform a 10-second INSTRUMENTAL NEO-80S SYNTHWAVE sequence. 
    STRICTLY NO WORDS. NO DESCRIPTIONS. NO VOICE.
    
    YOU ARE AN ANALOG SYNTHESIZER.
    ONLY say the following abstract sounds rhythmically:
    "Dun... tish... dun-dun-tish... bzzzzzzzz-wup... vwaaaaaaaaah... pip-pip-pip-pop... dun... tish..."
    
    Make it sound like a looping drum machine and a smooth synth lead. 
    DO NOT say "Here is the music". DO NOT say "Synthwave".
  `;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: ['AUDIO' as any],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Puck' } // Puck has a more robotic/synthetic potential
        }
      }
    }
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

/**
 * Generates short UI sound effects.
 */
export const generateSFX = async (type: 'select' | 'success' | 'error') => {
  const sounds = {
    select: "Blip!",
    success: "Ding-waaaaaah!",
    error: "Bzzzt-wonk."
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: sounds[type] }] }],
    config: {
      responseModalities: ['AUDIO' as any],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Zephyr' }
        }
      }
    }
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};
