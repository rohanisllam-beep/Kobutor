import React from 'react';
import {
  Bot,
  Gamepad2,
  CloudSun,
  DoorOpen,
  Shield,
  Settings,
  Bell,
} from 'lucide-react';
import { liquidAudio } from '../lib/audioSynth';

export interface FloatingRippleState {
  kobutorCall?: boolean;
  miko?: boolean;
  weather?: boolean;
  play?: boolean;
}

export interface FloatingIconsProps {
  onOpenMiko: () => void;
  onOpenPlay: () => void;
  onOpenWeather: () => void;
  onOpenKobutorCall: () => void;
  activeRipples?: FloatingRippleState;
  isDarkMode?: boolean;
}

export const FloatingIcons: React.FC<FloatingIconsProps> = ({
  onOpenMiko,
  onOpenPlay,
  onOpenWeather,
  onOpenKobutorCall,
  activeRipples,
  isDarkMode = false,
}) => {
  const ripples: FloatingRippleState = activeRipples || {};

  const handlePress = (callback: () => void, soundFreq = 160) => {
    liquidAudio.playSubtleBubble(soundFreq);
    callback();
  };

  const baseBtnClass =
    'relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md border shadow-xs active:scale-90 hover:scale-105 select-none bg-white/95 border-slate-200/90 text-slate-700 hover:text-slate-900 hover:border-slate-300 shadow-slate-200/50';

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {/* Top Left Floating Cluster: Miko & Play (2 Icons) */}
      <div className="pointer-events-auto absolute top-6 left-6 flex flex-col items-center gap-3 animate-float-a">
        {/* 1. Miko AI Spark */}
        <button
          id="btn-floating-miko"
          onClick={() => handlePress(onOpenMiko, 260)}
          title="Miko AI Spark"
          aria-label="Miko AI Spark"
          className={`${baseBtnClass} ${
            ripples.miko ? 'animate-liquid-ripple ring-2 ring-cyan-400/80' : ''
          }`}
        >
          <Bot className="w-4 h-4 stroke-[2.2] text-cyan-600" />
        </button>

        {/* 2. Play Mini Games */}
        <button
          id="btn-floating-play"
          onClick={() => handlePress(onOpenPlay, 220)}
          title="Mini Games"
          aria-label="Mini Games"
          className={`${baseBtnClass} ${
            ripples.play ? 'animate-liquid-ripple ring-2 ring-purple-400/80' : ''
          }`}
        >
          <Gamepad2 className="w-4 h-4 stroke-[2.2] text-purple-600" />
        </button>
      </div>

      {/* Top Right Floating Cluster: Kobutor Call & Human Weather (2 Icons) */}
      <div className="pointer-events-auto absolute top-6 right-6 flex flex-col items-center gap-3 animate-float-b">
        {/* 3. Kobutor Call / Realtime Live Pulse */}
        <button
          id="btn-floating-call"
          onClick={() => handlePress(onOpenKobutorCall, 320)}
          title="Kobutor Call & Notifications"
          aria-label="Kobutor Call"
          className={`${baseBtnClass} ${
            ripples.kobutorCall
              ? 'animate-liquid-ripple ring-2 ring-cyan-500 bg-cyan-50/95 text-cyan-800'
              : ''
          }`}
        >
          <Bell
            className={`w-4 h-4 stroke-[2.2] ${
              ripples.kobutorCall ? 'text-cyan-600' : 'text-slate-600'
            }`}
          />
        </button>

        {/* 4. Human Weather Mood Radar */}
        <button
          id="btn-floating-weather"
          onClick={() => handlePress(onOpenWeather, 200)}
          title="Human Weather"
          aria-label="Human Weather"
          className={`${baseBtnClass} ${
            ripples.weather ? 'animate-liquid-ripple ring-2 ring-amber-400/80' : ''
          }`}
        >
          <CloudSun className="w-4 h-4 stroke-[2.2] text-amber-500" />
        </button>
      </div>
    </div>
  );
};
