import React from 'react';
import { Bell, Sparkles, X, UserCheck, Flame, MessageCircleHeart } from 'lucide-react';
import { liquidAudio } from '../lib/audioSynth';

interface KobutorCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotificationPermission: () => void;
  waitingCount: number;
  maleWaiting: number;
  femaleWaiting: number;
  onFindKobutor: () => void;
  isDarkMode?: boolean;
}

export const KobutorCallModal: React.FC<KobutorCallModalProps> = ({
  isOpen,
  onClose,
  notificationPermission,
  onRequestNotificationPermission,
  waitingCount,
  maleWaiting,
  femaleWaiting,
  onFindKobutor,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-[36px] p-6 border border-slate-200/90 bg-white text-slate-800 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] transition-all">
        {/* Close Button */}
        <button
          onClick={() => {
            liquidAudio.playSubtleBubble();
            onClose();
          }}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-50 border border-slate-100 shadow-xs"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-cyan-100/70 border border-cyan-200 flex items-center justify-center text-cyan-700 animate-liquid-ripple shadow-xs">
            <Bell className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight uppercase font-english">Kobutor Call</h3>
            <p className="text-xs text-slate-500 font-medium">
              Real-time Soul Alerts & Queue Status
            </p>
          </div>
        </div>

        {/* Live Queue Pulse info */}
        <div className="p-4 rounded-2xl border border-cyan-100/80 bg-cyan-50/50 mb-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-english">
              Live Queue Status
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-cyan-700 font-english">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
              REALTIME
            </span>
          </div>

          <p className="text-xs font-semibold text-slate-800 mb-2">
            {waitingCount > 0 ? (
              <>🕊️ {waitingCount} real companion(s) actively searching right now.</>
            ) : (
              <>🕊️ Your Kobutor is ready to connect instantly when called.</>
            )}
          </p>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 font-english">
            <span className="flex items-center gap-1">
              <span className="text-cyan-600 font-bold">♂</span> {maleWaiting} Male
            </span>
            <span className="flex items-center gap-1">
              <span className="text-purple-600 font-bold">♀</span> {femaleWaiting} Female
            </span>
          </div>
        </div>

        {/* Browser Real Notification Permission toggle */}
        <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-800 font-english">
                Companion Arrival Alert
              </p>
              <p className="text-xs text-slate-500 font-medium font-bangla mt-0.5">
                "একজন Kobutor তোমাকে খুঁজছে"
              </p>
            </div>
            {notificationPermission === 'granted' ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-700 font-english">
                ACTIVE
              </span>
            ) : (
              <button
                onClick={onRequestNotificationPermission}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all font-english"
              >
                Enable
              </button>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            onClose();
            onFindKobutor();
          }}
          className="w-full py-3.5 rounded-2xl font-extrabold text-xs tracking-[0.14em] uppercase flex items-center justify-center gap-2 transition-all bg-slate-900 text-white hover:bg-slate-800 shadow-md active:scale-95 font-english"
        >
          <Sparkles className="w-4 h-4" />
          <span>FIND MY KOBUTOR NOW</span>
        </button>
      </div>
    </div>
  );
};
