import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Zap,
  Laugh,
  HelpCircle,
  Target,
  FileText,
  Music,
  Flame,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Eye,
  Send,
} from 'lucide-react';
import { GameState, MiniGameType, SurpriseActivityType } from '../types';
import { liquidAudio } from '../lib/audioSynth';

interface KobutorSurpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState | null;
  onUpdateGame: (state: Partial<GameState>) => void;
  myRole: 'A' | 'B';
  isDarkMode?: boolean;
}

const SECRET_QUESTIONS = [
  {
    bangla: 'একটা জিনিস যেটা মানুষ তোমার সম্পর্কে প্রথমেই ভুল ভাবে?',
    english: 'One thing people mistakenly assume about you at first?',
  },
  {
    bangla: 'এখনই পৃথিবীর যেকোনো জায়গায় যেতে পারলে কোথায় যাবে?',
    english: 'If you could teleport anywhere on Earth right now, where to?',
  },
  {
    bangla: 'কোন ছোট ব্যাপারটা তোমাকে instantly খুশি করে দেয়?',
    english: 'What small thing instantly brightens up your day?',
  },
  {
    bangla: 'তোমার জীবনের সবচেয়ে মজার বা অপ্রস্তুত মুহূর্ত কোনটা?',
    english: 'What is one of the funniest awkward moments of your life?',
  },
  {
    bangla: 'একটা সুপারপাওয়ার বেছে নিতে বললে কোনটা নেবে?',
    english: 'If you had to pick one real-world superpower, what would it be?',
  },
];

const GUESS_QUESTIONS = [
  {
    bangla: 'আমার পছন্দের চায়ের ধরন কী?',
    english: 'What is my preferred style of tea/beverage?',
    options: ['দুধ চা (Milky)', 'রং চা / লেবু চা (Black/Lemon)', 'কফি (Coffee)', 'গ্রিন টি (Green Tea)'],
  },
  {
    bangla: 'আমি ফ্রি সময়ে সবচেয়ে বেশি কী করি?',
    english: 'What do I do most in my free time?',
    options: ['গান শুনি (Music)', 'মুভি / সিরিজ দেখি (Movies)', 'আড্ডা বা কথা বলা (Talking)', 'একা সময় কাটাই (Solitude)'],
  },
  {
    bangla: 'আমার আদর্শ ছুটি কাটানোর জায়গা কোনটা?',
    english: 'What is my dream vacation spot?',
    options: ['সমুদ্রের ঢেউ (Beach)', 'পাহাড় ও মেঘ (Mountains)', 'ঐতিহাসিক প্রাচীন শহর (Heritage)', 'শান্ত নিরিবিলি গ্রাম (Countryside)'],
  },
];

const RAPID_FIRE_QUESTIONS = [
  { opt1: 'চা (Tea)', opt2: 'কফি (Coffee)' },
  { opt1: 'সমুদ্র (Beach)', opt2: 'পাহাড় (Mountain)' },
  { opt1: 'রাত জাগা (Night Owl)', opt2: 'সকালে ওঠা (Early Bird)' },
  { opt1: 'মিষ্টি (Sweet)', opt2: 'ঝাল (Spicy)' },
  { opt1: 'ঘুরে বেড়ানো (Travel)', opt2: 'বাসায় থাকা (Stay Home)' },
];

const TEN_SEC_PROMPTS = [
  '১০ সেকেন্ডে ৩টা প্রিয় গান বা ব্যান্ডের নাম বলো! 🎵',
  '১০ সেকেন্ডে ৫টি প্রিয় খাবারের নাম বলো! 🍲',
  '১০ সেকেন্ডে ৩টি দেশের নাম বলো যেখানে যেতে চাও! ✈️',
  '১০ সেকেন্ডে তোমার ফোনে থাকা সবচেয়ে পছন্দের অ্যাপটির নাম বলো! 📱',
];

export const KobutorSurpriseModal: React.FC<KobutorSurpriseModalProps> = ({
  isOpen,
  onClose,
  gameState,
  onUpdateGame,
  myRole,
  isDarkMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<SurpriseActivityType>('secret_question');
  const [secretInput, setSecretInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [tenSecCountdown, setTenSecCountdown] = useState<number | null>(null);
  const [laughCountdown, setLaughCountdown] = useState<number | null>(null);

  // Sync activeTab when peer triggers a surprise activity
  useEffect(() => {
    if (gameState?.surprise?.activity && gameState.surprise.activity !== activeTab) {
      setActiveTab(gameState.surprise.activity);
    }
  }, [gameState?.surprise?.activity]);

  // 10 Second Timer countdown sync
  useEffect(() => {
    if (activeTab === 'ten_sec' && gameState?.timeLeft && gameState.timeLeft > 0) {
      setTenSecCountdown(gameState.timeLeft);
      const timer = setInterval(() => {
        setTenSecCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            liquidAudio.playSynchronyChime();
            return 0;
          }
          liquidAudio.playSubtleBubble(250);
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else if (gameState?.timeLeft === 0) {
      setTenSecCountdown(0);
    }
  }, [activeTab, gameState?.timeLeft]);

  // Make each other laugh 30s timer
  useEffect(() => {
    if (activeTab === 'make_laugh' && gameState?.timeLeft && gameState.timeLeft > 0) {
      setLaughCountdown(gameState.timeLeft);
      const timer = setInterval(() => {
        setLaughCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            liquidAudio.playSynchronyChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeTab, gameState?.timeLeft]);

  if (!isOpen) return null;

  const partnerRole = myRole === 'A' ? 'B' : 'A';

  // Handler: Start a specific surprise activity
  const handleSelectActivity = (activity: SurpriseActivityType) => {
    setActiveTab(activity);
    liquidAudio.playRippleSound();

    if (activity === 'secret_question') {
      const randomQ = SECRET_QUESTIONS[Math.floor(Math.random() * SECRET_QUESTIONS.length)];
      onUpdateGame({
        type: 'secret_question',
        surprise: {
          activity: 'secret_question',
          title: 'Secret Question',
          titleBangla: 'গোপন প্রশ্ন',
          prompt: randomQ.english,
          promptBangla: randomQ.bangla,
          startedAt: Date.now(),
        },
        secretQuestion: {
          question: randomQ.english,
          questionBangla: randomQ.bangla,
          answers: {},
          revealed: false,
        },
      });
    } else if (activity === 'guess_answer') {
      const randomQ = GUESS_QUESTIONS[Math.floor(Math.random() * GUESS_QUESTIONS.length)];
      onUpdateGame({
        type: 'guess_their_answer',
        surprise: {
          activity: 'guess_answer',
          title: 'Guess Their Answer',
          titleBangla: 'ওর উত্তর অনুমান করো',
          prompt: randomQ.english,
          promptBangla: randomQ.bangla,
          startedAt: Date.now(),
        },
        guessAnswer: {
          targetRole: 'A',
          question: randomQ.english,
          questionBangla: randomQ.bangla,
          revealed: false,
          round: 1,
        },
      });
    } else if (activity === 'rapid_fire') {
      onUpdateGame({
        type: 'rapid_fire',
        surprise: {
          activity: 'rapid_fire',
          title: 'Rapid Fire',
          titleBangla: 'র‍্যাপিড ফায়ার',
          prompt: 'Fast 5 choices!',
          promptBangla: 'দ্রুত ৫টি নির্বাচন!',
          startedAt: Date.now(),
        },
        rapidFire: {
          currentRound: 0,
          totalRounds: RAPID_FIRE_QUESTIONS.length,
          answers: {},
          completed: false,
        },
      });
    } else if (activity === 'ten_sec') {
      const prompt = TEN_SEC_PROMPTS[Math.floor(Math.random() * TEN_SEC_PROMPTS.length)];
      onUpdateGame({
        type: 'five_second_challenge',
        surprise: {
          activity: 'ten_sec',
          title: '10 Second Challenge',
          titleBangla: '১০ সেকেন্ড চ্যালেঞ্জ',
          prompt,
          promptBangla: prompt,
          startedAt: Date.now(),
        },
        timeLeft: 10,
        prompt,
      });
    } else if (activity === 'make_laugh') {
      onUpdateGame({
        type: 'make_laugh',
        surprise: {
          activity: 'make_laugh',
          title: 'Make Each Other Laugh',
          titleBangla: 'হাসানোর চ্যালেঞ্জ',
          prompt: 'Try to make your partner laugh while talking! 30 seconds!',
          promptBangla: '৩০ সেকেন্ডে অন্যজনকে হাসাতে পারো কিনা দেখো!',
          startedAt: Date.now(),
        },
        timeLeft: 30,
      });
    } else if (activity === 'describe_badly') {
      onUpdateGame({
        type: 'describe_badly',
        surprise: {
          activity: 'describe_badly',
          title: 'Describe Yourself Badly',
          titleBangla: 'নিজেকে উল্টোভাবে বর্ণনা করো',
          prompt: 'Describe your personality using only 3 weird or funny traits!',
          promptBangla: 'নিজের সম্পর্কে ৩টি অদ্ভুত বা মজার বৈশিষ্ট্য বলো!',
          startedAt: Date.now(),
        },
      });
    } else if (activity === 'hum_tune') {
      onUpdateGame({
        type: 'hum_tune',
        surprise: {
          activity: 'hum_tune',
          title: 'Hum a Tune',
          titleBangla: 'সুর গুঞ্জরণ করো',
          prompt: 'Hum a song through the mic. Can your partner guess which song it is?',
          promptBangla: 'মাইকে একটা গানের সুর ভাঁজো, অন্যজন গানটি চিনতে পারে কিনা দেখো!',
          startedAt: Date.now(),
        },
      });
    }
  };

  // Secret Question submission
  const handleSubmitSecretAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretInput.trim()) return;

    liquidAudio.playSubtleBubble();
    const existing = gameState?.secretQuestion?.answers || {};
    const updated = { ...existing, [myRole]: secretInput.trim() };

    // Check if partner already answered
    const bothSubmitted = !!updated[partnerRole];

    onUpdateGame({
      secretQuestion: {
        ...(gameState?.secretQuestion || {
          question: '',
          questionBangla: '',
          revealed: false,
        }),
        answers: updated,
        revealed: bothSubmitted,
      },
    });

    if (bothSubmitted) {
      liquidAudio.playSynchronyChime();
    }
    setSecretInput('');
  };

  // Guess Their Answer submission
  const handleSelectGuessOption = (option: string, isTarget: boolean) => {
    liquidAudio.playRippleSound();
    const current = gameState?.guessAnswer;
    if (!current) return;

    if (isTarget) {
      const updated = { ...current, targetAnswer: option };
      if (updated.guesserGuess) {
        updated.revealed = true;
        liquidAudio.playSynchronyChime();
      }
      onUpdateGame({ guessAnswer: updated });
    } else {
      const updated = { ...current, guesserGuess: option };
      if (updated.targetAnswer) {
        updated.revealed = true;
        liquidAudio.playSynchronyChime();
      }
      onUpdateGame({ guessAnswer: updated });
    }
  };

  // Rapid Fire choice handler
  const handleRapidFireChoice = (roundIdx: number, choice: string) => {
    liquidAudio.playSubtleBubble();
    const rf = gameState?.rapidFire || {
      currentRound: 0,
      totalRounds: RAPID_FIRE_QUESTIONS.length,
      answers: {},
      completed: false,
    };

    const roundAnswers = rf.answers[roundIdx] || {};
    const updatedRound = { ...roundAnswers, [myRole]: choice };
    const allAnswers = { ...rf.answers, [roundIdx]: updatedRound };

    // If both answered this round, advance to next round
    const nextRound = updatedRound[partnerRole] ? roundIdx + 1 : roundIdx;
    const completed = nextRound >= RAPID_FIRE_QUESTIONS.length;

    onUpdateGame({
      rapidFire: {
        ...rf,
        currentRound: nextRound,
        answers: allAnswers,
        completed,
      },
    });

    if (completed) {
      liquidAudio.playSynchronyChime();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-sm rounded-[36px] p-6 border shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] flex flex-col justify-between max-h-[90vh] overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-[#090d16] border-slate-800 text-white'
            : 'bg-white border-slate-200/90 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/40 flex items-center justify-center text-sm shadow-xs">
              🕊️
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider font-english">
                Kobutor Surprise 🎁
              </h3>
              <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold font-bangla">
                তোমাদের জন্য বিশেষ মুহূর্ত
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Activity Quick Pills */}
        <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'secret_question', label: 'Secret Q', icon: HelpCircle },
            { id: 'guess_answer', label: 'Guess', icon: Target },
            { id: 'rapid_fire', label: 'Rapid Fire', icon: Flame },
            { id: 'ten_sec', label: '10s Timer', icon: Zap },
            { id: 'make_laugh', label: 'Laugh', icon: Laugh },
            { id: 'hum_tune', label: 'Hum Song', icon: Music },
            { id: 'describe_badly', label: 'Describe', icon: FileText },
          ].map((act) => {
            const Icon = act.icon;
            const isSelected = activeTab === act.id;
            return (
              <button
                key={act.id}
                onClick={() => handleSelectActivity(act.id as SurpriseActivityType)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0 transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-xs scale-105'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3 h-3 stroke-[2.2]" />
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Activity Content Screen */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-none flex flex-col justify-center">
          {/* 1. SECRET QUESTION */}
          {activeTab === 'secret_question' && (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="p-4 rounded-3xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-500/30 backdrop-blur-md">
                <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 font-english">
                  Question for Both
                </span>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-1.5 font-bangla leading-snug">
                  {gameState?.secretQuestion?.questionBangla || SECRET_QUESTIONS[0].bangla}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium italic mt-1 leading-tight">
                  {gameState?.secretQuestion?.question || SECRET_QUESTIONS[0].english}
                </p>
              </div>

              {/* Reveal Box or Input Box */}
              {gameState?.secretQuestion?.revealed ? (
                <div className="space-y-2.5 animate-fade-in">
                  <div className="p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/40 text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      You ({myRole})
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
                      "{gameState.secretQuestion.answers[myRole]}"
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/40 text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Companion ({partnerRole})
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
                      "{gameState.secretQuestion.answers[partnerRole]}"
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-black font-bangla">
                    <Sparkles className="w-4 h-4" />
                    <span>উভয়ের উত্তর প্রকাশ পেল! 🕊️</span>
                  </div>
                </div>
              ) : (
                <div>
                  {gameState?.secretQuestion?.answers?.[myRole] ? (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 mx-auto flex items-center justify-center mb-1.5 animate-pulse">
                        ⏳
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 font-bangla">
                        তোমার উত্তর সাবমিট হয়েছে!
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        অপেক্ষা করছি অন্যজনের সাবমিট করার জন্য...
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitSecretAnswer} className="space-y-2">
                      <input
                        type="text"
                        value={secretInput}
                        onChange={(e) => setSecretInput(e.target.value)}
                        placeholder="তোমার গোপন উত্তর লিখো..."
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden focus:border-cyan-500"
                      />
                      <button
                        type="submit"
                        disabled={!secretInput.trim()}
                        className="w-full py-3 rounded-2xl bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>গোপনে জমা দাও</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. GUESS THEIR ANSWER */}
          {activeTab === 'guess_answer' && (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="p-4 rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-500/30">
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 font-english">
                  Guess Challenge (Round {gameState?.guessAnswer?.round || 1})
                </span>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-1.5 font-bangla leading-snug">
                  {gameState?.guessAnswer?.questionBangla || GUESS_QUESTIONS[0].bangla}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium italic mt-1 leading-tight">
                  {gameState?.guessAnswer?.question || GUESS_QUESTIONS[0].english}
                </p>
              </div>

              {/* Status prompt */}
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 font-bangla">
                {gameState?.guessAnswer?.targetRole === myRole
                  ? '👉 তোমার নিজের আসল পছন্দটি সিলেক্ট করো:'
                  : '🎯 ওর পছন্দ কী হতে পারে? অনুমান করো:'}
              </p>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2">
                {GUESS_QUESTIONS[0].options.map((opt) => {
                  const isTarget = gameState?.guessAnswer?.targetRole === myRole;
                  const currentSelection = isTarget
                    ? gameState?.guessAnswer?.targetAnswer
                    : gameState?.guessAnswer?.guesserGuess;
                  const isSelected = currentSelection === opt;

                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectGuessOption(opt, isTarget)}
                      className={`p-3 rounded-2xl text-xs font-bold text-left transition-all border ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {gameState?.guessAnswer?.revealed && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 animate-fade-in">
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 font-bangla">
                    {gameState.guessAnswer.targetAnswer === gameState.guessAnswer.guesserGuess
                      ? '🎉 নিখুঁত অনুমান! দুজনের উত্তর হুবহু মিলেছে!'
                      : '😂 অনুমান মেলেনি, কিন্তু এটাই তো মজার অভিজ্ঞতা!'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 3. RAPID FIRE */}
          {activeTab === 'rapid_fire' && (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="p-4 rounded-3xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-500/30">
                <span className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 font-english">
                  Round {(gameState?.rapidFire?.currentRound || 0) + 1} of {RAPID_FIRE_QUESTIONS.length}
                </span>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-1 font-bangla">
                  দ্রুত বেছে নাও:
                </p>
              </div>

              {gameState?.rapidFire?.completed ? (
                <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 animate-fade-in">
                  <Sparkles className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                  <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white font-english">
                    Rapid Fire Complete! 🔥
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 font-bangla">
                    তোমাদের দ্রুত উত্তর দেওয়া সম্পন্ন হয়েছে! দারুণ বোঝাপড়া!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const currentRoundIdx = gameState?.rapidFire?.currentRound || 0;
                    const q = RAPID_FIRE_QUESTIONS[Math.min(currentRoundIdx, RAPID_FIRE_QUESTIONS.length - 1)];
                    const myChoice = gameState?.rapidFire?.answers?.[currentRoundIdx]?.[myRole];

                    return (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleRapidFireChoice(currentRoundIdx, q.opt1)}
                          className={`p-4 rounded-3xl text-xs font-extrabold border transition-all ${
                            myChoice === q.opt1
                              ? 'bg-rose-600 text-white border-rose-600 shadow-md scale-105'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white hover:border-rose-300'
                          }`}
                        >
                          {q.opt1}
                        </button>
                        <button
                          onClick={() => handleRapidFireChoice(currentRoundIdx, q.opt2)}
                          className={`p-4 rounded-3xl text-xs font-extrabold border transition-all ${
                            myChoice === q.opt2
                              ? 'bg-rose-600 text-white border-rose-600 shadow-md scale-105'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white hover:border-rose-300'
                          }`}
                        >
                          {q.opt2}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* 4. 10 SECOND CHALLENGE */}
          {activeTab === 'ten_sec' && (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="p-4 rounded-3xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-500/30">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-english">
                  ⚡ 10 Second Audio Challenge
                </span>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-1.5 font-bangla leading-snug">
                  {gameState?.prompt || TEN_SEC_PROMPTS[0]}
                </p>
              </div>

              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-200 dark:border-cyan-800 animate-pulse" />
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {tenSecCountdown !== null ? tenSecCountdown : 10}s
                </span>
              </div>

              <p className="text-xs text-slate-500 font-medium font-bangla">
                মাইকে কথা বলো! সময় শেষ হওয়ার আগে উত্তর শেষ করো!
              </p>
            </div>
          )}

          {/* 5. MAKE EACH OTHER LAUGH */}
          {activeTab === 'make_laugh' && (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="p-4 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-500/30">
                <Laugh className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-english">
                  Laughing Challenge 😂
                </h4>
                <p className="text-xs font-bold text-slate-800 dark:text-white mt-1.5 font-bangla leading-snug">
                  কথা বলার মাধ্যমে অন্যজনকে হাসানোর চেষ্টা করো!
                </p>
              </div>

              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {laughCountdown !== null ? `${laughCountdown}s` : '30s'}
              </div>

              <p className="text-xs text-slate-500 font-medium font-bangla">
                যে আগে হাসবে সে পয়েন্ট হারাবে!
              </p>
            </div>
          )}

          {/* 6. HUM A TUNE */}
          {activeTab === 'hum_tune' && (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="p-5 rounded-3xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-500/30">
                <Music className="w-10 h-10 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 font-english">
                  Hum a Tune 🎵
                </h4>
                <p className="text-xs font-bold text-slate-800 dark:text-white mt-1.5 font-bangla leading-snug">
                  মাইকে যেকোনো একটি জনপ্রিয় গানের সুর গুঞ্জরণ করো!
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-snug">
                  অন্যজন অনুমান করে বলবে গানটির নাম কী!
                </p>
              </div>
            </div>
          )}

          {/* 7. DESCRIBE YOURSELF BADLY */}
          {activeTab === 'describe_badly' && (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="p-5 rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-500/30">
                <span className="text-2xl">🎭</span>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 font-english mt-2">
                  Describe Yourself Badly
                </h4>
                <p className="text-xs font-bold text-slate-800 dark:text-white mt-1.5 font-bangla leading-snug">
                  নিজেকে এমনভাবে বর্ণনা করো যেন কেউ বিশ্বাসই করতে না পারে!
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-snug">
                  ৩টি চরম মজার বা অদ্ভুত অভ্যাস মুখে বলো!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-medium">
            উভয় ফোনে রিয়েলটাইমে সিঙ্ক করা হচ্ছে
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold font-bangla transition-all active:scale-95"
          >
            বন্ধ করো
          </button>
        </div>
      </div>
    </div>
  );
};
