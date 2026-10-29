import React, { useState, useEffect } from 'react';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { featherSystem, FeatherState, FeatherAnimationEvent } from '../lib/featherSystem';

interface FeatherRewardBannerProps {
  onOpenMyKobutor: () => void;
  isDarkMode?: boolean;
}

export const FeatherRewardBanner: React.FC<FeatherRewardBannerProps> = ({
  onOpenMyKobutor,
  isDarkMode = false,
}) => {
  const [currentAnim, setCurrentAnim] = useState<FeatherAnimationEvent | null>(null);
  const [showFirstCelebration, setShowFirstCelebration] = useState(false);

  useEffect(() => {
    return featherSystem.subscribe((state, anim) => {
      if (anim) {
        setCurrentAnim(anim);
        const timer = setTimeout(() => {
          setCurrentAnim(null);
        }, 2600);

        // Check first celebration
        if (!state.hasSeenFirstCelebration && anim.type === 'earn') {
          setShowFirstCelebration(true);
        }

        return () => clearTimeout(timer);
      }
    });
  }, []);

  const handleDismissFirstCelebration = () => {
    featherSystem.dismissFirstCelebration();
    setShowFirstCelebration(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4 select-none">
      {/* 1. SHORT SATISFYING EARN / SPEND FLOATING ANIMATION */}
      {currentAnim && !showFirstCelebration && (
        <div
          key={currentAnim.id}
          className={`pointer-events-auto transform transition-all duration-300 ease-out animate-bounce flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg ${
            currentAnim.type === 'earn'
              ? 'bg-amber-50/95 dark:bg-amber-950/95 border-amber-300 dark:border-amber-600 text-amber-900 dark:text-amber-100 ring-2 ring-amber-400/40'
              : 'bg-rose-50/95 dark:bg-slate-900/95 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
          }`}
        >
          <span className="text-lg">🪶</span>
          <span className="text-sm font-black tracking-tight">
            {currentAnim.type === 'earn' ? `+${currentAnim.amount} 🪶` : `-${currentAnim.amount} 🪶`}
          </span>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {currentAnim.titleBangla || currentAnim.title}
          </span>
        </div>
      )}

      {/* 2. GENTLE FIRST FEATHER CELEBRATION (NON-INTRUSIVE) */}
      {showFirstCelebration && (
        <div className="pointer-events-auto max-w-sm w-full p-4 rounded-3xl bg-white/98 dark:bg-slate-900/98 border border-amber-300 dark:border-amber-600 shadow-2xl backdrop-blur-lg flex items-center justify-between gap-3 animate-fade-in ring-2 ring-amber-400/50">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-2xl shrink-0 shadow-xs">
            🕊️✨
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-slate-900 dark:text-white font-bangla">
                তোমার প্রথম Feather!
              </h4>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-bangla leading-tight mt-0.5">
              Feather দিয়ে কবুতর সাজাও! ক্যাপ, চশমা, রঙিন ডানা আনলক করতে পারো।
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <button
                onClick={() => {
                  handleDismissFirstCelebration();
                  onOpenMyKobutor();
                }}
                className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/50 px-2.5 py-1 rounded-full flex items-center gap-1 hover:bg-amber-200 dark:hover:bg-amber-900 transition-all active:scale-95"
              >
                <span>Customize Kobutor</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <button
            onClick={handleDismissFirstCelebration}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 transition-all shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
