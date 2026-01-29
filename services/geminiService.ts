
import { GoogleGenAI, Type } from "@google/genai";
import { Stage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateNewSentence = async () => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "Generate a short, clear sentence (5-8 words) with no capitalization or punctuation. Make it interesting but standard for grammar analysis.",
    config: {
      temperature: 1,
    }
  });
  return response.text.trim().toLowerCase();
};

export const gradeStage = async (stage: Stage, sentence: string, data: any) => {
  const prompt = `
    DGP (Daily Grammar Practice) Grading.
    Target Sentence: "${sentence}"
    Stage: ${stage}
    User Work: ${JSON.stringify(data)}

    Verify if the user's grammar analysis for this specific stage is 100% accurate. 
    Monday: Parts of Speech for every word.
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
          feedback: { type: Type.STRING, description: "Hype or helpful feedback in Gen Alpha slang. Use lots of 'skibidi', 'sigma', 'rizz', 'no cap', 'aura'." },
          correctData: { type: Type.STRING }
        },
        required: ["isCorrect", "feedback"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generatePhonkHype = async (stage: Stage) => {
  // Creating a high-energy instrumental phonk track using onomatopoeia.
  // We specify NO SPEAKING and only short vocal stabs.
  const prompt = `
    Perform a 10-second HIGH-ENERGY INSTRUMENTAL GEN ALPHA ELECTRONIC / PHONK track for the stage: ${stage}. 
    
    IMPORTANT RULES:
    1. NO LYRICS. NO SPEAKING. NO EXPLAINING.
    2. ONLY USE INSTRUMENTAL SOUNDS: 'DOOM-KAH-DOOM-DOOM-KAH' (Drums), 'BZZZT-vwoo' (Synths), 'Tink-tink' (Phonk Cowbells).
    3. YOU MAY INCLUDE SHORT FEMALE VOCAL STABS like "HEY!", "YEAH!", "GO!", or "WHAT!" rhythmically.
    4. ACT AS A SYNTHESIZER AND DRUM MACHINE.
    
    Structure:
    - 0-3s: Heavy distorted kick and phonk cowbell melody (e.g., 'Tink-tink-tonk, Tink-tink-tonk').
    - 3-7s: Add sharp snare and rapid hi-hats with a female vocal stab 'GO!'.
    - 7-10s: Glitchy electronic bass drop ('WUB-WUB-WUB-BRRR').
  `;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: ['AUDIO' as any],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' } // Kore is often used for higher pitched or stab-like sounds
        }
      }
    }
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};
