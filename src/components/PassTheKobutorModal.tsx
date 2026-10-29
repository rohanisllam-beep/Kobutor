import React, { useState } from 'react';
import { Sparkles, ArrowRight, Heart, Home, Gamepad2, Feather } from 'lucide-react';
import { LiquidPigeonCanvas } from './LiquidPigeonCanvas';
import { liquidAudio } from '../lib/audioSynth';
import { featherSystem } from '../lib/featherSystem';
import { KobutorMemory } from '../types';

interface PassTheKobutorModalProps {
  isOpen: boolean;
  onPass: () => void;
  onGoHome: () => void;
  onPlayGames?: () => void;
  isDarkMode?: boolean;
  memory?: KobutorMemory | null;
}

export const PassTheKobutorModal: React.FC<PassTheKobutorModalProps> = ({
  isOpen,
  onPass,
  onGoHome,
  onPlayGames,
  isDarkMode = false,
  memory,
}) => {
  const [isFlyingAway, setIsFlyingAway] = useState(false);
  const [blessingSent, setBlessingSent] = useState(false);

  if (!isOpen) return null;

  const handlePassPress = () => {
    liquidAudio.playRippleSound();
    setIsFlyingAway(true);
    setTimeout(() => {
      onPass();
      setIsFlyingAway(false);
    }, 900);
  };

  const handleSendBlessing = () => {
    if (blessingSent) return;
    setBlessingSent(true);
    liquidAudio.playSynchronyChime();
    featherSystem.earn(10, 'Parting Blessing', 'বিদায় শুভকামনা');
    setTimeout(() => setBlessingSent(false), 2600);
  };

  const minutes = memory ? Math.floor(memory.durationSeconds / 60) : 0;
  const seconds = memory ? memory.durationSeconds % 60 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-sm rounded-[36px] p-6 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18)] border text-center flex flex-col justify-between items-center transition-all ${
          isDarkMode
            ? 'bg-[#090d16] border-slate-800 text-white'
            : 'bg-white/95 border-slate-200/90 text-slate-800'
        }`}
      >
        {/* Animated Flying Liquid Pigeon with Ambient Aura */}
        <div
          className={`relative my-1 transition-all duration-700 ${
            isFlyingAway ? '-translate-y-20 scale-75 opacity-0' : 'translate-y-0 scale-100'
          }`}
        >
          <div className="absolute inset-0 bg-cyan-200/35 blur-3xl rounded-full" />
          <LiquidPigeonCanvas
            size={140}
            mode={isFlyingAway ? 'energized' : 'idle'}
            accentColor="aqua"
          />
        </div>

        {/* Short Title & Status */}
        <h2 className="text-base font-extrabold tracking-tight text-slate-900 font-bangla flex items-center gap-1.5 justify-center">
          <span>কবুতরের সুন্দর সমাপ্তি</span>
          <span className="text-base">🕊️</span>
        </h2>

        {/* Kobutor Memory Summary (Short & Elegant) */}
        {memory && memory.durationSeconds > 0 && (
          <div className="w-full my-2.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-around font-sans">
            <div className="text-center">
              <span className="block text-xs font-bold text-slate-800 font-mono">
                {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
              </span>
              <span className="text-[10px] text-slate-500 font-medium">কথোপকথন</span>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="text-center">
              <span className="block text-xs font-bold text-cyan-700 font-mono">
                {memory.reactionsCount || 1}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">রিয়েকশন</span>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="text-center">
              <span className="block text-xs font-bold text-emerald-700 font-mono">
                +15 🪶
              </span>
              <span className="text-[10px] text-slate-500 font-medium">পালক অর্জন</span>
            </div>
          </div>
        )}

        {/* Blessing Feedback Toast */}
        {blessingSent && (
          <div className="my-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-1.5 animate-bounce">
            <Heart className="w-3.5 h-3.5 fill-rose-500" />
            <span>বিদায় শুভকামনা পাঠানো হয়েছে! (+10 🪶)</span>
          </div>
        )}

        {/* Short, Attractive Post-Call Pigeon Options */}
        <div className="mt-3 w-full space-y-2">
          {/* 1. Find Another Kobutor (Primary action) */}
          <button
            onClick={handlePassPress}
            disabled={isFlyingAway}
            className="w-full py-3 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-cyan-600/25"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isFlyingAway ? 'কবুতর উড়ছে...' : 'পরবর্তী কবুতর খুঁজুন'}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>

          <div className="grid grid-cols-2 gap-2">
            {/* 2. Play Connection Games */}
            <button
              onClick={() => {
                liquidAudio.playSubtleBubble();
                if (onPlayGames) onPlayGames();
                else onGoHome();
              }}
              className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>মজার গেম</span>
            </button>

            {/* 3. Send Parting Blessing */}
            <button
              onClick={handleSendBlessing}
              className="py-2.5 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Feather className="w-3.5 h-3.5" />
              <span>শুভকামনা</span>
            </button>
          </div>

          {/* 4. Return to Home */}
          <button
            onClick={onGoHome}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>হোমে ফিরুন</span>
          </button>
        </div>
      </div>
    </div>
  );
};
