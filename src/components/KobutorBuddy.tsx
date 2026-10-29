import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Gift, HelpCircle, Target, Zap, MessageCircle, X } from 'lucide-react';
import { liquidAudio } from '../lib/audioSynth';

export interface BuddyThought {
  textBangla: string;
  textEnglish: string;
  mood: 'curious' | 'playful' | 'teasing' | 'excited' | 'celebrate' | 'whisper';
  timestamp: number;
}

interface KobutorBuddyProps {
  phase: 'approaching' | 'circling' | 'settled';
  localVolume: number;
  remoteVolume: number;
  silenceDurationSec: number;
  reactionsCount: number;
  lastReaction?: string;
  isJustStay: boolean;
  onTriggerSurprise: () => void;
  onTriggerSecretQuestion: () => void;
  onTriggerGuessAnswer: () => void;
  onTriggerRapidFire: () => void;
  onTriggerQuestion: () => void;
  onTriggerQuest?: () => void;
  isDarkMode?: boolean;
}

export const KobutorBuddy: React.FC<KobutorBuddyProps> = ({
  phase,
  localVolume,
  remoteVolume,
  silenceDurationSec,
  reactionsCount,
  lastReaction,
  isJustStay,
  onTriggerSurprise,
  onTriggerSecretQuestion,
  onTriggerGuessAnswer,
  onTriggerRapidFire,
  onTriggerQuestion,
  onTriggerQuest,
  isDarkMode = false,
}) => {
  const [currentThought, setCurrentThought] = useState<BuddyThought | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [isFlapping, setIsFlapping] = useState<boolean>(false);
  const lastThoughtTimeRef = useRef<number>(Date.now());
  const seenMilestonesRef = useRef<Set<string>>(new Set());

  // Natural eye blinking timer
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 220);
    }, 4200 + Math.random() * 2500);
    return () => clearInterval(blinkInterval);
  }, []);

  // Display initial thought when connected
  useEffect(() => {
    if (phase === 'settled' && !seenMilestonesRef.current.has('intro')) {
      seenMilestonesRef.current.add('intro');
      setTimeout(() => {
        setBuddyThought(
          'আচ্ছা দেখি আজকের Kobutor কেমন হয় 🕊️',
          'Let’s see how today’s Kobutor vibe goes!',
          'curious'
        );
        setIsFlapping(true);
        setTimeout(() => setIsFlapping(false), 1200);
      }, 1800);
    }
  }, [phase]);

  // Silence Breaker Thought: trigger if silence > 14 seconds
  useEffect(() => {
    if (
      phase === 'settled' &&
      !isJustStay &&
      silenceDurationSec >= 14 &&
      Date.now() - lastThoughtTimeRef.current > 20000
    ) {
      setBuddyThought(
        'চুপচাপ কেন? একটা question করি? 👀',
        'Why so quiet? Shall I ask a fun question?',
        'playful'
      );
    }
  }, [silenceDurationSec, phase, isJustStay]);

  // Reaction banter: trigger when multiple reactions exchanged
  useEffect(() => {
    if (reactionsCount >= 3 && !seenMilestonesRef.current.has('reactions_3')) {
      seenMilestonesRef.current.add('reactions_3');
      setBuddyThought(
        'ওহ! আজকে তো vibe জমে গেছে 😂',
        'Oho! The chemistry is definitely clicking!',
        'excited'
      );
      setIsFlapping(true);
      setTimeout(() => setIsFlapping(false), 1000);
    } else if (reactionsCount >= 8 && !seenMilestonesRef.current.has('reactions_8')) {
      seenMilestonesRef.current.add('reactions_8');
      setBuddyThought(
        'আজকের Kobutor Moment unlocked 🕊️✨',
        'Today’s Kobutor Moment unlocked!',
        'celebrate'
      );
      liquidAudio.playSynchronyChime();
    }
  }, [reactionsCount]);

  const setBuddyThought = (
    textBangla: string,
    textEnglish: string,
    mood: BuddyThought['mood']
  ) => {
    lastThoughtTimeRef.current = Date.now();
    setCurrentThought({
      textBangla,
      textEnglish,
      mood,
      timestamp: Date.now(),
    });

    // Auto-dismiss bubble after 7 seconds
    setTimeout(() => {
      setCurrentThought((prev) => (prev?.textBangla === textBangla ? null : prev));
    }, 7000);
  };

  const handleBuddyClick = () => {
    liquidAudio.playSubtleBubble(350);
    setIsFlapping(true);
    setTimeout(() => setIsFlapping(false), 800);
    setIsMenuOpen(!isMenuOpen);
  };

  // If in pure silent Just Stay mode, keep Buddy sleeping gently
  if (isJustStay) {
    return (
      <div className="absolute top-18 right-5 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 border border-cyan-100 backdrop-blur-md shadow-xs opacity-70">
        <span className="text-xs">🕊️💤</span>
        <span className="text-[10px] font-semibold text-slate-500 font-bangla">বাডি ঘুমাচ্ছে</span>
      </div>
    );
  }

  return (
    <div className="absolute top-18 right-4 z-40 flex flex-col items-end">
      {/* Speech Bubble from Buddy */}
      {currentThought && (
        <div
          onClick={() => setCurrentThought(null)}
          className="relative max-w-[210px] mb-2 px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-cyan-300 dark:border-cyan-500/40 shadow-lg backdrop-blur-md cursor-pointer animate-fade-in transition-all hover:scale-105"
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[11px] font-black text-cyan-800 dark:text-cyan-300 font-bangla leading-snug">
              {currentThought.textBangla}
            </span>
            <span className="text-[10px] text-cyan-500 shrink-0">✨</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium italic mt-0.5 leading-tight">
            {currentThought.textEnglish}
          </p>

          {/* Little speech arrow pointing to Buddy */}
          <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-white dark:bg-slate-900 border-r border-b border-cyan-300 dark:border-cyan-500/40 rotate-45" />
        </div>
      )}

      {/* Floating Animated Liquid Pigeon Buddy Avatar */}
      <button
        onClick={handleBuddyClick}
        title="Kobutor Buddy 🕊️"
        className="relative group p-1 rounded-full focus:outline-hidden transition-all active:scale-95"
      >
        {/* Ambient Halo Glow */}
        <div
          className={`absolute -inset-1 rounded-full blur-md transition-all duration-700 ${
            localVolume > 0.1 || remoteVolume > 0.1
              ? 'bg-cyan-400/50 scale-110'
              : 'bg-cyan-300/25 scale-100 group-hover:scale-105'
          }`}
        />

        {/* Liquid Pigeon Buddy Body */}
        <div
          className={`relative w-12 h-12 rounded-full border shadow-md flex items-center justify-center backdrop-blur-xl transition-all ${
            isDarkMode
              ? 'bg-slate-900/90 border-cyan-400/40 text-cyan-200'
              : 'bg-white/95 border-cyan-200 text-cyan-800'
          } ${isFlapping ? 'animate-bounce' : 'animate-pulse'}`}
        >
          {/* Custom SVG Mini Pigeon with Expressive Liquid Shimmer */}
          <svg viewBox="0 0 40 40" className="w-8 h-8">
            <defs>
              <linearGradient id="buddyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="60%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#f472b6" />
              </linearGradient>
              <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>

            {/* Wing (Animated flap) */}
            <path
              d={
                isFlapping
                  ? 'M 14 18 C 8 8, 4 14, 11 25 C 16 23, 18 20, 14 18 Z'
                  : 'M 13 20 C 7 15, 6 22, 12 26 C 16 25, 17 22, 13 20 Z'
              }
              fill="url(#wingGrad)"
              opacity="0.9"
              className="transition-all duration-200"
            />

            {/* Dove Body */}
            <path
              d="M 16 12 C 22 8, 28 11, 29 16 C 30 21, 26 28, 20 28 C 14 28, 12 22, 14 17 Z"
              fill="url(#buddyGrad)"
              opacity="0.85"
            />

            {/* Dove Head & Crown */}
            <circle cx="26" cy="14" r="5.5" fill="url(#buddyGrad)" />
            <circle cx="28" cy="10" r="1.5" fill="#38bdf8" />

            {/* Cute Eye (Blinks dynamically) */}
            {isBlinking ? (
              <line x1="26" y1="14" x2="29" y2="14" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <circle cx="28" cy="13.5" r="1.3" fill="#0f172a" />
            )}

            {/* Pearl Beak */}
            <polygon points="31,14 35,15.5 31,17" fill="#fbbf24" />

            {/* Pearl Chest Highlight */}
            <ellipse cx="21" cy="21" rx="3.5" ry="4.5" fill="#ffffff" opacity="0.65" />
          </svg>

          {/* Mini Status Notification Dot */}
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-cyan-500 border-2 border-white shadow-xs" />
        </div>
      </button>

      {/* Interactive Buddy Action Sheet */}
      {isMenuOpen && (
        <div className="mt-2 w-56 p-3 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-cyan-200 dark:border-cyan-500/40 shadow-xl backdrop-blur-xl animate-fade-in text-slate-800 dark:text-white">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🕊️</span>
              <span className="text-[11px] font-black uppercase tracking-wider font-bangla text-cyan-800 dark:text-cyan-300">
                কবুতর বাডি
              </span>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2 space-y-1.5">
            {/* 1. Surprise Trigger */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                liquidAudio.playRippleSound();
                onTriggerSurprise();
              }}
              className="w-full px-2.5 py-2 rounded-2xl bg-cyan-50/80 hover:bg-cyan-100/90 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50 text-cyan-900 dark:text-cyan-200 flex items-center gap-2 text-left transition-all active:scale-95"
            >
              <div className="p-1 rounded-xl bg-white dark:bg-slate-800 text-cyan-600 shadow-xs">
                <Gift className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate font-bangla">Kobutor Surprise 🎁</p>
                <p className="text-[9px] text-cyan-600/80 dark:text-cyan-400/80 truncate">একটি সারপ্রাইজ এক্টিভিটি</p>
              </div>
            </button>

            {/* 2. Secret Question */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                liquidAudio.playSubtleBubble();
                onTriggerSecretQuestion();
              }}
              className="w-full px-2.5 py-2 rounded-2xl bg-purple-50/80 hover:bg-purple-100/90 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-900 dark:text-purple-200 flex items-center gap-2 text-left transition-all active:scale-95"
            >
              <div className="p-1 rounded-xl bg-white dark:bg-slate-800 text-purple-600 shadow-xs">
                <HelpCircle className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate font-bangla">Secret Question 🤔</p>
                <p className="text-[9px] text-purple-600/80 dark:text-purple-400/80 truncate">গোপন উত্তর, একসাথে প্রকাশ</p>
              </div>
            </button>

            {/* 3. Guess Their Answer */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                liquidAudio.playSubtleBubble();
                onTriggerGuessAnswer();
              }}
              className="w-full px-2.5 py-2 rounded-2xl bg-amber-50/80 hover:bg-amber-100/90 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 flex items-center gap-2 text-left transition-all active:scale-95"
            >
              <div className="p-1 rounded-xl bg-white dark:bg-slate-800 text-amber-600 shadow-xs">
                <Target className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate font-bangla">Guess Their Answer 🎯</p>
                <p className="text-[9px] text-amber-600/80 dark:text-amber-400/80 truncate">ওর উত্তর অনুমান করো</p>
              </div>
            </button>

            {/* 4. Rapid Fire */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                liquidAudio.playSubtleBubble();
                onTriggerRapidFire();
              }}
              className="w-full px-2.5 py-2 rounded-2xl bg-rose-50/80 hover:bg-rose-100/90 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-900 dark:text-rose-200 flex items-center gap-2 text-left transition-all active:scale-95"
            >
              <div className="p-1 rounded-xl bg-white dark:bg-slate-800 text-rose-600 shadow-xs">
                <Zap className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate font-bangla">Rapid Fire ⚡</p>
                <p className="text-[9px] text-rose-600/80 dark:text-rose-400/80 truncate">দ্রুত ৫টি প্রশ্নের উত্তর</p>
              </div>
            </button>

            {/* 5. Kobutor Quest */}
            {onTriggerQuest && (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  liquidAudio.playRippleSound();
                  onTriggerQuest();
                }}
                className="w-full px-2.5 py-2 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 flex items-center gap-2 text-left transition-all active:scale-95"
              >
                <div className="p-1 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate font-bangla">Kobutor Quest 🎯</p>
                  <p className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 truncate">উভয়ের যৌথ মিশন</p>
                </div>
              </button>
            )}

            {/* 5. Silence Breaker Prompt */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                liquidAudio.playSubtleBubble();
                onTriggerQuestion();
              }}
              className="w-full px-2.5 py-2 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 flex items-center gap-2 text-left transition-all active:scale-95"
            >
              <div className="p-1 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 shadow-xs">
                <MessageCircle className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate font-bangla">একটা প্রশ্ন বলো 💬</p>
                <p className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 truncate">কথা শুরু করার বিষয়</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
