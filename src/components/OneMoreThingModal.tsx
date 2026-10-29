import React from 'react';
import { Sparkles, Gamepad2, Gift, HelpCircle, ArrowRight, PhoneOff, X } from 'lucide-react';
import { liquidAudio } from '../lib/audioSynth';

interface OneMoreThingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlay: () => void;
  onSurprise: () => void;
  onSecretQuestion: () => void;
  onConfirmNext: () => void;
  onConfirmEnd: () => void;
  isDarkMode?: boolean;
}

export const OneMoreThingModal: React.FC<OneMoreThingModalProps> = ({
  isOpen,
  onClose,
  onPlay,
  onSurprise,
  onSecretQuestion,
  onConfirmNext,
  onConfirmEnd,
  isDarkMode = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-sm rounded-[36px] p-6 border shadow-[0_24px_48px_-12px_rgba(0,0,0,0.2)] flex flex-col justify-between overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-[#090d16] border-slate-800 text-white'
            : 'bg-white border-slate-200/90 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕊️</span>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white font-bangla">
                আরেকটা কিছু করি?
              </h3>
              <p className="text-[10px] text-slate-400 font-medium font-english">
                One more thing before saying goodbye?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 transition-all active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fun Continuation Options */}
        <div className="py-4 space-y-2.5">
          {/* 1. Play Mini Game */}
          <button
            onClick={() => {
              liquidAudio.playRippleSound();
              onPlay();
            }}
            className="w-full p-3.5 rounded-2xl bg-cyan-50/80 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center gap-3 text-left transition-all active:scale-98 group"
          >
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-cyan-600 shadow-xs group-hover:scale-110 transition-transform">
              <Gamepad2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-black text-cyan-900 dark:text-cyan-200 font-bangla">
                একটি মিনি-গেম খেলি 🎮
              </h4>
              <p className="text-[10px] text-cyan-700/80 dark:text-cyan-400/80">Would You Rather, 5-Sec Quiz</p>
            </div>
          </button>

          {/* 2. Kobutor Surprise */}
          <button
            onClick={() => {
              liquidAudio.playRippleSound();
              onSurprise();
            }}
            className="w-full p-3.5 rounded-2xl bg-purple-50/80 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 border border-purple-200/80 dark:border-purple-500/30 flex items-center gap-3 text-left transition-all active:scale-98 group"
          >
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-purple-600 shadow-xs group-hover:scale-110 transition-transform">
              <Gift className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-black text-purple-900 dark:text-purple-200 font-bangla">
                Kobutor Surprise 🎁
              </h4>
              <p className="text-[10px] text-purple-700/80 dark:text-purple-400/80">১০ সেকেন্ড বা হাসানোর চ্যালেঞ্জ</p>
            </div>
          </button>

          {/* 3. Secret Question */}
          <button
            onClick={() => {
              liquidAudio.playRippleSound();
              onSecretQuestion();
            }}
            className="w-full p-3.5 rounded-2xl bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-500/30 flex items-center gap-3 text-left transition-all active:scale-98 group"
          >
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-amber-600 shadow-xs group-hover:scale-110 transition-transform">
              <HelpCircle className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 font-bangla">
                Secret Question 🤔
              </h4>
              <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">উভয়ের গোপন উত্তর প্রকাশ</p>
            </div>
          </button>
        </div>

        {/* Primary Continuation or Termination Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              liquidAudio.playSubtleBubble();
              onConfirmNext();
            }}
            className="py-3 px-3 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Next Kobutor</span>
          </button>

          <button
            onClick={() => {
              liquidAudio.playSubtleBubble();
              onConfirmEnd();
            }}
            className="py-3 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>End Connection</span>
          </button>
        </div>
      </div>
    </div>
  );
};
