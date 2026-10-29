import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  HelpCircle,
  Edit3,
  MessageSquareText,
  Timer,
  RotateCcw,
  Play,
  RefreshCw,
  CheckCircle2,
  Flame,
  Trophy,
  Check,
} from 'lucide-react';
import { GameState, MiniGameType } from '../types';
import { liquidAudio } from '../lib/audioSynth';
import { featherSystem } from '../lib/featherSystem';

interface MiniGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState | null;
  onUpdateGame: (state: Partial<GameState>) => void;
  myRole: 'A' | 'B';
  isDarkMode?: boolean;
}

const RAPID_FIRE_QUESTIONS = [
  { opt1: 'চা (Tea) ☕', opt2: 'কফি (Coffee) 🧋' },
  { opt1: 'সমুদ্রের ঢেউ (Beach) 🌊', opt2: 'পাহাড় ও মেঘ (Mountain) 🏔️' },
  { opt1: 'রাত জাগা (Night Owl) 🌙', opt2: 'ভোরে ওঠা (Early Bird) 🌅' },
  { opt1: 'মিষ্টি খাবার (Sweet) 🍯', opt2: 'ঝাল চটপটি (Spicy) 🌶️' },
  { opt1: 'ঘুরে বেড়ানো (Travel) ✈️', opt2: 'বাসায় আরাম (Stay Home) 🛋️' },
];

const WOULD_YOU_RATHER_LIST = [
  { opt1: 'Travel 100 years into the future', opt2: 'Travel 100 years into the past', bangla: '১০০ বছর ভবিষ্যতে নাকি অতীতে যাবে?' },
  { opt1: 'Speak every human language', opt2: 'Communicate with all animals', bangla: 'সব ভাষা জানা নাকি পশুপাখির সাথে কথা বলা?' },
  { opt1: 'Always know when someone is lying', opt2: 'Always get away with any secret', bangla: 'কেউ মিথ্যা বললে বোঝা নাকি নিজের সিক্রেট রাখা?' },
  { opt1: 'Live by a serene crystal ocean', opt2: 'Live in a secluded misty mountain cabin', bangla: 'সমুদ্রের পাড়ে নাকি কুয়াশাচ্ছন্ন পাহাড়ে থাকা?' },
  { opt1: 'Read minds for 1 hour every day', opt2: 'Be invisible for 1 hour every day', bangla: '১ ঘণ্টা মন পড়া নাকি ১ ঘণ্টা অদৃশ্য হওয়া?' },
  { opt1: 'Never need sleep but always energetic', opt2: 'Eat whatever you want without getting fat', bangla: 'ঘুম ছাড়া সবসময় ফ্রেশ নাকি যা খুশি খাওয়া?' },
  { opt1: 'Unlimited free flights anywhere', opt2: 'Unlimited free dining at any restaurant', bangla: 'ফ্রিতে বিমান ভ্রমণ নাকি সেরা রেস্টুরেন্টে খাওয়া?' },
];

const QUICK_QUIZ_LIST = [
  { q: 'What is your ideal late-night comfort activity?', opt: ['🎧 Listening to acoustic music', '🌌 Stargazing quietly', '📞 Deep late phone call', '🎬 Watching cozy movies'] },
  { q: 'What is your current emotional weather?', opt: ['☀️ Warm & Sunny', '🌧️ Gentle Rain', '⛅ Calm Breeze', '⚡ Lightning Energy'] },
  { q: 'If we could teleport right now, where to?', opt: ['🌊 Cox\'s Bazar beach at dusk', '☕ Cozy tea stall in the rain', '🏔️ Sajek valley clouds', '🌃 Rooftop under city lights'] },
  { q: 'What kind of person are you in conversation?', opt: ['🗣️ Great listener', '💭 Deep thinker', '😂 The funny one', '🕊️ The calm anchor'] },
];

const FIVE_SEC_CHALLENGES = [
  '১০ সেকেন্ডে ৩টা প্রিয় গানের নাম বলো! 🎵',
  '১০ সেকেন্ডে ৩টি স্ট্রিট ফুডের নাম বলো! 🍲',
  '১০ সেকেন্ডে ৩টি স্বপ্নের জায়গার নাম বলো! ✈️',
  '১০ সেকেন্ডে ৩টি জিনিস যা এই সপ্তাহে তোমাকে হাসিয়েছে! 😊',
  '১০ সেকেন্ডে এমন ৩টি অভ্যাস যা তোমাকে ভালো রাখে! ⭐',
];

export const MiniGamesModal: React.FC<MiniGamesModalProps> = ({
  isOpen,
  onClose,
  gameState,
  onUpdateGame,
  myRole,
  isDarkMode = false,
}) => {
  const [selectedGame, setSelectedGame] = useState<MiniGameType>('rapid_fire');
  const [storyInput, setStoryInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [localCountdown, setLocalCountdown] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const partnerRole = myRole === 'A' ? 'B' : 'A';

  // Sync selected game with peer when gameState updates
  useEffect(() => {
    if (gameState?.type && gameState.type !== selectedGame) {
      setSelectedGame(gameState.type);
    }
  }, [gameState?.type]);

  // Handle countdown timer sync
  useEffect(() => {
    if (typeof gameState?.timeLeft === 'number' && gameState.timeLeft > 0) {
      setLocalCountdown(gameState.timeLeft);
      const timer = setInterval(() => {
        setLocalCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            liquidAudio.playSynchronyChime();
            return 0;
          }
          liquidAudio.playSubtleBubble(300);
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else if (gameState?.timeLeft === 0) {
      setLocalCountdown(0);
    }
  }, [gameState?.timeLeft]);

  // Draw and Guess canvas setup
  useEffect(() => {
    if (selectedGame === 'draw_and_guess' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = isDarkMode ? '#38bdf8' : '#0284c7';
        ctx.lineWidth = 3;

        if (gameState?.drawingData) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
          img.src = gameState.drawingData;
        }
      }
    }
  }, [selectedGame, gameState?.drawingData, isDarkMode]);

  // If opening modal and no active gameState, start Rapid Fire as default
  useEffect(() => {
    if (isOpen && !gameState) {
      handleStartGame('rapid_fire');
    }
  }, [isOpen, gameState]);

  if (!isOpen) return null;

  const handleStartGame = (gameType: MiniGameType) => {
    setSelectedGame(gameType);
    liquidAudio.playSubtleBubble();

    if (gameType === 'rapid_fire') {
      onUpdateGame({
        type: 'rapid_fire',
        prompt: 'Rapid Fire: 5 Instant Choices!',
        promptBangla: 'র‍্যাপিড ফায়ার: দ্রুত ৫টি নির্বাচন!',
        rapidFire: {
          currentRound: 0,
          totalRounds: RAPID_FIRE_QUESTIONS.length,
          answers: {},
          completed: false,
        },
      });
    } else if (gameType === 'would_you_rather') {
      const randomItem = WOULD_YOU_RATHER_LIST[0];
      onUpdateGame({
        type: 'would_you_rather',
        prompt: 'Which would you rather experience?',
        promptBangla: randomItem.bangla,
        options: [randomItem.opt1, randomItem.opt2],
        answers: {},
      });
    } else if (gameType === 'quick_quiz') {
      const randomItem = QUICK_QUIZ_LIST[0];
      onUpdateGame({
        type: 'quick_quiz',
        prompt: randomItem.q,
        options: randomItem.opt,
        answers: {},
      });
    } else if (gameType === 'five_second_challenge') {
      const randomPrompt = FIVE_SEC_CHALLENGES[0];
      onUpdateGame({
        type: 'five_second_challenge',
        prompt: randomPrompt,
        timeLeft: 10,
        answers: {},
      });
    } else if (gameType === 'one_word_story') {
      onUpdateGame({
        type: 'one_word_story',
        prompt: 'Collaborative Story (One word at a time):',
        storyWords: ['Once', 'upon', 'a', 'calm', 'night,'],
        currentTurn: 'A',
      });
    } else if (gameType === 'draw_and_guess') {
      onUpdateGame({
        type: 'draw_and_guess',
        prompt: 'Draw something you love:',
        drawingPrompt: 'A glowing star',
        drawingData: '',
        guesses: [],
      });
    }
  };

  // Rapid Fire Choice Selection
  const handleRapidFireSelect = (roundIdx: number, choice: string) => {
    liquidAudio.playSubtleBubble(320);
    const rf = gameState?.rapidFire || {
      currentRound: 0,
      totalRounds: RAPID_FIRE_QUESTIONS.length,
      answers: {},
      completed: false,
    };

    const currentRoundAnswers = rf.answers[roundIdx] || {};
    const updatedRound = { ...currentRoundAnswers, [myRole]: choice };
    const allAnswers = { ...rf.answers, [roundIdx]: updatedRound };

    // Check if partner also answered this round
    const bothAnswered = !!updatedRound[partnerRole];

    onUpdateGame({
      rapidFire: {
        ...rf,
        answers: allAnswers,
      },
    });

    if (bothAnswered) {
      liquidAudio.playSynchronyChime();
    }
  };

  // Advance Rapid Fire to Next Round
  const handleRapidFireNextRound = () => {
    liquidAudio.playRippleSound();
    const rf = gameState?.rapidFire;
    if (!rf) return;

    const nextRound = rf.currentRound + 1;
    const completed = nextRound >= RAPID_FIRE_QUESTIONS.length;

    onUpdateGame({
      rapidFire: {
        ...rf,
        currentRound: nextRound,
        completed,
      },
    });

    if (completed) {
      liquidAudio.playSynchronyChime();
      featherSystem.rewardGameCompleted('Rapid Fire', 'র‍্যাপিড ফায়ার');
    }
  };

  // Would You Rather & Quiz Answers
  const handleChooseAnswer = (option: string) => {
    liquidAudio.playRippleSound();
    const updatedAnswers = {
      ...(gameState?.answers || {}),
      [myRole]: option,
    };
    onUpdateGame({ answers: updatedAnswers });

    if (updatedAnswers[partnerRole]) {
      liquidAudio.playSynchronyChime();
      featherSystem.rewardGameCompleted(selectedGame, selectedGame);
    }
  };

  const handleNextWouldYouRather = () => {
    liquidAudio.playSubtleBubble();
    const currentIdx = WOULD_YOU_RATHER_LIST.findIndex((x) => gameState?.options?.includes(x.opt1));
    const nextIdx = (currentIdx + 1) % WOULD_YOU_RATHER_LIST.length;
    const nextItem = WOULD_YOU_RATHER_LIST[nextIdx];
    onUpdateGame({
      type: 'would_you_rather',
      prompt: 'Which would you rather experience?',
      promptBangla: nextItem.bangla,
      options: [nextItem.opt1, nextItem.opt2],
      answers: {},
    });
  };

  const handleNextQuiz = () => {
    liquidAudio.playSubtleBubble();
    const currentIdx = QUICK_QUIZ_LIST.findIndex((x) => x.q === gameState?.prompt);
    const nextIdx = (currentIdx + 1) % QUICK_QUIZ_LIST.length;
    const nextItem = QUICK_QUIZ_LIST[nextIdx];
    onUpdateGame({
      type: 'quick_quiz',
      prompt: nextItem.q,
      options: nextItem.opt,
      answers: {},
    });
  };

  const handleStart5sTimer = () => {
    liquidAudio.playSubtleBubble(200);
    const randomPrompt = FIVE_SEC_CHALLENGES[Math.floor(Math.random() * FIVE_SEC_CHALLENGES.length)];
    onUpdateGame({
      type: 'five_second_challenge',
      prompt: randomPrompt,
      timeLeft: 10,
    });
  };

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyInput.trim()) return;

    liquidAudio.playRippleSound();
    const currentStory = gameState?.storyWords || [];
    const nextTurn = myRole === 'A' ? 'B' : 'A';
    onUpdateGame({
      storyWords: [...currentStory, storyInput.trim()],
      currentTurn: nextTurn,
    });
    setStoryInput('');
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      onUpdateGame({ drawingData: dataUrl });
    }
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onUpdateGame({ drawingData: '' });
    }
  };

  const myAnswer = gameState?.answers?.[myRole];
  const partnerAnswer = gameState?.answers?.[partnerRole];
  const bothAnswered = !!myAnswer && !!partnerAnswer;
  const isMatch = bothAnswered && myAnswer === partnerAnswer;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-sm rounded-[36px] p-6 border shadow-[0_24px_48px_-12px_rgba(0,0,0,0.2)] flex flex-col justify-between max-h-[88vh] overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-[#090d16] border-slate-800 text-white'
            : 'bg-white border-slate-200/90 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <span className="text-base">🕊️</span>
            <div>
              <h3 className="text-xs font-black tracking-widest uppercase text-slate-900 dark:text-white font-english">
                Connection Games
              </h3>
              <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold font-bangla">
                লাইভ ২ জনের খেলা
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
              isDarkMode
                ? 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Game Tabs */}
        <div className="flex gap-1.5 overflow-x-auto py-3 scrollbar-none">
          {[
            { id: 'rapid_fire', label: 'Rapid Fire', icon: Flame },
            { id: 'would_you_rather', label: 'Would You Rather', icon: HelpCircle },
            { id: 'quick_quiz', label: 'Quick Quiz', icon: Sparkles },
            { id: 'five_second_challenge', label: '10s Challenge', icon: Timer },
            { id: 'one_word_story', label: 'One Word', icon: MessageSquareText },
            { id: 'draw_and_guess', label: 'Draw', icon: Edit3 },
          ].map((item) => {
            const Icon = item.icon;
            const isSel = selectedGame === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleStartGame(item.id as MiniGameType)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 border transition-all font-english shrink-0 ${
                  isSel
                    ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-xs scale-105'
                    : isDarkMode
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3 h-3 stroke-[2.2]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Game Body */}
        <div className="flex-1 py-2 overflow-y-auto scrollbar-none flex flex-col justify-center">
          {/* 1. RAPID FIRE */}
          {selectedGame === 'rapid_fire' && (
            <div className="space-y-4 text-center animate-fade-in">
              {(() => {
                const rf = gameState?.rapidFire || {
                  currentRound: 0,
                  totalRounds: RAPID_FIRE_QUESTIONS.length,
                  answers: {},
                  completed: false,
                };
                const roundIdx = Math.min(rf.currentRound, RAPID_FIRE_QUESTIONS.length - 1);
                const currentQuestion = RAPID_FIRE_QUESTIONS[roundIdx];
                const roundAnswers = rf.answers[roundIdx] || {};
                const myPick = roundAnswers[myRole];
                const partnerPick = roundAnswers[partnerRole];
                const roundFinished = !!myPick && !!partnerPick;
                const roundMatched = roundFinished && myPick === partnerPick;

                if (rf.completed) {
                  // Calculate match score
                  let matchCount = 0;
                  for (let i = 0; i < RAPID_FIRE_QUESTIONS.length; i++) {
                    const ans = rf.answers[i];
                    if (ans && ans.A && ans.B && ans.A === ans.B) {
                      matchCount++;
                    }
                  }

                  return (
                    <div className="p-5 rounded-3xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center mx-auto text-xl shadow-md">
                        🔥
                      </div>
                      <h4 className="text-sm font-black uppercase text-rose-950 dark:text-rose-100 font-english">
                        Rapid Fire Complete!
                      </h4>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-bangla">
                        ৫টি রাউন্ডের মধ্যে <span className="text-rose-600 text-sm font-black">{matchCount}</span> টি বিষয়ে আপনাদের পছন্দ হুবহু মিলেছে! 🕊️
                      </p>
                      <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900 border border-rose-200/50 flex items-center justify-center gap-2 text-xs font-black text-amber-600">
                        <Trophy className="w-4 h-4" />
                        <span>+20 🪶 পালক ও +35 XP অর্জিত হয়েছে!</span>
                      </div>
                      <button
                        onClick={() => handleStartGame('rapid_fire')}
                        className="w-full py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-rose-600/30"
                      >
                        আবার খেলো (Play Again)
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-xs font-black text-rose-600 uppercase tracking-widest font-english">
                        Round {roundIdx + 1} of {RAPID_FIRE_QUESTIONS.length}
                      </span>
                      <span className="text-[11px] text-slate-500 font-bold font-bangla">
                        দ্রুত একটি বেছে নাও!
                      </span>
                    </div>

                    {/* The 2 Choice Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      {[currentQuestion.opt1, currentQuestion.opt2].map((opt) => {
                        const isMySelection = myPick === opt;
                        const isPartnerSelection = roundFinished && partnerPick === opt;

                        return (
                          <button
                            key={opt}
                            onClick={() => handleRapidFireSelect(roundIdx, opt)}
                            className={`p-4 rounded-3xl text-xs font-extrabold border transition-all flex flex-col items-center justify-center min-h-[90px] active:scale-95 ${
                              isMySelection
                                ? 'bg-rose-600 text-white border-rose-600 shadow-lg scale-105'
                                : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white hover:border-rose-300'
                            }`}
                          >
                            <span className="text-sm font-bangla leading-snug">{opt}</span>
                            {isMySelection && (
                              <span className="text-[10px] font-bold mt-1 text-rose-100">
                                তোমার পছন্দ ✓
                              </span>
                            )}
                            {isPartnerSelection && !isMySelection && (
                              <span className="text-[10px] font-bold mt-1 text-purple-600">
                                সঙ্গীর পছন্দ
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Status & Next Button */}
                    {roundFinished ? (
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 animate-fade-in">
                        <p className="text-xs font-bold text-slate-800 dark:text-white font-bangla">
                          {roundMatched
                            ? '🎯 অসাধারণ! দুজনের উত্তর হুবহু মিলেছে!'
                            : '✨ দুজনের ভিন্ন সুন্দর রুচি!'}
                        </p>
                        <button
                          onClick={handleRapidFireNextRound}
                          className="w-full py-2.5 rounded-xl bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                        >
                          পরবর্তী রাউন্ড (Next Round) →
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 font-medium font-bangla">
                        {myPick
                          ? '⏳ সঙ্গীর পছন্দের জন্য অপেক্ষা করছি...'
                          : '👉 যেকোনো একটি বোতামে ক্লিক করো'}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* 2. WOULD YOU RATHER */}
          {selectedGame === 'would_you_rather' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest font-english">
                  Would You Rather:
                </span>
                <button
                  onClick={handleNextWouldYouRather}
                  className="flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 font-english"
                >
                  <RefreshCw className="w-3 h-3" /> Next
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-center">
                <p className="text-xs font-bold text-sky-950 dark:text-sky-100 font-bangla">
                  {gameState?.promptBangla || gameState?.prompt}
                </p>
              </div>

              {gameState?.options?.map((opt, idx) => {
                const isMyChoice = myAnswer === opt;
                const isPartnerChoice = bothAnswered && partnerAnswer === opt;

                return (
                  <button
                    key={idx}
                    onClick={() => handleChooseAnswer(opt)}
                    className={`w-full p-4 rounded-2xl border text-left text-xs leading-relaxed transition-all relative ${
                      isMyChoice
                        ? 'bg-sky-500 text-white border-sky-500 font-bold shadow-md'
                        : isDarkMode
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>{opt}</div>
                    <div className="mt-1 flex items-center gap-2 text-[10px]">
                      {isMyChoice && <span>• তোমার পছন্দ</span>}
                      {isPartnerChoice && <span className="text-amber-300">• সঙ্গীর পছন্দ</span>}
                    </div>
                  </button>
                );
              })}

              {bothAnswered && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-center text-xs font-bold text-emerald-800 dark:text-emerald-200 animate-fade-in">
                  <span>{isMatch ? '✨ দুজনেই একই চিন্তা করো!' : '🕊️ দুজনের দৃষ্টিভঙ্গি চমৎকার!'}</span>
                </div>
              )}
            </div>
          )}

          {/* 3. QUICK QUIZ */}
          {selectedGame === 'quick_quiz' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300">
                  {gameState?.prompt}
                </h4>
                <button
                  onClick={handleNextQuiz}
                  className="flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-700 font-english shrink-0"
                >
                  <RefreshCw className="w-3 h-3" /> Next
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {gameState?.options?.map((opt, idx) => {
                  const isMyChoice = myAnswer === opt;
                  const isPartnerChoice = bothAnswered && partnerAnswer === opt;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleChooseAnswer(opt)}
                      className={`p-3.5 rounded-2xl border text-left text-xs font-medium transition-all ${
                        isMyChoice
                          ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-xs'
                          : isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div>{opt}</div>
                      <div className="mt-1 flex items-center gap-2 text-[10px]">
                        {isMyChoice && <span>• তোমার পছন্দ</span>}
                        {isPartnerChoice && <span className="text-amber-300">• সঙ্গীর পছন্দ</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. 10S AUDIO CHALLENGE */}
          {selectedGame === 'five_second_challenge' && (
            <div className="text-center space-y-4 py-2">
              <div
                className={`w-16 h-16 rounded-full border-2 mx-auto flex items-center justify-center font-black text-2xl transition-all font-mono shadow-xs ${
                  localCountdown !== null && localCountdown > 0
                    ? 'border-amber-500 text-amber-500 bg-amber-50 dark:bg-amber-950/40 animate-pulse scale-110'
                    : localCountdown === 0
                    ? 'border-emerald-500 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                    : 'border-slate-300 text-slate-400 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                }`}
              >
                {localCountdown !== null ? localCountdown : '10'}s
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-white max-w-xs mx-auto leading-relaxed font-bangla">
                  {gameState?.prompt || FIVE_SEC_CHALLENGES[0]}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {localCountdown === 0
                    ? 'সময় শেষ! অন্যজনের কেমন লাগল?'
                    : localCountdown !== null && localCountdown > 0
                    ? 'মাইকে কথা বলো!'
                    : 'Start চাপুন এবং মাইকে কথা বলুন!'}
                </p>
              </div>

              <button
                onClick={handleStart5sTimer}
                className="px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 mx-auto active:scale-95 transition-all font-english"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start 10s Timer</span>
              </button>
            </div>
          )}

          {/* 5. ONE WORD STORY */}
          {selectedGame === 'one_word_story' && (
            <div className="space-y-3">
              <div
                className={`p-4 rounded-3xl border text-xs min-h-[90px] leading-relaxed font-bangla ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {gameState?.storyWords?.join(' ')}
              </div>

              <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between px-1 font-bangla">
                <span>
                  {gameState?.currentTurn === myRole
                    ? '🟢 তোমার পালা! ১-২টি শব্দ যোগ করো:'
                    : '⏳ সঙ্গী শব্দ যোগ করছে...'}
                </span>
              </div>

              <form onSubmit={handleAddWord} className="flex gap-2">
                <input
                  type="text"
                  value={storyInput}
                  onChange={(e) => setStoryInput(e.target.value)}
                  placeholder="শব্দ লিখুন..."
                  className={`flex-1 border rounded-2xl px-4 py-2.5 text-xs focus:outline-hidden ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-800 text-white'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
                <button
                  type="submit"
                  disabled={gameState?.currentTurn !== myRole || !storyInput.trim()}
                  className="px-4 py-2.5 rounded-2xl bg-cyan-600 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-700 transition-all shadow-xs disabled:opacity-50"
                >
                  যোগ
                </button>
              </form>
            </div>
          )}

          {/* 6. DRAW & GUESS */}
          {selectedGame === 'draw_and_guess' && (
            <div className="space-y-2 flex flex-col items-center">
              <div className="flex items-center justify-between w-full px-1 text-[11px] text-slate-500 font-medium font-bangla">
                <span>পানির রঙে আঁকা ক্যানভাস</span>
                <button
                  onClick={clearDrawing}
                  className="flex items-center gap-1 text-cyan-600 hover:underline font-bold font-english"
                >
                  <RotateCcw className="w-3 h-3" /> Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={280}
                height={170}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className={`w-[280px] h-[170px] border rounded-3xl touch-none cursor-crosshair shadow-inner ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className={`w-full py-3 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-all mt-2 font-english shadow-xs ${
            isDarkMode
              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
          }`}
        >
          Close Games
        </button>
      </div>
    </div>
  );
};
