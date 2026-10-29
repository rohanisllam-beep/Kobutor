import React, { useState } from 'react';
import { ArrowLeft, Gamepad2, HelpCircle, Edit3, MessageSquareText, Timer, Flame, Sparkles, Check } from 'lucide-react';
import { liquidAudio } from '../lib/audioSynth';
import { MiniGameType } from '../types';

interface PlayViewProps {
  onBack: () => void;
  onStartMatch: (gameType?: MiniGameType) => void;
  onOpenConnectedGame?: (gameType: MiniGameType) => void;
  isConnected?: boolean;
  isDarkMode?: boolean;
}

export const PlayView: React.FC<PlayViewProps> = ({
  onBack,
  onStartMatch,
  onOpenConnectedGame,
  isConnected = false,
  isDarkMode = false,
}) => {
  const [selectedGameId, setSelectedGameId] = useState<MiniGameType>('rapid_fire');

  const games: {
    id: MiniGameType;
    title: string;
    titleBangla: string;
    desc: string;
    icon: any;
    cardBg: string;
    iconColor: string;
    badge?: string;
  }[] = [
    {
      id: 'rapid_fire',
      title: 'Rapid Fire 🔥',
      titleBangla: 'র‍্যাপিড ফায়ার ৫টি প্রশ্ন',
      desc: 'Quick choices (Tea vs Coffee, Beach vs Mountain). Compare instant wavelength!',
      icon: Flame,
      cardBg: 'bg-rose-50/80 border-rose-200/80 text-rose-950',
      iconColor: 'text-rose-600',
      badge: 'Popular',
    },
    {
      id: 'would_you_rather',
      title: 'Would You Rather 🤔',
      titleBangla: 'তুমি কোনটা বেছে নিতে?',
      desc: 'Discover complementary values, travel dreams and unexpected philosophy.',
      icon: HelpCircle,
      cardBg: 'bg-sky-50/80 border-sky-200/80 text-sky-950',
      iconColor: 'text-sky-600',
    },
    {
      id: 'quick_quiz',
      title: 'Quick Quiz ✨',
      titleBangla: 'আবেগ ও রুচির কুইজ',
      desc: 'What is your late night vibe? Instant simultaneous reveal of choices.',
      icon: Sparkles,
      cardBg: 'bg-purple-50/80 border-purple-200/80 text-purple-950',
      iconColor: 'text-purple-600',
    },
    {
      id: 'five_second_challenge',
      title: '10s Audio Challenge ⚡',
      titleBangla: '১০ সেকেন্ডের অডিও চ্যালেঞ্জ',
      desc: 'Voice sprint! 3 songs, 3 dishes or 3 dream cities before the bell rings.',
      icon: Timer,
      cardBg: 'bg-cyan-50/80 border-cyan-200/80 text-cyan-950',
      iconColor: 'text-cyan-600',
    },
    {
      id: 'one_word_story',
      title: 'One Word Story ✍️',
      titleBangla: 'এক শব্দের গল্প',
      desc: 'Weave an impromptu collaborative fantasy one word at a time together.',
      icon: MessageSquareText,
      cardBg: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'draw_and_guess',
      title: 'Draw & Guess 🎨',
      titleBangla: 'আঁকো এবং অনুমান করো',
      desc: 'Real-time collaborative water sketch pad with instant live guessing.',
      icon: Edit3,
      cardBg: 'bg-amber-50/80 border-amber-200/80 text-amber-950',
      iconColor: 'text-amber-600',
    },
  ];

  const handleCardClick = (gameId: MiniGameType) => {
    liquidAudio.playSubtleBubble(260);
    setSelectedGameId(gameId);

    // If already connected to someone in a live session, open the game right away!
    if (isConnected && onOpenConnectedGame) {
      onOpenConnectedGame(gameId);
    }
  };

  const handleStartPlayAction = () => {
    liquidAudio.playRippleSound();
    if (isConnected && onOpenConnectedGame) {
      onOpenConnectedGame(selectedGameId);
    } else {
      onStartMatch(selectedGameId);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between px-5 py-6 overflow-y-auto scrollbar-none select-none bg-gradient-to-b from-[#f0f9ff] via-[#ffffff] to-[#f5f3ff] text-slate-800">
      <div>
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center border transition-all bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h2 className="text-xs font-black tracking-widest uppercase text-slate-900 font-english">
              Realtime 2-Player Games
            </h2>
            <p className="text-[10px] text-cyan-600 font-bold font-bangla">লাইভ ২ জনের খেলার আয়োজন</p>
          </div>
          <div className="w-8" />
        </div>

        <div className="mt-3 text-center">
          <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
            {isConnected
              ? 'সঙ্গীর সাথে খেলতে যেকোনো খেলা নির্বাচন করুন!'
              : 'যেকোনো খেলা সিলেক্ট করে সঙ্গীর সন্ধান শুরু করুন।'}
          </p>
        </div>

        {/* Interactive Game Cards List */}
        <div className="mt-4 space-y-2.5 max-w-sm mx-auto">
          {games.map((g) => {
            const Icon = g.icon;
            const isSelected = selectedGameId === g.id;
            return (
              <button
                key={g.id}
                onClick={() => handleCardClick(g.id)}
                className={`w-full p-3.5 rounded-3xl border ${g.cardBg} backdrop-blur-md shadow-xs flex items-start gap-3 transition-all text-left active:scale-[0.98] ${
                  isSelected ? 'ring-2 ring-slate-900 dark:ring-cyan-400 shadow-md scale-[1.01]' : 'hover:opacity-95'
                }`}
              >
                <div className="p-2.5 rounded-2xl bg-white shadow-xs shrink-0 flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${g.iconColor} stroke-[2.2]`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider font-english">{g.title}</h4>
                    {g.badge && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase">
                        {g.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 font-bangla mt-0.5">
                    {g.titleBangla}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">
                    {g.desc}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-1">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-4 max-w-xs mx-auto w-full pb-1">
        <button
          onClick={handleStartPlayAction}
          className="w-full py-4 px-6 rounded-3xl font-extrabold text-xs tracking-[0.14em] uppercase flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 bg-slate-900 text-white shadow-[0_16px_32px_-10px_rgba(15,23,42,0.3)] hover:bg-slate-800"
        >
          <Gamepad2 className="w-4 h-4 stroke-[2.2]" />
          <span>
            {isConnected ? 'এখনই খেলা শুরু করো' : 'Find Companion to Play'}
          </span>
        </button>
      </div>
    </div>
  );
};


