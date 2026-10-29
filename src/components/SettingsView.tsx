import React from 'react';
import { ArrowLeft, Volume2, Lock, Trash2, DoorOpen, ShieldCheck, Sparkles, ChevronRight } from 'lucide-react';
import { UserPreferences } from '../types';
import { liquidAudio } from '../lib/audioSynth';

interface SettingsViewProps {
  onBack: () => void;
  preferences: UserPreferences;
  onEditPreferences: () => void;
  onOpenDoor?: () => void;
  onOpenMyKobutor?: () => void;
  featherBalance?: number;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  blockedCount: number;
  onClearBlocked: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBack,
  preferences,
  onEditPreferences,
  onOpenDoor,
  onOpenMyKobutor,
  featherBalance = 50,
  blockedCount,
  onClearBlocked,
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
            Settings & Safety
          </h2>
          <div className="w-8" />
        </div>

        <div className="mt-5 space-y-3.5 max-w-sm mx-auto">
          {/* My Kobutor Customization Card */}
          {onOpenMyKobutor && (
            <div
              onClick={() => {
                liquidAudio.playSubtleBubble(280);
                onOpenMyKobutor();
              }}
              className="p-4 rounded-3xl border border-amber-200/90 bg-gradient-to-r from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 shadow-xs cursor-pointer hover:border-amber-400 transition-all flex items-center justify-between active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-700 flex items-center justify-center text-2xl shadow-xs group-hover:scale-105 transition-transform">
                  🕊️
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white font-english">
                      MY KOBUTOR
                    </h4>
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      🪶 {featherBalance} Feathers
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium font-bangla mt-0.5">
                    ক্যাপ, চশমা, রঙিন ডানা ও ক্রাউন দিয়ে কবুতর সাজাও
                  </p>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}

          {/* Identity & Preferences Card */}
          <div className="p-4.5 rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-cyan-700 uppercase tracking-widest font-english">
                Matching Signals
              </span>
              <button
                onClick={onEditPreferences}
                className="text-xs text-cyan-700 font-bold uppercase tracking-wider hover:underline"
              >
                Edit
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-cyan-50/50 border border-cyan-100/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Identity
                </span>
                <span className="font-bold capitalize text-slate-800 mt-0.5 block">
                  {preferences.gender}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Looking For
                </span>
                <span className="font-bold capitalize text-slate-800 mt-0.5 block">
                  {preferences.lookingFor}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Connection Goal
                </span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {preferences.connectionType}
                </span>
              </div>
            </div>
          </div>

          {/* Audio & Ambience */}
          <div className="p-4.5 rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block font-english">
              Audio Experience
            </span>

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Volume2 className="w-4 h-4 text-cyan-600" />
                <span>Ambient Liquid Synth</span>
              </div>
              <button
                onClick={() => {
                  liquidAudio.init();
                  liquidAudio.playSubtleBubble();
                }}
                className="text-xs text-cyan-700 font-bold uppercase tracking-wider hover:underline"
              >
                Test Sound
              </button>
            </div>
          </div>

          {/* Private Room Portal */}
          {onOpenDoor && (
            <div className="p-4.5 rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-600 font-english">
                  <DoorOpen className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Private Room Portal</span>
                </div>
                <button
                  onClick={onOpenDoor}
                  className="px-3 py-1 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 shadow-xs"
                >
                  Enter Room
                </button>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Connect directly with a specific friend using a unique secret room code.
              </p>
            </div>
          )}

          {/* Privacy & Safety Hardening */}
          <div className="p-4.5 rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-600 font-english">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Trust & Safety</span>
            </div>

            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-600">Blocked Users</span>
              <span className="font-bold text-slate-900">{blockedCount}</span>
            </div>

            {blockedCount > 0 && (
              <button
                onClick={onClearBlocked}
                className="w-full py-2 px-3 rounded-2xl border border-rose-200 bg-rose-50/70 text-rose-600 text-xs font-bold uppercase tracking-wider hover:bg-rose-100 flex items-center justify-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Blocklist</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] font-semibold tracking-widest uppercase text-slate-400 pb-1 font-english">
        Kobutor • Anonymous Real Human Connection
      </div>
    </div>
  );
};

