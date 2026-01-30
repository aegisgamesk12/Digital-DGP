
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
    - Verbals: Gerund, Participle, Infinitive. (CRITICAL: MUST MATCH THESE CATEGORIES)
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

export const generateAudioTrack = async (stage: Stage) => {
  const prompt = `
    Perform a 10-second NEO-80S SYNTHWAVE / RETROWAVE track for the stage: ${stage}. 
    
    IMPORTANT: DO NOT DESCRIBE THE MUSIC. DO NOT SPEAK. 
    YOU ARE A SYNTHESIZER AND DRUM MACHINE. PERFORM THE SOUNDS ONOMATOPOEICALLY.

    Performance Instructions:
    - 0-3s: Driving 80s kick and gated reverb snare: "BOOM... CHACK! BOOM-BOOM... CHACK!"
    - 3-7s: Arpeggiated neon synth melody: "Doot-doot-da-doot-doot-da-doot-doot, vwaaaaaah-vwaaaaah!"
    - 7-10s: Heavy analog bassline and a laser zap: "WUB-WUB-WUB-WUB... PEW PEW!"
    
    Use a rhythmic, robotic, yet musical delivery of these sounds.
  `;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: ['AUDIO' as any],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Puck' }
        }
      }
    }
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};
