import React, { useEffect, useState } from 'react';
import { Share2, DoorOpen, X, ArrowLeft } from 'lucide-react';
import { LiquidPigeonCanvas } from './LiquidPigeonCanvas';
import { liquidAudio } from '../lib/audioSynth';

interface MatchmakingViewProps {
  onCancel: () => void;
  onOpenDoor: () => void;
  onShareInvite: () => void;
  isDarkMode?: boolean;
}

export const MatchmakingView: React.FC<MatchmakingViewProps> = ({
  onCancel,
  onOpenDoor,
  onShareInvite,
}) => {
  const [waitingElapsed, setWaitingElapsed] = useState(0);

  useEffect(() => {
    liquidAudio.playSubtleBubble(80);
    const interval = setInterval(() => {
      setWaitingElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col justify-between items-center px-8 py-7 select-none overflow-hidden bg-gradient-to-b from-[#f0f9ff] via-[#ffffff] to-[#f5f3ff] text-slate-800">
      {/* Background Soft Refraction Caustics & Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-45">
        <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-purple-200/35 blur-3xl" />
      </div>

      {/* Top Header */}
      <div className="relative z-20 w-full flex items-center justify-between pt-1">
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-full flex items-center justify-center border transition-all bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100/60 border border-cyan-200/80 text-[10px] font-bold tracking-widest text-cyan-800 uppercase font-english">
          <span>Discovery Active</span>
        </div>

        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-full flex items-center justify-center border transition-all bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Central Waiting Experience */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center my-auto w-full max-w-sm px-2">
        {/* Energized Floating Liquid Pigeon with Ambient Glow */}
        <div className="relative w-48 h-48 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-cyan-200/30 blur-3xl rounded-full" />
          <LiquidPigeonCanvas
            size={190}
            mode="energized"
            accentColor="aqua"
            interactive={true}
            onClick={() => liquidAudio.playSubtleBubble()}
          />
        </div>

        {/* State Title */}
        <h2 className="text-2xl font-bold tracking-[-0.02em] text-slate-900 font-english">
          YOUR KOBUTOR IS WAITING
        </h2>

        {/* Bangla Subtitle */}
        <p className="mt-2 text-slate-600 text-base font-medium tracking-normal font-bangla">
          তোমার Kobutor অপেক্ষা করছে…
        </p>

        {/* Real-time waiting capsule */}
        <div className="mt-5 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold tracking-wider text-slate-700 shadow-xs animate-liquid-ripple">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
          <span className="uppercase font-english">Searching Companions • {waitingElapsed}s</span>
        </div>
      </div>

      {/* Bottom Acceleration Actions */}
      <div className="relative z-20 w-full max-w-xs space-y-2.5 pb-1">
        <button
          onClick={onOpenDoor}
          className="w-full py-4 px-6 rounded-3xl font-extrabold text-xs tracking-[0.14em] uppercase flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 bg-slate-900 text-white shadow-[0_16px_32px_-10px_rgba(15,23,42,0.3)] hover:bg-slate-800"
        >
          <DoorOpen className="w-4 h-4 stroke-[2.2]" />
          <span>Enter Direct Room Code</span>
        </button>

        <button
          onClick={onShareInvite}
          className="w-full py-3 px-4 rounded-3xl border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-xs text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all"
        >
          <Share2 className="w-4 h-4 text-cyan-600 stroke-[2.2]" />
          <span>Invite Companion Directly</span>
        </button>
      </div>
    </div>
  );
};

