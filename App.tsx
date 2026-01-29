
import React, { useState, useEffect, useCallback } from 'react';
import { Stage, DGPState, PartOfSpeech, FridaySlot } from './types';
import { generateNewSentence, gradeStage, generatePhonkHype } from './services/geminiService';
import { AudioPlayer } from './components/AudioPlayer';

const POS_LIST: PartOfSpeech[] = [
  'Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun', 
  'Preposition', 'Conjunction', 'Interjection', 'Article'
];

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
    feedback: "Digital DGP. Grind mode: ON.",
    isLoading: true,
    musicEnabled: true
  });

  const [hypeAudio, setHypeAudio] = useState<string | undefined>();
  const [selectedWordIdx, setSelectedWordIdx] = useState<number | null>(null);

  const initGame = useCallback(async () => {
    setGameState(prev => ({ ...prev, isLoading: true }));
    try {
      const sentence = await generateNewSentence();
      setGameState(prev => ({ ...prev, rawSentence: sentence, isLoading: false }));
      const audio = await generatePhonkHype(Stage.MONDAY);
      setHypeAudio(audio);
    } catch (e) {
      setGameState(prev => ({ ...prev, isLoading: false, feedback: "Aura check failed. Check your API key." }));
    }
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const toggleMusic = () => setGameState(prev => ({ ...prev, musicEnabled: !prev.musicEnabled }));

  const handleMondayTag = (wordIdx: number, pos: PartOfSpeech) => {
    setGameState(prev => ({
      ...prev,
      history: {
        ...prev.history,
        [Stage.MONDAY]: {
          ...prev.history[Stage.MONDAY],
          tags: { ...prev.history[Stage.MONDAY].tags, [wordIdx]: pos }
        }
      }
    }));
  };

  const handleTuesdayClick = (wordIdx: number, mode: 'subj' | 'verb' | 'compSubj' | 'compPred') => {
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
    setGameState(prev => {
      const newSlots = prev.history[Stage.FRIDAY].slots.map((s: FridaySlot) => 
        s.id === slotId ? { ...s, wordIdx: selectedWordIdx } : s
      );
      return { ...prev, history: { ...prev.history, [Stage.FRIDAY]: { slots: newSlots } } };
    });
    setSelectedWordIdx(null);
  };

  const toggleFridayRotation = (slotId: string) => {
    setGameState(prev => {
      const newSlots = prev.history[Stage.FRIDAY].slots.map((s: FridaySlot) => 
        s.id === slotId ? { ...s, rotation: s.rotation === 0 ? 45 : 0 } : s
      );
      return { ...prev, history: { ...prev.history, [Stage.FRIDAY]: { slots: newSlots } } };
    });
  };

  const submitStage = async () => {
    setGameState(prev => ({ ...prev, isLoading: true, feedback: "CHECKING..." }));
    try {
      const result = await gradeStage(gameState.currentStage, gameState.rawSentence, gameState.history[gameState.currentStage]);
      
      if (result.isCorrect) {
        const currentIndex = STAGE_ORDER.indexOf(gameState.currentStage);
        const nextStage = STAGE_ORDER[currentIndex + 1];
        
        setGameState(prev => ({
          ...prev,
          isLoading: false,
          feedback: result.feedback,
          completedStages: [...prev.completedStages, prev.currentStage],
          currentStage: nextStage || prev.currentStage
        }));

        if (nextStage) {
          const audio = await generatePhonkHype(nextStage);
          setHypeAudio(audio);
        }
      } else {
        setGameState(prev => ({ ...prev, isLoading: false, feedback: result.feedback }));
      }
    } catch (e) {
      setGameState(prev => ({ ...prev, isLoading: false, feedback: "Error. Connection lost." }));
    }
  };

  const renderStageContent = () => {
    const words = gameState.rawSentence.split(' ');

    switch (gameState.currentStage) {
      case Stage.MONDAY:
        return (
          <div className="flex flex-wrap gap-2 justify-center py-2">
            {words.map((word, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1 p-2 bg-zinc-900 border border-zinc-800 rounded-lg w-32 md:w-36 transition-all hover:border-cyan-500 shadow-sm group">
                <span className="text-xs md:text-sm font-black uppercase tracking-wider text-white group-hover:text-cyan-400 truncate w-full text-center">{word}</span>
                <select 
                  className="w-full bg-black text-[10px] text-cyan-400 p-1.5 rounded-md border border-zinc-700 outline-none cursor-pointer hover:bg-zinc-800 font-bold"
                  value={gameState.history[Stage.MONDAY].tags[idx] || ''}
                  onChange={(e) => handleMondayTag(idx, e.target.value as PartOfSpeech)}
                >
                  <option value="">POS</option>
                  {POS_LIST.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
              </div>
            ))}
          </div>
        );

      case Stage.TUESDAY:
        return (
          <div className="flex flex-col gap-3 items-center py-2">
            <div className="flex flex-wrap gap-2 justify-center max-w-4xl w-full">
              {words.map((word, idx) => (
                <div key={idx} className="p-2 bg-zinc-900/80 rounded-xl border border-zinc-800 flex flex-col items-center gap-2 min-w-[100px] md:min-w-[120px]">
                  <span className="text-sm md:text-lg font-black uppercase text-white tracking-tighter text-center">{word}</span>
                  <div className="grid grid-cols-2 gap-1 w-full">
                    {[ 
                      { k: 'subj', l: 'S', c: 'bg-cyan-500', idxK: 'subjectIndices' },
                      { k: 'verb', l: 'V', c: 'bg-fuchsia-500', idxK: 'verbIndices' },
                      { k: 'compSubj', l: 'CS', c: 'bg-yellow-400', idxK: 'completeSubjectIndices' },
                      { k: 'compPred', l: 'CP', c: 'bg-lime-400', idxK: 'completePredicateIndices' }
                    ].map(btn => (
                      <button 
                        key={btn.k}
                        onClick={() => handleTuesdayClick(idx, btn.k as any)} 
                        className={`py-1 rounded-md flex items-center justify-center text-[8px] md:text-[9px] font-black transition-all ${gameState.history[Stage.TUESDAY][btn.idxK].includes(idx) ? `${btn.c} text-black scale-105` : 'bg-black text-zinc-600 border border-zinc-800 hover:border-zinc-500'}`}
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
          <div className="flex flex-col gap-4 items-center py-4 w-full max-w-md mx-auto">
             <div className="w-full">
              <label className="block text-[10px] uppercase text-cyan-500 mb-1 font-black tracking-widest text-center">Clause Count</label>
              <input 
                type="number" 
                className="w-full bg-zinc-900 border-2 border-zinc-800 p-2 rounded-lg text-2xl font-black text-center text-white focus:border-cyan-500 outline-none transition-all"
                value={gameState.history[Stage.WEDNESDAY].clauseCount}
                onChange={(e) => setGameState(prev => ({
                  ...prev,
                  history: { ...prev.history, [Stage.WEDNESDAY]: { ...prev.history[Stage.WEDNESDAY], clauseCount: parseInt(e.target.value) } }
                }))}
              />
            </div>
            <div className="w-full">
              <label className="block text-[10px] uppercase text-fuchsia-500 mb-1 font-black tracking-widest text-center">Sentence Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['Simple', 'Compound', 'Complex', 'Compound-Complex'].map(type => (
                  <button
                    key={type}
                    onClick={() => setGameState(prev => ({
                      ...prev,
                      history: { ...prev.history, [Stage.WEDNESDAY]: { ...prev.history[Stage.WEDNESDAY], sentenceType: type } }
                    }))}
                    className={`p-2 rounded-lg border font-black text-xs transition-all ${gameState.history[Stage.WEDNESDAY].sentenceType === type ? 'bg-fuchsia-500 border-white text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-fuchsia-500/50'}`}
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
          <div className="flex flex-col gap-2 items-center py-2 w-full max-w-2xl mx-auto">
            <div className="text-[10px] uppercase text-lime-400 font-black tracking-widest bg-lime-400/10 px-3 py-1 rounded-full border border-lime-400/20">FIX ERRORS</div>
            <textarea 
              className="w-full h-32 md:h-40 bg-zinc-950 border-4 border-zinc-900 p-4 rounded-xl text-lg md:text-2xl font-black tracking-tight text-center resize-none outline-none focus:border-lime-500 transition-all text-lime-400 shadow-sm placeholder-zinc-800"
              placeholder="FIXED VERSION..."
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
          <div className="flex flex-col gap-4 items-center py-2 w-full">
            <div className="text-center">
              <h3 className="text-xl md:text-3xl bangers tracking-tighter text-cyan-400">TETRIS DIAGRAM</h3>
              <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-0.5">Pick word, drop in, rotate mods.</p>
            </div>

            <div className="flex flex-wrap gap-1.5 justify-center max-w-2xl bg-zinc-900/30 p-2 rounded-xl border border-zinc-800 w-full">
              {words.map((word, idx) => {
                const isUsed = gameState.history[Stage.FRIDAY].slots.some((s: FridaySlot) => s.wordIdx === idx);
                return (
                  <button 
                    key={idx}
                    onClick={() => setSelectedWordIdx(idx)}
                    className={`px-3 py-1.5 rounded-md font-black uppercase text-[10px] md:text-xs border transition-all ${selectedWordIdx === idx ? 'border-white bg-white text-black' : isUsed ? 'border-zinc-800 text-zinc-700 bg-black opacity-20 pointer-events-none' : 'border-cyan-500 bg-black text-cyan-400 hover:bg-cyan-500 hover:text-white'}`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full max-w-3xl aspect-[21/9] bg-zinc-950 border-2 border-zinc-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-2 shadow-lg">
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
              <div className="absolute top-[50%] left-0 w-full h-[1px] bg-zinc-700"></div>
              
              <div className="relative z-10 flex flex-wrap justify-center items-center gap-2 md:gap-4 w-full h-full">
                {gameState.history[Stage.FRIDAY].slots.map((slot: FridaySlot) => (
                  <div 
                    key={slot.id}
                    onClick={() => {
                      if (selectedWordIdx !== null) handleFridaySlotClick(slot.id);
                      else toggleFridayRotation(slot.id);
                    }}
                    style={{ 
                      transform: `rotate(${slot.rotation}deg)`,
                      transition: 'all 0.4s ease-out'
                    }}
                    className={`relative w-20 h-8 sm:w-28 sm:h-12 md:w-36 md:h-16 flex items-center justify-center border-2 border-solid transition-all cursor-pointer rounded-lg group ${slot.wordIdx !== null ? `${slotColors[slot.type]} shadow-md` : 'border-zinc-800 hover:border-zinc-600 bg-black/40'}`}
                  >
                    <span className="text-[6px] md:text-[8px] absolute -top-3 left-0 uppercase font-black text-zinc-600 tracking-wider opacity-60">
                      {slot.type}
                    </span>
                    {slot.wordIdx !== null ? (
                      <span className="text-[8px] sm:text-[10px] md:text-lg font-black uppercase text-white tracking-widest truncate px-1">
                        {words[slot.wordIdx]}
                      </span>
                    ) : (
                      <span className="text-zinc-800 font-black text-sm md:text-xl">+</span>
                    )}
                    {slot.type === 'subject' && <div className="absolute -right-[1px] top-0 h-full w-[2px] bg-white/40"></div>}
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              onClick={() => setGameState(prev => ({...prev, history: {...prev.history, [Stage.FRIDAY]: {...prev.history[Stage.FRIDAY], slots: prev.history[Stage.FRIDAY].slots.map(s => ({...s, wordIdx: null}))}}}))}
              className="text-[8px] md:text-[10px] font-black tracking-widest text-zinc-600 hover:text-white transition-all uppercase underline underline-offset-4"
            >
              Reset Diagram
            </button>
          </div>
        );

      default:
        return <div className="text-2xl bangers text-center py-6 text-cyan-400">SIGMA STATUS ACHIEVED</div>;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black overflow-x-hidden flex flex-col">
      <AudioPlayer base64Audio={hypeAudio} enabled={gameState.musicEnabled} />
      
      {/* Phonk Control Center */}
      <div className="fixed top-2 left-2 z-[100] flex items-center gap-2 bg-zinc-950/80 p-1 pr-3 rounded-full border border-zinc-800 backdrop-blur-md">
        <button 
          onClick={toggleMusic}
          className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border transition-all transform active:scale-90 ${gameState.musicEnabled ? 'bg-white border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]' : 'bg-zinc-900 border-zinc-800 opacity-50'}`}
        >
          <span className="text-xs md:text-lg">{gameState.musicEnabled ? '🔊' : '🔇'}</span>
        </button>
        <div className="flex flex-col">
          <span className="text-[7px] font-black tracking-tight uppercase text-zinc-600 leading-none">PHONK</span>
          <span className={`text-[9px] font-black uppercase tracking-widest ${gameState.musicEnabled ? 'text-cyan-400' : 'text-zinc-700'}`}>
            {gameState.musicEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      <header className="p-2 md:p-4 flex flex-col items-center bg-zinc-950/40 backdrop-blur-md border-b border-zinc-900 shrink-0">
        <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl bangers tracking-tighter phonk-gradient leading-none text-center select-none">DIGITAL DGP</h1>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="h-[1px] w-4 md:w-12 bg-gradient-to-r from-transparent to-fuchsia-600"></div>
          <p className="text-zinc-500 uppercase tracking-widest text-[6px] md:text-[10px] font-black whitespace-nowrap">Gen Alpha Grammar Grind</p>
          <div className="h-[1px] w-4 md:w-12 bg-gradient-to-l from-transparent to-cyan-500"></div>
        </div>
      </header>

      <main className="max-w-[1200px] w-full mx-auto p-2 md:p-4 flex-1 flex flex-col gap-2">
        
        {/* Progress Tracker */}
        <div className="grid grid-cols-5 gap-1 md:gap-2 shrink-0">
          {STAGE_ORDER.map((s) => {
            const isCompleted = gameState.completedStages.includes(s);
            const isCurrent = gameState.currentStage === s;
            return (
              <div key={s} className={`p-1 md:p-2 border-b-2 transition-all relative rounded-md ${isCurrent ? 'border-cyan-500 bg-zinc-900/40' : isCompleted ? 'border-lime-500 text-lime-500' : 'border-zinc-900 text-zinc-800'}`}>
                {isCurrent && <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-500"></div>}
                <div className="text-[6px] md:text-[8px] uppercase font-black tracking-wider mb-0.5">{isCompleted ? '✓' : s[0]}</div>
                <div className={`text-[8px] md:text-lg font-black italic uppercase truncate ${isCurrent ? 'text-white' : ''}`}>{s}</div>
              </div>
            );
          })}
        </div>

        <div className="relative flex-1 flex flex-col">
          {gameState.isLoading && (
            <div className="absolute inset-0 bg-black/95 z-[60] flex flex-col items-center justify-center backdrop-blur-sm rounded-xl">
              <div className="text-3xl md:text-6xl bangers tracking-widest animate-pulse phonk-gradient">RIZZING...</div>
              <p className="text-zinc-700 font-black tracking-widest mt-2 uppercase text-[8px] md:text-xs text-center">Loading Gains</p>
            </div>
          )}

          <div className="glitch-border rounded-xl bg-zinc-950/60 p-3 md:p-6 flex flex-col justify-between flex-1 shadow-2xl backdrop-blur-sm overflow-hidden">
            <div className="w-full flex flex-col gap-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 shrink-0">
                <div className="border-l-4 border-fuchsia-600 pl-3">
                  <span className="text-[8px] font-black tracking-widest text-zinc-600 uppercase block">Logic Target</span>
                  <div className="text-sm md:text-2xl font-black tracking-tight text-white leading-tight">"{gameState.rawSentence}"</div>
                </div>
                <div className="hidden lg:flex items-center gap-2 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-ping"></div>
                  <span className="text-[8px] font-black uppercase text-zinc-400">Neural Link Stable</span>
                </div>
              </div>
              
              <div className="w-full">
                {renderStageContent()}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 items-center justify-between mt-4 pt-4 border-t border-zinc-900/60 shrink-0">
              <div className="relative p-2 md:p-4 bg-black/60 rounded-xl border border-zinc-800 flex-1 w-full shadow-inner">
                <div className="absolute -top-2 left-3 px-2 bg-zinc-900 text-[6px] md:text-[8px] font-black tracking-wider text-zinc-500 uppercase border border-zinc-800 rounded-full">System Feedback</div>
                <div className="text-xs md:text-lg font-black italic text-white leading-tight text-center lg:text-left truncate">
                  "{gameState.feedback}"
                </div>
              </div>

              <button 
                onClick={submitStage}
                disabled={gameState.isLoading}
                className="group relative w-full lg:w-auto px-6 md:px-12 py-3 md:py-6 bg-white text-black font-black text-lg md:text-3xl uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all disabled:opacity-5 rounded-lg md:rounded-xl flex items-center justify-center gap-2 md:gap-4"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-fuchsia-600 to-lime-500 blur-md opacity-20 group-hover:opacity-100 transition duration-700 rounded-lg"></div>
                <span className="relative">SEND IT</span>
                <span className="relative text-lg md:text-2xl transform group-hover:translate-x-1 transition-transform">➔</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-600 via-cyan-500 to-lime-500 z-[100] shadow-[0_-2px_10px_rgba(6,182,212,0.4)]"></div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
};

export default App;
