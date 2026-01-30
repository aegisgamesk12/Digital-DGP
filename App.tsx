
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Stage, Difficulty, DGPState, PartOfSpeech, FridaySlot } from './types';
import { generateSentenceBatch, gradeStage, generateAudioTrack, generateSFX } from './services/geminiService';
import { AudioPlayer, AudioPlayerRef } from './components/AudioPlayer';

const POS_LIST: PartOfSpeech[] = [
  'Noun', 'Verb', 'Verbal', 'Pronoun', 'Adjective', 'Adverb', 
  'Preposition', 'Conjunction', 'Interjection'
];

const SUBTYPES: Record<string, string[]> = {
  'Noun': ['Subject', 'Direct Object', 'Indirect Object', 'Object of Preposition', 'Appositive', 'Predicate Nominative', 'Direct Address'],
  'Verb': ['Action (Transitive)', 'Action (Intransitive)', 'Linking', 'Helping'],
  'Verbal': ['Gerund', 'Participle', 'Infinitive'],
  'Pronoun': ['Personal (Nominative)', 'Personal (Objective)', 'Personal (Possessive)', 'Relative', 'Demonstrative', 'Indefinite', 'Reflexive'],
  'Adjective': ['Common', 'Proper', 'Article'],
  'Conjunction': ['Coordinating', 'Subordinating', 'Correlative']
};

const STAGE_ORDER = [Stage.MONDAY, Stage.TUESDAY, Stage.WEDNESDAY, Stage.THURSDAY, Stage.FRIDAY];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<DGPState>({
    rawSentence: '',
    currentStage: Stage.MONDAY,
    completedStages: [],
    history: {
      [Stage.MONDAY]: { tags: {} }, 
      [Stage.TUESDAY]: { subjectIndices: [], verbIndices: [], completeSubjectIndices: [], completePredicateIndices: [] },
      [Stage.WEDNESDAY]: { clauseCount: 1, sentenceType: 'Simple', sentencePurpose: 'Declarative' },
      [Stage.THURSDAY]: { correctedSentence: '' },
      [Stage.FRIDAY]: { slots: [
        { id: 'subj', type: 'subject', wordIdx: null, rotation: 0 },
        { id: 'verb', type: 'verb', wordIdx: null, rotation: 0 },
        { id: 'obj', type: 'object', wordIdx: null, rotation: 0 },
        { id: 'mod1', type: 'modifier', wordIdx: null, rotation: 45 },
        { id: 'mod2', type: 'modifier', wordIdx: null, rotation: 45 }
      ]}
    },
    feedback: "Digital DGP. Aura: Peak.",
    isLoading: true,
    musicEnabled: true,
    difficulty: Difficulty.EASY,
    sentencePool: []
  });

  const [bgMusic, setBgMusic] = useState<string | undefined>();
  const [selectSFX, setSelectSFX] = useState<string | undefined>();
  const [successSFX, setSuccessSFX] = useState<string | undefined>();
  const [errorSFX, setErrorSFX] = useState<string | undefined>();
  const [selectedWordIdx, setSelectedWordIdx] = useState<number | null>(null);
  
  const audioPlayerRef = useRef<AudioPlayerRef>(null);
  const isFetchingBuffer = useRef(false);

  const triggerSelectSFX = useCallback(() => {
    if (selectSFX && audioPlayerRef.current) {
      audioPlayerRef.current.playSFX(selectSFX);
    }
  }, [selectSFX]);

  const resetStageHistory = useCallback(() => ({
    [Stage.MONDAY]: { tags: {} },
    [Stage.TUESDAY]: { subjectIndices: [], verbIndices: [], completeSubjectIndices: [], completePredicateIndices: [] },
    [Stage.WEDNESDAY]: { clauseCount: 1, sentenceType: 'Simple', sentencePurpose: 'Declarative' },
    [Stage.THURSDAY]: { correctedSentence: '' },
    [Stage.FRIDAY]: { slots: [
      { id: 'subj', type: 'subject', wordIdx: null, rotation: 0 },
      { id: 'verb', type: 'verb', wordIdx: null, rotation: 0 },
      { id: 'obj', type: 'object', wordIdx: null, rotation: 0 },
      { id: 'mod1', type: 'modifier', wordIdx: null, rotation: 45 },
      { id: 'mod2', type: 'modifier', wordIdx: null, rotation: 45 }
    ]}
  }), []);

  const fillSentencePool = useCallback(async (difficulty: Difficulty, replaceCurrent = false) => {
    if (isFetchingBuffer.current) return;
    isFetchingBuffer.current = true;
    try {
      const batch = await generateSentenceBatch(difficulty, 5);
      setGameState(prev => {
        const newPool = [...prev.sentencePool, ...batch];
        let nextSentence = prev.rawSentence;
        let nextIsLoading = prev.isLoading;
        
        if (replaceCurrent || !prev.rawSentence) {
          nextSentence = newPool.shift() || '';
          nextIsLoading = false;
        }

        return {
          ...prev,
          sentencePool: newPool,
          rawSentence: nextSentence,
          isLoading: nextIsLoading
        };
      });
    } catch (e) {
      console.error("Pool fetch failed", e);
    } finally {
      isFetchingBuffer.current = false;
    }
  }, []);

  useEffect(() => {
    fillSentencePool(gameState.difficulty, true);
    generateAudioTrack(Stage.MONDAY).then(setBgMusic);
    // Pre-cache SFX
    generateSFX('select').then(setSelectSFX);
    generateSFX('success').then(setSuccessSFX);
    generateSFX('error').then(setErrorSFX);
  }, []);

  const changeDifficulty = (d: Difficulty) => {
    triggerSelectSFX();
    setGameState(prev => ({ 
      ...prev, 
      difficulty: d, 
      isLoading: true, 
      sentencePool: [], 
      rawSentence: '',
      currentStage: Stage.MONDAY,
      completedStages: [],
      history: resetStageHistory()
    }));
    fillSentencePool(d, true);
  };

  const nextSentenceFromPool = () => {
    setGameState(prev => {
      const pool = [...prev.sentencePool];
      const next = pool.shift() || '';
      
      if (pool.length < 2) {
        setTimeout(() => fillSentencePool(prev.difficulty), 100);
      }

      return {
        ...prev,
        rawSentence: next,
        sentencePool: pool,
        currentStage: Stage.MONDAY,
        completedStages: [],
        history: resetStageHistory()
      };
    });
  };

  const toggleMusic = () => {
    triggerSelectSFX();
    setGameState(prev => ({ ...prev, musicEnabled: !prev.musicEnabled }));
  };

  const handleMondayTag = (wordIdx: number, pos: PartOfSpeech) => {
    triggerSelectSFX();
    setGameState(prev => {
      return {
        ...prev,
        history: {
          ...prev.history,
          [Stage.MONDAY]: {
            ...prev.history[Stage.MONDAY],
            tags: { 
              ...prev.history[Stage.MONDAY].tags, 
              [wordIdx]: { pos, subType: undefined } 
            }
          }
        }
      };
    });
  };

  const handleMondaySubtype = (wordIdx: number, subType: string) => {
    triggerSelectSFX();
    setGameState(prev => {
      const current = prev.history[Stage.MONDAY].tags[wordIdx] || {};
      return {
        ...prev,
        history: {
          ...prev.history,
          [Stage.MONDAY]: {
            ...prev.history[Stage.MONDAY],
            tags: { 
              ...prev.history[Stage.MONDAY].tags, 
              [wordIdx]: { ...current, subType } 
            }
          }
        }
      };
    });
  };

  const handleTuesdayClick = (wordIdx: number, mode: 'subj' | 'verb' | 'compSubj' | 'compPred') => {
    triggerSelectSFX();
    const keyMap: Record<string, string> = {
      subj: 'subjectIndices',
      verb: 'verbIndices',
      compSubj: 'completeSubjectIndices',
      compPred: 'completePredicateIndices'
    };
    const key = keyMap[mode];
    const current = gameState.history[Stage.TUESDAY][key] as number[];
    const updated = current.includes(wordIdx) ? current.filter(i => i !== wordIdx) : [...current, wordIdx];
    
    setGameState(prev => ({
      ...prev,
      history: { ...prev.history, [Stage.TUESDAY]: { ...prev.history[Stage.TUESDAY], [key]: updated } }
    }));
  };

  const handleFridaySlotClick = (slotId: string) => {
    if (selectedWordIdx === null) return;
    triggerSelectSFX();
    setGameState(prev => {
      const newSlots = prev.history[Stage.FRIDAY].slots.map((s: FridaySlot) => 
        s.id === slotId ? { ...s, wordIdx: selectedWordIdx } : s
      );
      return { ...prev, history: { ...prev.history, [Stage.FRIDAY]: { slots: newSlots } } };
    });
    setSelectedWordIdx(null);
  };

  const toggleFridayRotation = (slotId: string) => {
    triggerSelectSFX();
    setGameState(prev => {
      const newSlots = prev.history[Stage.FRIDAY].slots.map((s: FridaySlot) => 
        s.id === slotId ? { ...s, rotation: s.rotation === 0 ? 45 : 0 } : s
      );
      return { ...prev, history: { ...prev.history, [Stage.FRIDAY]: { slots: newSlots } } };
    });
  };

  const submitStage = async () => {
    setGameState(prev => ({ ...prev, isLoading: true, feedback: "VALIDATING..." }));
    try {
      const result = await gradeStage(gameState.currentStage, gameState.rawSentence, gameState.history[gameState.currentStage]);
      
      if (result.isCorrect) {
        if (successSFX && audioPlayerRef.current) audioPlayerRef.current.playSFX(successSFX);
        const currentIndex = STAGE_ORDER.indexOf(gameState.currentStage);
        const nextStage = STAGE_ORDER[currentIndex + 1];
        
        if (gameState.currentStage === Stage.FRIDAY) {
          setGameState(prev => ({ ...prev, isLoading: false, feedback: result.feedback }));
          setTimeout(() => nextSentenceFromPool(), 1500);
        } else {
          setGameState(prev => ({
            ...prev,
            isLoading: false,
            feedback: result.feedback,
            completedStages: [...prev.completedStages, prev.currentStage],
            currentStage: nextStage || prev.currentStage
          }));

          if (nextStage) {
            const audio = await generateAudioTrack(nextStage);
            setBgMusic(audio);
          }
        }
      } else {
        if (errorSFX && audioPlayerRef.current) audioPlayerRef.current.playSFX(errorSFX);
        setGameState(prev => ({ ...prev, isLoading: false, feedback: result.feedback }));
      }
    } catch (e) {
      setGameState(prev => ({ ...prev, isLoading: false, feedback: "Error." }));
    }
  };

  const renderStageContent = () => {
    const words = gameState.rawSentence.split(' ');

    switch (gameState.currentStage) {
      case Stage.MONDAY:
        return (
          <div className="flex flex-wrap gap-1 justify-center py-1">
            {words.map((word, idx) => {
              const currentTag = gameState.history[Stage.MONDAY].tags[idx] || {};
              const pos = currentTag.pos;
              const subOptions = pos ? SUBTYPES[pos] : null;

              return (
                <div key={idx} className="flex flex-col items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-md w-[85px] md:w-28 transition-all hover:border-cyan-500 shadow-sm group">
                  <span className="text-[9px] md:text-xs font-black uppercase tracking-tight text-white group-hover:text-cyan-400 truncate w-full text-center">{word}</span>
                  <select 
                    className="w-full bg-black text-[8px] md:text-[9px] text-cyan-400 p-0.5 rounded-sm border border-zinc-700 outline-none cursor-pointer hover:bg-zinc-800 font-bold"
                    value={pos || ''}
                    onChange={(e) => handleMondayTag(idx, e.target.value as PartOfSpeech)}
                  >
                    <option value="">POS</option>
                    {POS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {subOptions && (
                    <select 
                      className="w-full bg-zinc-950 text-[7px] md:text-[8px] text-fuchsia-400 p-0.5 rounded-sm border border-zinc-800 outline-none cursor-pointer hover:bg-zinc-900 font-bold mt-0.5"
                      value={currentTag.subType || ''}
                      onChange={(e) => handleMondaySubtype(idx, e.target.value)}
                    >
                      <option value="">Type</option>
                      {subOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        );

      case Stage.TUESDAY:
        return (
          <div className="flex flex-col gap-1 items-center py-1">
            <div className="flex flex-wrap gap-1 justify-center max-w-2xl w-full">
              {words.map((word, idx) => (
                <div key={idx} className="p-1 bg-zinc-900/80 rounded-md border border-zinc-800 flex flex-col items-center gap-1 min-w-[70px] md:min-w-[90px]">
                  <span className="text-[9px] md:text-xs font-black uppercase text-white tracking-tighter text-center">{word}</span>
                  <div className="grid grid-cols-2 gap-0.5 w-full">
                    {[ 
                      { k: 'subj', l: 'S', c: 'bg-cyan-500', idxK: 'subjectIndices' },
                      { k: 'verb', l: 'V', c: 'bg-fuchsia-500', idxK: 'verbIndices' },
                      { k: 'compSubj', l: 'CS', c: 'bg-yellow-400', idxK: 'completeSubjectIndices' },
                      { k: 'compPred', l: 'CP', c: 'bg-lime-400', idxK: 'completePredicateIndices' }
                    ].map(btn => (
                      <button 
                        key={btn.k}
                        onClick={() => handleTuesdayClick(idx, btn.k as any)} 
                        className={`py-0.5 rounded-[2px] flex items-center justify-center text-[7px] font-black transition-all ${gameState.history[Stage.TUESDAY][btn.idxK].includes(idx) ? `${btn.c} text-black` : 'bg-black text-zinc-600 border border-zinc-800'}`}
                      >
                        {btn.l}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case Stage.WEDNESDAY:
        return (
          <div className="flex flex-col gap-1 items-center py-1 w-full max-w-xs mx-auto">
             <div className="w-full">
              <label className="block text-[7px] uppercase text-cyan-500 mb-0.5 font-black tracking-widest text-center">Clauses</label>
              <input 
                type="number" 
                className="w-full bg-zinc-900 border border-zinc-800 p-1 rounded-md text-lg font-black text-center text-white focus:border-cyan-500 outline-none"
                value={gameState.history[Stage.WEDNESDAY].clauseCount}
                onChange={(e) => {
                  triggerSelectSFX();
                  setGameState(prev => ({
                    ...prev,
                    history: { ...prev.history, [Stage.WEDNESDAY]: { ...prev.history[Stage.WEDNESDAY], clauseCount: parseInt(e.target.value) } }
                  }))
                }}
              />
            </div>
            <div className="w-full mt-2">
              <label className="block text-[7px] uppercase text-fuchsia-500 mb-0.5 font-black tracking-widest text-center">Type</label>
              <div className="grid grid-cols-2 gap-1">
                {['Simple', 'Compound', 'Complex', 'Comp-Complex'].map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      triggerSelectSFX();
                      setGameState(prev => ({
                        ...prev,
                        history: { ...prev.history, [Stage.WEDNESDAY]: { ...prev.history[Stage.WEDNESDAY], sentenceType: type } }
                      }))
                    }}
                    className={`p-1 rounded-md border border-zinc-800 font-black text-[8px] transition-all ${gameState.history[Stage.WEDNESDAY].sentenceType === type ? 'bg-fuchsia-500 border-white text-white' : 'bg-zinc-900 text-zinc-500'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case Stage.THURSDAY:
        return (
          <div className="flex flex-col gap-1 items-center py-1 w-full max-w-lg mx-auto">
            <textarea 
              className="w-full h-16 md:h-24 bg-zinc-950 border border-zinc-900 p-2 rounded-md text-xs md:text-lg font-black text-center resize-none outline-none focus:border-lime-500 text-lime-400"
              placeholder="FIX IT..."
              value={gameState.history[Stage.THURSDAY].correctedSentence}
              onChange={(e) => setGameState(prev => ({
                ...prev,
                history: { ...prev.history, [Stage.THURSDAY]: { correctedSentence: e.target.value } }
              }))}
            />
          </div>
        );

      case Stage.FRIDAY:
        const slotColors: Record<string, string> = {
          subject: 'border-yellow-400 bg-yellow-400/20 text-yellow-100',
          verb: 'border-purple-500 bg-purple-500/20 text-purple-100',
          object: 'border-blue-500 bg-blue-500/20 text-blue-100',
          modifier: 'border-green-400 bg-green-400/20 text-green-100'
        };

        return (
          <div className="flex flex-col gap-2 items-center py-1 w-full">
            <div className="flex flex-wrap gap-1 justify-center max-lg bg-zinc-900/30 p-1 rounded-md border border-zinc-800 w-full">
              {words.map((word, idx) => {
                const isUsed = gameState.history[Stage.FRIDAY].slots.some((s: FridaySlot) => s.wordIdx === idx);
                return (
                  <button 
                    key={idx}
                    onClick={() => {
                      triggerSelectSFX();
                      setSelectedWordIdx(idx);
                    }}
                    className={`px-1.5 py-0.5 rounded-sm font-black uppercase text-[8px] border transition-all ${selectedWordIdx === idx ? 'border-white bg-white text-black' : isUsed ? 'border-zinc-800 text-zinc-700 bg-black opacity-20 pointer-events-none' : 'border-cyan-500 bg-black text-cyan-400'}`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full max-w-xl aspect-[21/9] bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden flex items-center justify-center p-0.5 shadow-sm">
              <div className="absolute top-[50%] left-0 w-full h-[1px] bg-zinc-800"></div>
              <div className="relative z-10 flex flex-wrap justify-center items-center gap-1 md:gap-2">
                {gameState.history[Stage.FRIDAY].slots.map((slot: FridaySlot) => (
                  <div 
                    key={slot.id}
                    onClick={() => {
                      if (selectedWordIdx !== null) handleFridaySlotClick(slot.id);
                      else toggleFridayRotation(slot.id);
                    }}
                    style={{ 
                      transform: `rotate(${slot.rotation}deg)`,
                      transition: 'all 0.3s ease'
                    }}
                    className={`relative w-14 h-5 sm:w-16 sm:h-7 md:w-24 md:h-10 flex items-center justify-center border border-solid transition-all cursor-pointer rounded-sm group ${slot.wordIdx !== null ? `${slotColors[slot.type]} shadow-sm` : 'border-zinc-800 bg-black/40'}`}
                  >
                    <span className="text-[5px] absolute -top-1.5 left-0 uppercase font-black text-zinc-600 truncate w-full">
                      {slot.type}
                    </span>
                    {slot.wordIdx !== null ? (
                      <span className="text-[6px] md:text-[9px] font-black uppercase text-white truncate px-0.5">
                        {words[slot.wordIdx]}
                      </span>
                    ) : (
                      <span className="text-zinc-800 font-black text-[9px]">+</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button 
              onClick={() => {
                triggerSelectSFX();
                setGameState(prev => ({...prev, history: {...prev.history, [Stage.FRIDAY]: {...prev.history[Stage.FRIDAY], slots: prev.history[Stage.FRIDAY].slots.map(s => ({...s, wordIdx: null}))}}}));
              }} 
              className="text-[7px] font-black text-zinc-600"
            >
              Reset
            </button>
          </div>
        );

      default:
        return <div className="text-xl bangers text-center py-2 text-cyan-400">SIGMA STATUS</div>;
    }
  };

  return (
    <div className="h-screen bg-black text-white selection:bg-cyan-500 selection:text-black overflow-hidden flex flex-col">
      <AudioPlayer ref={audioPlayerRef} bgMusicBase64={bgMusic} enabled={gameState.musicEnabled} />
      
      {/* Audio & Difficulty Control */}
      <div className="fixed top-1 left-1 z-[100] flex items-center gap-2 bg-zinc-950/80 p-0.5 pr-2 rounded-full border border-zinc-800 backdrop-blur-md">
        <button 
          onClick={toggleMusic}
          className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${gameState.musicEnabled ? 'bg-white border-cyan-500' : 'bg-zinc-900 border-zinc-800 opacity-50'}`}
        >
          <span className="text-[8px]">{gameState.musicEnabled ? '🔊' : '🔇'}</span>
        </button>
        
        <div className="flex gap-1 border-l border-zinc-800 pl-1.5">
          {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map(d => (
            <button
              key={d}
              onClick={() => changeDifficulty(d)}
              className={`text-[6px] md:text-[8px] font-black px-1.5 py-0.5 rounded-full transition-all ${gameState.difficulty === d ? 'bg-cyan-500 text-black' : 'text-zinc-500 hover:text-white'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <header className="p-1 flex flex-col items-center bg-zinc-950/40 backdrop-blur-md border-b border-zinc-900 shrink-0">
        <h1 className="text-lg md:text-2xl bangers tracking-tighter phonk-gradient leading-none select-none">DIGITAL DGP</h1>
        <p className="text-zinc-500 uppercase tracking-widest text-[6px] font-black">Gen Alpha Grammar Grind</p>
      </header>

      <main className="max-w-[900px] w-full mx-auto p-1 flex-1 flex flex-col gap-1 overflow-hidden">
        
        {/* Progress */}
        <div className="grid grid-cols-5 gap-0.5 shrink-0">
          {STAGE_ORDER.map((s) => {
            const isCompleted = gameState.completedStages.includes(s);
            const isCurrent = gameState.currentStage === s;
            return (
              <div key={s} className={`p-0.5 border-b transition-all relative rounded-sm ${isCurrent ? 'border-cyan-500 bg-zinc-900/40' : isCompleted ? 'border-lime-500 text-lime-500' : 'border-zinc-800 text-zinc-800'}`}>
                {isCurrent && <div className="absolute top-0 left-0 w-full h-[1px] bg-cyan-500"></div>}
                <div className={`text-[7px] md:text-[9px] font-black italic uppercase truncate ${isCurrent ? 'text-white' : ''}`}>{s}</div>
              </div>
            );
          })}
        </div>

        <div className="relative flex-1 flex flex-col overflow-hidden">
          {gameState.isLoading && (
            <div className="absolute inset-0 bg-black/95 z-[60] flex flex-col items-center justify-center rounded-md">
              <div className="text-xl bangers animate-pulse phonk-gradient">RIZZING...</div>
              <p className="text-[8px] font-black text-zinc-600 mt-2">NEO-80s VIBES INBOUND</p>
            </div>
          )}

          <div className="glitch-border rounded-md bg-zinc-950/60 p-1.5 md:p-3 flex flex-col justify-between flex-1 shadow-lg backdrop-blur-sm overflow-hidden">
            <div className="w-full flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <div className="flex justify-between items-center gap-1.5 shrink-0 border-l-2 border-fuchsia-600 pl-2">
                <div className="text-[9px] md:text-sm font-black tracking-tight text-white leading-tight truncate">"{gameState.rawSentence}"</div>
                <div className="hidden sm:block text-[6px] font-black uppercase text-zinc-600">STRICTLY INSTRUMENTAL</div>
              </div>
              <div className="flex-1">
                {renderStageContent()}
              </div>
            </div>

            <div className="flex gap-1.5 items-center justify-between mt-1.5 pt-1.5 border-t border-zinc-900/60 shrink-0">
              <div className="relative p-1 bg-black/60 rounded-md border border-zinc-900 flex-1 min-w-0">
                <div className="text-[6px] md:text-[9px] font-black italic text-zinc-400 leading-tight truncate px-1">
                  "{gameState.feedback}"
                </div>
              </div>

              <button 
                onClick={submitStage}
                disabled={gameState.isLoading}
                className="group relative px-3 py-1 bg-white text-black font-black text-[9px] md:text-xs uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all disabled:opacity-5 rounded-sm flex items-center justify-center gap-1"
              >
                <span>SEND</span>
                <span className="text-[7px]">➔</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <div className="h-0.5 bg-gradient-to-r from-fuchsia-600 via-cyan-500 to-lime-500 z-[100] shrink-0"></div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 5px; }
      `}</style>
    </div>
  );
};

export default App;
