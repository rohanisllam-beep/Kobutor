import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Clock, X, Trophy, RefreshCw } from 'lucide-react';
import { KobutorQuest } from '../types';
import { liquidAudio } from '../lib/audioSynth';
import { featherSystem } from '../lib/featherSystem';

export interface KobutorQuestOverlayProps {
  quest: KobutorQuest | null;
  myRole: 'A' | 'B';
  onUpdateQuest: (quest: KobutorQuest) => void;
  onDismiss: () => void;
  isDarkMode?: boolean;
}

export const QUEST_POOL = [
  {
    title: 'Laugh Together',
    titleBangla: 'একসাথে হাসার স্মৃতি 😂',
    desc: 'উভয়ে জীবনের একটা অদ্ভুত মজার বা অপ্রস্তুত মুহূর্ত সংক্ষেপে শেয়ার করো!',
    descEnglish: 'Share one funny or slightly awkward moment of your life with each other!',
    timerSeconds: 60,
    rewardFeathers: 15,
    rewardXp: 50,
  },
  {
    title: 'Hum a Familiar Tune',
    titleBangla: 'একসাথে সুর মেলানো 🎵',
    desc: 'যেকোনো একটি জনপ্রিয় বাংলা বা প্রিয় গানের সুর ১০ সেকেন্ড মাইকে গুণগুণ করো!',
    descEnglish: 'Hum a familiar song tune for 10 seconds through the microphone!',
    timerSeconds: 30,
    rewardFeathers: 15,
    rewardXp: 50,
  },
  {
    title: 'Rapid Foodie',
    titleBangla: 'প্রিয় খাবারের ঝড় 🍲',
    desc: '১০ সেকেন্ডে দুজনই যার যার ৩টি প্রিয় খাবারের নাম দ্রুত বলে ফেলো!',
    descEnglish: 'Both quickly name 3 favorite street foods or dishes in 10 seconds!',
    timerSeconds: 15,
    rewardFeathers: 15,
    rewardXp: 50,
  },
  {
    title: 'Synchronized Calm',
    titleBangla: 'নীরব গভীর নিঃশ্বাস 🕊️',
    desc: 'উভয়ে ২০ সেকেন্ড চোখ বন্ধ করে গভীর নিঃশ্বাস নিয়ে একে অপরের শান্ত উপস্থিতি অনুভব করো।',
    descEnglish: 'Close your eyes for 20 seconds, take 3 deep breaths and feel the serene presence.',
    timerSeconds: 20,
    rewardFeathers: 15,
    rewardXp: 50,
  },
  {
    title: 'Heartfelt Compliment',
    titleBangla: 'আন্তরিক প্রশংসা 💖',
    desc: 'অন্যজনের কণ্ঠ, কথা বলা বা চিন্তাভাবনার সুন্দর একটি দিকের মন খুলে প্রশংসা করো।',
    descEnglish: 'Give your companion an honest, heartwarming compliment about their voice or vibe.',
    timerSeconds: 45,
    rewardFeathers: 15,
    rewardXp: 50,
  },
];

export const KobutorQuestOverlay: React.FC<KobutorQuestOverlayProps> = ({
  quest,
  myRole,
  onUpdateQuest,
  onDismiss,
  isDarkMode = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const partnerRole = myRole === 'A' ? 'B' : 'A';

  // Timer countdown
  useEffect(() => {
    if (!quest || quest.status !== 'active' || !quest.timerSeconds) {
      setTimeLeft(null);
      return;
    }

    const elapsed = Math.floor((Date.now() - quest.startedAt) / 1000);
    const remaining = Math.max(0, quest.timerSeconds - elapsed);
    setTimeLeft(remaining);

    if (remaining <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quest?.id, quest?.startedAt, quest?.timerSeconds, quest?.status]);

  if (!quest || quest.status === 'dismissed') return null;

  const myDone = !!quest.completedBy?.[myRole];
  const partnerDone = !!quest.completedBy?.[partnerRole];
  const isAllCompleted = quest.status === 'completed' || (myDone && partnerDone);

  const handleToggleMyDone = () => {
    liquidAudio.playSubtleBubble(300);
    const newCompletedBy = {
      ...(quest.completedBy || {}),
      [myRole]: !myDone,
    };

    const willBeCompleted = newCompletedBy[myRole] && newCompletedBy[partnerRole];

    const updatedQuest: KobutorQuest = {
      ...quest,
      completedBy: newCompletedBy,
      status: willBeCompleted ? 'completed' : 'active',
    };

    onUpdateQuest(updatedQuest);

    if (willBeCompleted) {
      liquidAudio.playSynchronyChime();
      featherSystem.rewardQuestCompleted(quest.titleBangla, quest.titleBangla);
    }
  };

  const handleNewRandomQuest = () => {
    liquidAudio.playSubtleBubble(260);
    const available = QUEST_POOL.filter((q) => q.titleBangla !== quest.titleBangla);
    const nextItem = available[Math.floor(Math.random() * available.length)] || QUEST_POOL[0];
    const newQuest: KobutorQuest = {
      id: `quest-${Date.now()}`,
      titleBangla: nextItem.titleBangla,
      titleEnglish: nextItem.title,
      descBangla: nextItem.desc,
      descEnglish: nextItem.descEnglish,
      rewardFeathers: nextItem.rewardFeathers,
      rewardXp: nextItem.rewardXp,
      status: 'active',
      completedBy: {},
      timerSeconds: nextItem.timerSeconds,
      startedAt: Date.now(),
    };
    onUpdateQuest(newQuest);
    setIsExpanded(true);
  };

  // Compact Pill when minimized
  if (!isExpanded) {
    return (
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 animate-fade-in pointer-events-auto">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-bold shadow-lg backdrop-blur-md border border-cyan-400/40 transition-all active:scale-95"
        >
          <span className="text-sm">🎯</span>
          <span className="font-bangla font-semibold text-[11px]">{quest.titleBangla}</span>
          {isAllCompleted ? (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-[9px] font-black text-white uppercase">
              Done ✓
            </span>
          ) : timeLeft !== null ? (
            <span className="text-cyan-300 font-mono text-[10px] font-black">{timeLeft}s</span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-sm pointer-events-auto animate-fade-in">
      <div
        className={`p-4 rounded-3xl border shadow-[0_20px_40px_-10px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-all ${
          isAllCompleted
            ? 'bg-emerald-950/90 text-white border-emerald-500/50'
            : isDarkMode
            ? 'bg-slate-900/95 text-white border-cyan-500/40'
            : 'bg-white/95 text-slate-900 border-cyan-200/90'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm shadow-xs">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-500 font-english">
                  Kobutor Shared Quest
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-500 font-black text-[9px]">
                  +{quest.rewardFeathers} 🪶 +{quest.rewardXp} XP
                </span>
              </div>
              <h4 className="text-xs font-bold font-bangla">{quest.titleBangla}</h4>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-full hover:bg-slate-500/10 text-slate-400 hover:text-slate-600 transition-colors"
              title="Minimize"
            >
              <span className="text-xs font-bold">−</span>
            </button>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-full hover:bg-slate-500/10 text-slate-400 hover:text-slate-600 transition-colors"
              title="Close Quest"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mission Details */}
        <div className="py-2.5">
          <p className="text-xs font-medium font-bangla leading-relaxed">
            {quest.descBangla}
          </p>
          {quest.descEnglish && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5">
              {quest.descEnglish}
            </p>
          )}
        </div>

        {/* Status & Checkboxes */}
        {isAllCompleted ? (
          <div className="py-2 text-center space-y-2 animate-fade-in">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs font-bangla">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>মিশন সফল! উভয়ে পুরস্কৃত হয়েছেন 🕊️✨</span>
            </div>
            <button
              onClick={handleNewRandomQuest}
              className="px-4 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 mx-auto transition-all active:scale-95 shadow-md shadow-cyan-600/30"
            >
              <RefreshCw className="w-3 h-3" />
              <span>নতুন কোয়েস্ট নিন</span>
            </button>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/60 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              {/* Partner Progress */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    partnerDone
                      ? 'bg-emerald-500 text-white font-bold'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  }`}
                >
                  {partnerDone ? '✓' : '•'}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-bangla">
                  সঙ্গী: {partnerDone ? 'সম্পন্ন করেছে' : 'চেষ্টা করছে...'}
                </span>
              </div>

              {/* Timer */}
              {timeLeft !== null && (
                <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timeLeft}s</span>
                </div>
              )}
            </div>

            {/* My Action Button */}
            <button
              onClick={handleToggleMyDone}
              className={`w-full py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                myDone
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-900 dark:bg-cyan-500 dark:text-slate-950 text-white shadow-md'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-bangla">
                {myDone ? 'আমার সম্পন্ন হয়েছে ✓ (ক্লিক করলে বাতিল)' : 'আমি সম্পন্ন করেছি'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
