import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trophy, Gamepad2, Flame, Feather, ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { liquidAudio } from '../lib/audioSynth';
import { featherSystem } from '../lib/featherSystem';
import { getOrGenerateMyPigeonIdentity, derivePigeonTrait, PigeonTrait, drawRecognizablePigeon } from '../lib/pigeonIdentity';

export type BoardCategory = 'stars' | 'games' | 'feathers' | 'today';

interface BoardEntry {
  rank: number;
  anonymousId: string;
  trait: PigeonTrait;
  metricLabel: string;
  metricValue: string | number;
  streakDays?: number;
  highlight?: boolean;
}

interface KobutorBoardViewProps {
  onBack: () => void;
  onStartMatch?: () => void;
  isDarkMode?: boolean;
}

// Deterministic seed generation for anonymous pigeons
function generateAnonymousBoard(category: BoardCategory, myIdentity: PigeonTrait): BoardEntry[] {
  const entries: BoardEntry[] = [];

  const baseSeeds = [
    { id: '🕊️ #A7F2', score: category === 'stars' ? '48m talk' : category === 'games' ? '28 wins' : category === 'feathers' ? '460 🪶' : '9 matches' },
    { id: '🕊️ #B39E', score: category === 'stars' ? '42m talk' : category === 'games' ? '24 wins' : category === 'feathers' ? '395 🪶' : '8 matches' },
    { id: '🕊️ #E81C', score: category === 'stars' ? '37m talk' : category === 'games' ? '21 wins' : category === 'feathers' ? '340 🪶' : '7 matches' },
    { id: '🕊️ #C90D', score: category === 'stars' ? '31m talk' : category === 'games' ? '19 wins' : category === 'feathers' ? '310 🪶' : '6 matches' },
    { id: '🕊️ #F42A', score: category === 'stars' ? '29m talk' : category === 'games' ? '17 wins' : category === 'feathers' ? '285 🪶' : '6 matches' },
    { id: '🕊️ #D18F', score: category === 'stars' ? '26m talk' : category === 'games' ? '15 wins' : category === 'feathers' ? '250 🪶' : '5 matches' },
    { id: '🕊️ #9A3B', score: category === 'stars' ? '24m talk' : category === 'games' ? '14 wins' : category === 'feathers' ? '230 🪶' : '5 matches' },
    { id: '🕊️ #7E5C', score: category === 'stars' ? '21m talk' : category === 'games' ? '12 wins' : category === 'feathers' ? '210 🪶' : '4 matches' },
  ];

  baseSeeds.forEach((s, idx) => {
    const trait = derivePigeonTrait(s.id);
    entries.push({
      rank: idx + 1,
      anonymousId: s.id,
      trait,
      metricLabel: category === 'stars' ? 'গল্পের সময়' : category === 'games' ? 'চ্যালেঞ্জ জয়' : category === 'feathers' ? 'পালক ব্যালেন্স' : 'আজকের আলাপ',
      metricValue: s.score,
    });
  });

  return entries;
}

export const KobutorBoardView: React.FC<KobutorBoardViewProps> = ({
  onBack,
  onStartMatch,
}) => {
  const [activeCategory, setActiveCategory] = useState<BoardCategory>('stars');
  const [myIdentity, setMyIdentity] = useState<PigeonTrait>(getOrGenerateMyPigeonIdentity());
  const [myFeatherBalance, setMyFeatherBalance] = useState<number>(featherSystem.getState().balance);
  const [entries, setEntries] = useState<BoardEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const ident = getOrGenerateMyPigeonIdentity();
    setMyIdentity(ident);
    setEntries(generateAnonymousBoard(activeCategory, ident));

    return featherSystem.subscribe((st) => {
      setMyFeatherBalance(st.balance);
    });
  }, [activeCategory]);

  const handleRefresh = () => {
    liquidAudio.playSubtleBubble(380);
    setIsRefreshing(true);
    setTimeout(() => {
      setEntries(generateAnonymousBoard(activeCategory, myIdentity));
      setIsRefreshing(false);
      liquidAudio.playSynchronyChime();
    }, 450);
  };

  const categories: { id: BoardCategory; labelBangla: string; labelEnglish: string; icon: React.ReactNode }[] = [
    { id: 'stars', labelBangla: '🌟 কবুতর স্টারস', labelEnglish: 'Kobutor Stars', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'games', labelBangla: '🎮 গেম মাস্টার্স', labelEnglish: 'Game Masters', icon: <Gamepad2 className="w-3.5 h-3.5" /> },
    { id: 'feathers', labelBangla: '🪶 পালক সংগ্রাহক', labelEnglish: 'Feather Collectors', icon: <Feather className="w-3.5 h-3.5" /> },
    { id: 'today', labelBangla: '🔥 আজকের কবুতর', labelEnglish: "Today's Kobutor", icon: <Flame className="w-3.5 h-3.5" /> },
  ];

  // User's own approximate rank
  const myRank = activeCategory === 'feathers' ? Math.max(1, Math.min(12, 15 - Math.floor(myFeatherBalance / 35))) : 4;
  const myMetric = activeCategory === 'feathers' ? `${myFeatherBalance} 🪶` : activeCategory === 'stars' ? '25m talk' : activeCategory === 'games' ? '8 wins' : '3 matches';

  return (
    <div className="relative min-h-screen pb-28 pt-4 px-4 sm:px-6 flex flex-col items-center bg-gradient-to-b from-slate-50 via-cyan-50/20 to-white text-slate-800 animate-fade-in select-none">
      {/* Top Header */}
      <header className="w-full max-w-lg flex items-center justify-between py-2 border-b border-slate-100">
        <button
          onClick={() => {
            liquidAudio.playSubtleBubble();
            onBack();
          }}
          className="p-2 -ml-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 font-bangla">
              বেনামী কবুতর বোর্ড
            </h1>
          </div>
          <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase font-english">
            Anonymous Kobutor Board
          </span>
        </div>

        <button
          onClick={handleRefresh}
          className={`p-2 -mr-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95 ${
            isRefreshing ? 'animate-spin text-cyan-600' : ''
          }`}
          title="Refresh Board"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {/* Strict Privacy Assurance Banner */}
      <div className="w-full max-w-lg mt-3 px-3.5 py-2 rounded-2xl bg-white/80 border border-cyan-100/80 backdrop-blur-md shadow-xs flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0" />
        <p className="text-[11px] font-medium text-slate-600 leading-tight font-bangla">
          ১০০% গোপনীয় ও সুরক্ষিত। কোন আসল নাম, ছবি বা ব্যাক্তিগত তথ্য কখনো প্রকাশ করা হয় না।
        </p>
      </div>

      {/* User's Own Recognizable Pigeon Identity Card (Pinned) */}
      <div className="w-full max-w-lg mt-3 p-4 rounded-3xl bg-gradient-to-r from-cyan-50/90 to-purple-50/90 border border-cyan-200/90 shadow-md backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-2 right-3 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-600 text-white font-mono shadow-xs">
          তোমার স্থান #{myRank}
        </div>

        <div className="flex items-center gap-3.5">
          {/* Canvas Rendered Recognizable Pigeon */}
          <PigeonAvatarCanvas trait={myIdentity} size={56} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-slate-900 font-mono">
                {myIdentity.id}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 text-cyan-800 border border-cyan-200 font-bangla">
                {myIdentity.titleBangla}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 font-medium font-bangla">
              পালক রূপ: <span className="font-bold text-slate-800">{myIdentity.paletteBangla}</span> • {myMetric}
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="w-full max-w-lg mt-4 flex gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 overflow-x-auto no-scrollbar">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                liquidAudio.playSubtleBubble(300);
                setActiveCategory(cat.id);
              }}
              className={`flex-1 min-w-[95px] py-2 px-2.5 rounded-xl text-center text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="font-bangla">{cat.labelBangla}</span>
            </button>
          );
        })}
      </div>

      {/* Leaderboard Entries List */}
      <div className="w-full max-w-lg mt-3 space-y-2">
        {entries.map((item) => {
          const isTop3 = item.rank <= 3;
          return (
            <div
              key={item.anonymousId}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                isTop3
                  ? 'bg-white border-amber-200/90 shadow-xs'
                  : 'bg-white/80 border-slate-200/80 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Rank Badge */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    item.rank === 1
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : item.rank === 2
                      ? 'bg-slate-300 text-slate-900'
                      : item.rank === 3
                      ? 'bg-amber-700/80 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.rank}
                </div>

                {/* Unique Canvas Pigeon Avatar */}
                <PigeonAvatarCanvas trait={item.trait} size={44} />

                {/* Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 font-mono truncate">
                      {item.anonymousId}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bangla hidden sm:inline">
                      • {item.trait.titleBangla}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 font-bangla">
                    {item.trait.paletteBangla} কবুতর
                  </span>
                </div>
              </div>

              {/* Score / Metric */}
              <div className="text-right shrink-0">
                <span className="text-xs font-black text-slate-900 font-mono">
                  {item.metricValue}
                </span>
                <p className="text-[9px] text-slate-400 font-bangla">{item.metricLabel}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Finding Action Button */}
      {onStartMatch && (
        <div className="w-full max-w-lg mt-5">
          <button
            onClick={() => {
              liquidAudio.playRippleSound();
              onStartMatch();
            }}
            className="w-full py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 transition-all active:scale-95 font-bangla"
          >
            <span>কথা বলুন ও পালক অর্জন করুন 🕊️</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Isolated Canvas Component for mini recognizable pigeon avatar
const PigeonAvatarCanvas: React.FC<{ trait: PigeonTrait; size?: number }> = ({ trait, size = 44 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    // Subtle background circle
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(241, 245, 249, 0.7)';
    ctx.fill();

    drawRecognizablePigeon(ctx, trait, size / 2 - 2, size / 2 + 2, (size / 44) * 0.48, 0.4);
  }, [trait, size]);

  return <canvas ref={canvasRef} className="rounded-2xl shrink-0 shadow-xs border border-white" />;
};
