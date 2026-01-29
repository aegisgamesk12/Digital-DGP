
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
    return JSON.parse(response.text);
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
    - Nouns must specify function (Subject, Direct Object, Indirect Object, Object of Preposition, Appositive, Predicate Nominative, Direct Address).
    - Verbs must specify type (Action Transitive/Intransitive, Linking, Helping).
    - Pronouns must specify type (Personal Nominative/Objective/Possessive, Relative, Demonstrative, Indefinite, Reflexive).
    - Adjectives must specify type (Common, Proper, Article).
    - Conjunctions must specify type (Coordinating, Subordinating, Correlative).
    
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
          feedback: { type: Type.STRING, description: "Hype feedback in Gen Alpha slang (skibidi, rizz, sigma, etc)." },
          correctData: { type: Type.STRING }
        },
        required: ["isCorrect", "feedback"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generatePhonkHype = async (stage: Stage) => {
  const prompt = `
    Perform a 10-second HIGH-ENERGY INSTRUMENTAL GEN ALPHA PHONK track for the stage: ${stage}. 
    NO LYRICS. NO SPEAKING. ONLY SOUNDS: 'DOOM-KAH-DOOM', 'BZZZT', 'Tink-tink' (cowbells).
    Include rhythmic female vocal stabs like "GO!" or "HEY!".
  `;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: ['AUDIO' as any],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }
        }
      }
    }
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};
