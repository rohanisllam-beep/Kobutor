import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { liquidAudio } from '../lib/audioSynth';

interface ConnectionsViewProps {
  onBack: () => void;
  onFindNew: () => void;
  isDarkMode?: boolean;
}

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({
  onBack,
  onFindNew,
}) => {
  return (
    <div className="relative w-full h-full flex flex-col justify-between px-6 py-7 overflow-y-auto scrollbar-none select-none bg-gradient-to-b from-[#f0f9ff] via-[#ffffff] to-[#f5f3ff] text-slate-800">
      <div>
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center border transition-all bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xs font-extrabold tracking-widest uppercase text-slate-900 font-english">
            Shared Moments
          </h2>
          <div className="w-8" />
        </div>

        <div className="mt-7 text-center max-w-sm mx-auto">
          <div className="w-14 h-14 mx-auto rounded-full bg-cyan-100/70 border border-cyan-200/80 flex items-center justify-center text-2xl shadow-xs mb-3.5">
            🕊️
          </div>
          <h3 className="text-xl font-bold tracking-[-0.02em] text-slate-900 font-english">
            EPHEMERAL MOMENTS
          </h3>
          <p className="mt-2 text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
            Kobutor connections are present-moment focused. When a connection ends with "Pass the Kobutor", that good energy is gifted forward into the living world.
          </p>

          <div className="mt-5 p-4.5 rounded-3xl border border-cyan-100/80 bg-white/95 shadow-xs text-slate-800 text-xs text-left space-y-2">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-cyan-700 font-english">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              <span>Philosophy of Kobutor</span>
            </div>
            <p className="text-sm font-semibold leading-relaxed text-slate-800 font-bangla">
              "প্রতিটি সংযোগ একটি ক্ষণিক সুন্দর মুহূর্ত—উপভোগ করো, স্মৃতি হিসেবে ধারণ করো, আর ভালোবাসা ছড়িয়ে দাও।"
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 max-w-xs mx-auto w-full pb-1">
        <button
          onClick={() => {
            liquidAudio.playRippleSound();
            onFindNew();
          }}
          className="w-full py-4 px-6 rounded-3xl font-extrabold text-xs tracking-[0.14em] uppercase flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 bg-slate-900 text-white shadow-[0_16px_32px_-10px_rgba(15,23,42,0.3)] hover:bg-slate-800"
        >
          Discover New Companion
        </button>
      </div>
    </div>
  );
};

