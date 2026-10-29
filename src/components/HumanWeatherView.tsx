import React, { useEffect, useState } from 'react';
import { ArrowLeft, Users, Sparkles, RefreshCw } from 'lucide-react';
import { HumanWeatherAggregate } from '../types';
import { liquidAudio } from '../lib/audioSynth';

interface HumanWeatherViewProps {
  onBack: () => void;
  onFilterMatch: (mood: string) => void;
  isDarkMode?: boolean;
}

export const HumanWeatherView: React.FC<HumanWeatherViewProps> = ({
  onBack,
  onFilterMatch,
}) => {
  const [data, setData] = useState<HumanWeatherAggregate>({
    happyCount: 42,
    calmCount: 68,
    lonelyCount: 84,
    boredCount: 53,
    emotionalCount: 39,
    energeticCount: 27,
    curiousCount: 61,
    tiredCount: 46,
    wantToTalkCount: 92,
    wantCompanyCount: 78,
    wantToLaughCount: 65,
    totalActive: 520,
    updatedAt: Date.now(),
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchWeather = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/human-weather');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const moods = [
    {
      label: 'Lonely',
      count: data.lonelyCount,
      cardBg: 'bg-sky-50/70 border-sky-200/80 text-sky-900',
      badgeBg: 'bg-white text-sky-700',
      desc: 'Seeking warm human presence',
    },
    {
      label: 'Wanting to Talk',
      count: data.wantToTalkCount,
      cardBg: 'bg-cyan-50/70 border-cyan-200/80 text-cyan-900',
      badgeBg: 'bg-white text-cyan-700',
      desc: 'Ready for deep conversations',
    },
    {
      label: 'Calm',
      count: data.calmCount,
      cardBg: 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900',
      badgeBg: 'bg-white text-emerald-700',
      desc: 'Peaceful quiet companionship',
    },
    {
      label: 'Wanting to Laugh',
      count: data.wantToLaughCount,
      cardBg: 'bg-amber-50/70 border-amber-200/80 text-amber-900',
      badgeBg: 'bg-white text-amber-700',
      desc: 'Playful banter & smiles',
    },
    {
      label: 'Curious',
      count: data.curiousCount,
      cardBg: 'bg-purple-50/70 border-purple-200/80 text-purple-900',
      badgeBg: 'bg-white text-purple-700',
      desc: 'Eager to discover new perspectives',
    },
    {
      label: 'Emotional',
      count: data.emotionalCount,
      cardBg: 'bg-rose-50/70 border-rose-200/80 text-rose-900',
      badgeBg: 'bg-white text-rose-700',
      desc: 'Seeking deep empathy & care',
    },
  ];

  return (
    <div className="relative w-full h-full flex flex-col justify-between px-6 py-7 overflow-y-auto scrollbar-none select-none bg-gradient-to-b from-[#f0f9ff] via-[#ffffff] to-[#f5f3ff] text-slate-800">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center border transition-all bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100/60 border border-cyan-200/80 text-[10px] font-bold tracking-widest text-cyan-800 uppercase font-english">
            <Users className="w-3 h-3 text-cyan-700" />
            <span>{data.totalActive} Souls Online</span>
          </div>

          <button
            onClick={() => {
              liquidAudio.playSubtleBubble();
              fetchWeather();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center border transition-all bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="mt-5 text-center">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900 font-english">
            HUMAN WEATHER
          </h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Live anonymous emotional atmosphere of the network
          </p>
        </div>
      </div>

      {/* Atmospheric Weather Cards */}
      <div className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md mx-auto w-full">
        {moods.map((m) => (
          <div
            key={m.label}
            onClick={() => {
              liquidAudio.playSubtleBubble();
              onFilterMatch(m.label);
            }}
            className={`p-3.5 rounded-3xl border ${m.cardBg} backdrop-blur-md cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-xs flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider font-english">{m.label}</span>
              <span className={`text-[11px] font-mono font-bold ${m.badgeBg} px-2 py-0.5 rounded-full shadow-xs`}>
                {m.count}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-slate-600 leading-snug">{m.desc}</p>
            <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-cyan-800">
              <Sparkles className="w-3 h-3 text-cyan-600" />
              <span>Connect on this Wavelength</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="text-center pb-1">
        <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-english">
          Real-time emotional resonance • Zero personal data exposed
        </p>
      </div>
    </div>
  );
};

