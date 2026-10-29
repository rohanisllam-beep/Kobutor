import React, { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { LiquidPigeonCanvas } from './LiquidPigeonCanvas';
import { FloatingIcons } from './FloatingIcons';
import { liquidAudio } from '../lib/audioSynth';

interface HomeViewProps {
  onSelectGenderAndFind: (gender: 'male' | 'female') => void;
  onOpenMiko: () => void;
  onOpenPlay: () => void;
  onOpenWeather: () => void;
  onOpenKobutorCall: () => void;
  onOpenMyKobutor?: () => void;
  featherBalance?: number;
  activeRipples?: {
    kobutorCall?: boolean;
    miko?: boolean;
    weather?: boolean;
    play?: boolean;
  };
  isDarkMode?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectGenderAndFind,
  onOpenMiko,
  onOpenPlay,
  onOpenWeather,
  onOpenKobutorCall,
  onOpenMyKobutor,
  featherBalance = 50,
  activeRipples = {},
  isDarkMode = false,
}) => {
  const [step, setStep] = useState<'initial' | 'gender'>('initial');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleFindPress = () => {
    liquidAudio.init();
    liquidAudio.playRippleSound();
    setIsTransitioning(true);

    setTimeout(() => {
      setStep('gender');
      setIsTransitioning(false);
    }, 280);
  };

  const handleGenderSelect = (gender: 'male' | 'female') => {
    liquidAudio.playSubtleBubble();
    onSelectGenderAndFind(gender);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between items-center px-7 py-8 select-none overflow-hidden bg-gradient-to-b from-[#f0f9ff] via-[#ffffff] to-[#f5f3ff] text-slate-800">
      {/* Background Soft Refraction Caustics & Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-purple-200/35 blur-3xl" />
      </div>

      {/* Premium Floating Icons with Subtle Liquid Floating Motion (4 Upper Icons) */}
      {step === 'initial' && (
        <FloatingIcons
          onOpenMiko={onOpenMiko}
          onOpenPlay={onOpenPlay}
          onOpenWeather={onOpenWeather}
          onOpenKobutorCall={onOpenKobutorCall}
          activeRipples={activeRipples}
          isDarkMode={false}
        />
      )}

      {/* Top Bar: Navigation & Clear Feather Balance */}
      <div className="relative z-20 w-full flex items-center justify-between min-h-[36px]">
        {step === 'gender' ? (
          <button
            onClick={() => {
              liquidAudio.playSubtleBubble();
              setStep('initial');
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center border transition-all bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-8" />
        )}

        {/* Clear Feather Balance Pill — Opens "My Kobutor 🕊️" */}
        {onOpenMyKobutor && (
          <button
            onClick={() => {
              liquidAudio.playSubtleBubble(280);
              onOpenMyKobutor();
            }}
            title="My Kobutor Customization & Feathers"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-amber-50/70 border border-amber-200/90 hover:border-amber-400 shadow-xs hover:shadow-sm text-slate-800 transition-all active:scale-95 group backdrop-blur-md"
          >
            <span className="text-base group-hover:rotate-12 transition-transform">🪶</span>
            <span className="text-xs font-black text-amber-700 tracking-tight">
              {featherBalance} Feathers
            </span>
            <span className="text-[10px] text-slate-400 font-bold ml-0.5 group-hover:text-amber-700 transition-colors">
              • My Kobutor 🕊️
            </span>
          </button>
        )}

        <div className="w-8" />
      </div>

      {/* ========================================================= */}
      {/* STEP 1: INITIAL SCREEN (LIQUID PIGEON + KOBUTOR + FIND) */}
      {/* ========================================================= */}
      {step === 'initial' ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center my-auto w-full max-w-sm px-2 animate-fade-in">
          {/* Living Liquid Pigeon with Ambient Glow */}
          <div className="relative w-48 h-48 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan-200/30 blur-3xl rounded-full" />
            <LiquidPigeonCanvas
              size={190}
              mode={isTransitioning ? 'energized' : 'idle'}
              accentColor="aqua"
              interactive={true}
              onClick={() => {
                liquidAudio.init();
                liquidAudio.playSubtleBubble();
              }}
            />
          </div>

          {/* Brand Title */}
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-slate-900 font-english">
            KOBUTOR
          </h1>

          {/* Bangla Subtitle */}
          <p className="mt-2 text-slate-600 text-base font-medium mb-8 tracking-normal font-bangla">
            তোমার জন্য একজনকে খুঁজছি।
          </p>

          {/* Primary Action Button */}
          <button
            onClick={handleFindPress}
            disabled={isTransitioning}
            className="w-full py-4.5 rounded-3xl font-extrabold text-xs tracking-[0.14em] uppercase flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-95 bg-slate-900 text-white shadow-[0_16px_32px_-10px_rgba(15,23,42,0.3)] hover:bg-slate-800"
          >
            <span>{isTransitioning ? 'Connecting...' : 'FIND MY KOBUTOR'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      ) : (
        /* ========================================================= */
        /* STEP 2: GENDER SELECTION (ONLY MALE / FEMALE) */
        /* ========================================================= */
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center my-auto w-full max-w-sm px-2 animate-fade-in">
          {/* Subtle icon representation */}
          <div className="w-14 h-14 mb-4 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center text-2xl shadow-xs">
            🕊️
          </div>

          <h2 className="text-xl font-bold tracking-[-0.02em] text-slate-900 font-english">
            SELECT GENDER
          </h2>
          <p className="mt-1 text-xs text-slate-500 font-medium mb-7">
            Connects you with a real opposite-gender companion.
          </p>

          <div className="w-full space-y-3">
            {/* MALE OPTION */}
            <button
              onClick={() => handleGenderSelect('male')}
              className="w-full py-4 px-5 rounded-3xl border-2 flex items-center justify-between transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-xs bg-white border-cyan-500/30 hover:border-cyan-500 text-slate-900"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center text-lg font-bold">
                  ♂
                </span>
                <div className="text-left">
                  <span className="font-extrabold text-sm tracking-wider block uppercase">
                    MALE
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Find female companion
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-600 stroke-[2.5]" />
            </button>

            {/* FEMALE OPTION */}
            <button
              onClick={() => handleGenderSelect('female')}
              className="w-full py-4 px-5 rounded-3xl border-2 flex items-center justify-between transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-xs bg-white border-purple-500/30 hover:border-purple-500 text-slate-900"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg font-bold">
                  ♀
                </span>
                <div className="text-left">
                  <span className="font-extrabold text-sm tracking-wider block uppercase">
                    FEMALE
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Find male companion
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-600 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* Subtle bottom spacing */}
      <div className="relative z-10 w-full text-center min-h-[16px]" />
    </div>
  );
};

