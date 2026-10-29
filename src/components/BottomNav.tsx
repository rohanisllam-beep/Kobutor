import React from 'react';
import { Compass, Trophy, Settings } from 'lucide-react';
import { liquidAudio } from '../lib/audioSynth';

export type NavTab = 'explore' | 'board' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isDarkMode?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: 'explore', label: 'EXPLORE', icon: Compass },
    { id: 'board', label: 'BOARD', icon: Trophy },
    { id: 'settings', label: 'SETTINGS', icon: Settings },
  ];

  const handleTabClick = (tab: NavTab) => {
    liquidAudio.playSubtleBubble();
    onSelectTab(tab);
  };

  return (
    <div className="relative z-30 w-full px-6 pb-5 pt-1 max-w-md mx-auto">
      <div className="flex items-center justify-around py-2 px-4 rounded-full border border-slate-200/90 bg-white/95 backdrop-blur-xl transition-all shadow-[0_12px_28px_-8px_rgba(15,23,42,0.08)]">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = currentTab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => handleTabClick(t.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-4 py-1 rounded-full transition-all duration-200 ${
                isActive
                  ? 'text-cyan-700 font-black scale-105'
                  : 'text-slate-500 hover:text-slate-800 font-semibold'
              }`}
            >
              {isActive && (
                <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full animate-fade-in" />
              )}
              <Icon className="w-4 h-4 stroke-[2.2]" />
              <span className="text-[10px] uppercase tracking-wider font-bold whitespace-nowrap font-english">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};


