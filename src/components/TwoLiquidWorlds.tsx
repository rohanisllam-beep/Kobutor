import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  PhoneOff,
  Shield,
  Moon,
  Heart,
  Gamepad2,
  Sparkles,
  ArrowRight,
  X,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import { ChatMessage, MatchSession, KobutorMemory, GameState, KobutorQuest } from '../types';
import { liquidAudio } from '../lib/audioSynth';
import { voiceEngine, VoiceStatus } from '../lib/webrtc';
import { ConnectingPigeonsCanvas } from './ConnectingPigeonsCanvas';
import { featherSystem } from '../lib/featherSystem';
import { KobutorBuddy } from './KobutorBuddy';
import { KobutorSurpriseModal } from './KobutorSurpriseModal';
import { KobutorQuestOverlay, QUEST_POOL } from './KobutorQuestOverlay';

interface TwoLiquidWorldsProps {
  session: MatchSession;
  myRole: 'A' | 'B';
  localVolume: number;
  remoteVolume: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenChat: () => void;
  onOpenMore?: () => void;
  onEndSession: (memory?: KobutorMemory) => void;
  chatMessages: ChatMessage[];
  isJustStay: boolean;
  onToggleJustStay: () => void;
  onOpenSafety: () => void;
  onNextKobutor?: (memory?: KobutorMemory) => void;
  isDarkMode?: boolean;
  isChatOpen?: boolean;
  gameState?: any;
  onUpdateGame?: (action: string, payload?: any) => void;
  questState?: KobutorQuest | null;
  onUpdateQuest?: (quest: KobutorQuest) => void;
  partnerStatus?: 'connected' | 'refreshing';
}

export const TwoLiquidWorlds: React.FC<TwoLiquidWorldsProps> = ({
  session,
  myRole,
  localVolume,
  remoteVolume,
  isMuted,
  onToggleMute,
  onOpenChat,
  onOpenMore,
  onEndSession,
  chatMessages,
  isJustStay,
  onToggleJustStay,
  onOpenSafety,
  onNextKobutor,
  isDarkMode = false,
  isChatOpen = false,
  gameState,
  onUpdateGame,
  questState,
  onUpdateQuest,
  partnerStatus = 'connected',
}) => {
  // Call duration timer
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);

  // WebRTC Voice states
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>(() => voiceEngine.getVoiceStatus());
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(() => voiceEngine.isSpeakerMuted);

  // Controls auto-fade on idle
  const [areControlsVisible, setAreControlsVisible] = useState<boolean>(true);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Unread message tracking (increments only when chat is closed)
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const lastReadMessageCountRef = useRef<number>(chatMessages.length);

  // Connection entry transition state tied to REAL WebRTC voice connection
  const [introPhase, setIntroPhase] = useState<'connecting' | 'connected' | 'reconnecting' | 'failed'>('connecting');

  // Appreciation token heart toast
  const [showHeartToast, setShowHeartToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Interactive Post-Call Options Dialog (Triggered when End Call is pressed)
  const [isPostCallDialogOpen, setIsPostCallDialogOpen] = useState(false);

  // Rematch state
  const [hasRequestedRematch, setHasRequestedRematch] = useState(false);

  // Kobutor Buddy & Surprise Modal State
  const [isSurpriseModalOpen, setIsSurpriseModalOpen] = useState(false);
  const [activeSurpriseActivity, setActiveSurpriseActivity] = useState<any>(null);
  const [silenceDurationSec, setSilenceDurationSec] = useState(0);

  // Track call timer & silence
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);

      // Silence tracking
      if (localVolume < 0.05 && remoteVolume < 0.05) {
        setSilenceDurationSec((prev) => prev + 1);
      } else {
        setSilenceDurationSec(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [localVolume, remoteVolume]);

  // Subscribe to WebRTC state & speaker
  useEffect(() => {
    const unsubSpk = voiceEngine.onSpeakerChange((isMutedSpk) => {
      setIsSpeakerMuted(isMutedSpk);
    });

    const checkStatus = setInterval(() => {
      const current = voiceEngine.getVoiceStatus();
      setVoiceStatus(current);
      if (current === 'connected') {
        setIntroPhase('connected');
      } else if (current === 'connecting') {
        setIntroPhase('connecting');
      } else if (current === 'reconnecting') {
        setIntroPhase('reconnecting');
      } else if (current === 'failed') {
        setIntroPhase('failed');
      }
    }, 500);

    return () => {
      unsubSpk();
      clearInterval(checkStatus);
    };
  }, []);

  // Handle Controls Idle Auto-Fade (after 3.5s of no interaction)
  const resetIdleTimer = useCallback(() => {
    setAreControlsVisible(true);
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    idleTimeoutRef.current = setTimeout(() => {
      if (!isChatOpen && !isPostCallDialogOpen && !isSurpriseModalOpen) {
        setAreControlsVisible(false);
      }
    }, 3500);
  }, [isChatOpen, isPostCallDialogOpen, isSurpriseModalOpen]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    if (isChatOpen || isPostCallDialogOpen || isSurpriseModalOpen) {
      setAreControlsVisible(true);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    } else {
      resetIdleTimer();
    }
  }, [isChatOpen, isPostCallDialogOpen, isSurpriseModalOpen, resetIdleTimer]);

  // Unread chat badge handling
  useEffect(() => {
    if (isChatOpen) {
      lastReadMessageCountRef.current = chatMessages.length;
      setUnreadCount(0);
    } else {
      const diff = chatMessages.length - lastReadMessageCountRef.current;
      if (diff > 0) {
        setUnreadCount(diff);
      }
    }
  }, [chatMessages.length, isChatOpen]);

  // Speaker toggle handler
  const handleToggleSpeaker = () => {
    resetIdleTimer();
    liquidAudio.playSubtleBubble(260);
    const newSpeakerState = voiceEngine.toggleSpeaker();
    setIsSpeakerMuted(newSpeakerState);
  };

  // Send Feather Token Appreciation (10 🪶)
  const handleSendAppreciation = () => {
    resetIdleTimer();
    const balance = featherSystem.getState().balance;
    if (balance >= 10) {
      featherSystem.earn(-10, 'Appreciation Token', 'প্রশংসা টোকেন পাঠানো');
      liquidAudio.playSynchronyChime();
      setShowHeartToast(true);
      setTimeout(() => setShowHeartToast(false), 2200);
    } else {
      setShowHeartToast(true);
      setTimeout(() => setShowHeartToast(false), 2200);
    }
  };

  // Kobutor Wish Trigger (20 🪶)
  const handleKobutorWish = () => {
    resetIdleTimer();
    const res = featherSystem.makeWish('starlight');
    if (!res.success) {
      liquidAudio.playSubtleBubble(220);
      setToastMessage(res.message);
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }
    setToastMessage('🌠 তারার বৃষ্টি উইশ সক্রিয় হয়েছে!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Rematch request handler (15 🪶)
  const handleRequestRematch = () => {
    const res = featherSystem.requestRematch();
    if (!res.success) {
      liquidAudio.playSubtleBubble(200);
      setToastMessage(res.message);
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }
    setHasRequestedRematch(true);
    setToastMessage('🔄 সঙ্গীর কাছে পুনরায় কথার আমন্ত্রণ পাঠানো হয়েছে!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Format call timer
  const minutes = Math.floor(secondsElapsed / 60);
  const seconds = secondsElapsed % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const currentMemory: KobutorMemory = {
    durationSeconds: secondsElapsed,
    reactionsCount: 1,
    gamesPlayedCount: isSurpriseModalOpen ? 1 : 0,
    messagesCount: chatMessages.length,
    milestonesUnlocked: ['voice_connected'],
  };

  return (
    <div
      onMouseMove={resetIdleTimer}
      onTouchStart={resetIdleTimer}
      onPointerDown={resetIdleTimer}
      className="relative w-full h-full flex flex-col justify-between select-none overflow-hidden bg-[#F8FAFC] text-slate-800 transition-colors duration-300"
    >
      {/* ========================================================= */}
      {/* 1. TOP STATUS BAR (ICONS ONLY, NO REDUNDANT TEXT LABELS) */}
      {/* ========================================================= */}
      <header
        className={`relative z-30 px-5 pt-7 sm:pt-6 pb-2 flex items-center justify-between pointer-events-auto transition-opacity duration-500 ${
          areControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Left: Kobutor Connection Status & Call Duration */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xs">
          <span className="text-xs animate-pulse">🕊️</span>
          <span
            className={`w-2 h-2 rounded-full ${
              voiceStatus === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : voiceStatus === 'connecting'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-bold tracking-tight text-slate-800 font-mono">
            {timeFormatted}
          </span>
        </div>

        {/* Right: Icon-Only Navigation Controls */}
        <div className="flex items-center gap-2">
          {/* Realtime 2-Player Games (Gamepad Icon) */}
          <button
            onClick={() => {
              resetIdleTimer();
              if (onOpenMore) onOpenMore();
            }}
            title="Realtime 2-Player Games & Rapid Fire"
            className="w-8 h-8 rounded-full bg-white/95 hover:bg-cyan-50 border border-cyan-200/90 text-cyan-700 flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-xs"
          >
            <Gamepad2 className="w-4 h-4" />
          </button>

          {/* Kobutor Wish (Wand Icon Only) */}
          <button
            onClick={handleKobutorWish}
            title="Kobutor Wish (20 🪶)"
            className="w-8 h-8 rounded-full bg-white/95 hover:bg-cyan-50 border border-cyan-200/90 text-cyan-700 flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-xs"
          >
            <Wand2 className="w-4 h-4" />
          </button>

          {/* Quick Appreciation Token (Heart Icon Only) */}
          <button
            onClick={handleSendAppreciation}
            title="Send appreciation token (10 🪶)"
            className="w-8 h-8 rounded-full bg-white/95 hover:bg-rose-50 border border-rose-200/90 flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-xs"
          >
            <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
          </button>

          {/* Quiet "Just Stay" Mode Toggle (Moon Icon Only) */}
          <button
            onClick={() => {
              resetIdleTimer();
              onToggleJustStay();
            }}
            title="Just Stay Mode (Quiet Calm Presence)"
            className={`w-8 h-8 rounded-full border backdrop-blur-md flex items-center justify-center transition-all active:scale-95 shadow-xs ${
              isJustStay
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white/95 border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Moon className="w-4 h-4" />
          </button>

          {/* Help / Safety Support (Shield Icon Only) */}
          <button
            onClick={() => {
              resetIdleTimer();
              onOpenSafety();
            }}
            title="Help / Support & Safety"
            className="w-8 h-8 rounded-full bg-white/95 hover:bg-slate-50 border border-slate-200/90 text-slate-600 hover:text-slate-900 flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-xs"
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Partner Refreshing Warning Banner */}
      {partnerStatus === 'refreshing' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-amber-500 text-slate-950 font-bold text-xs shadow-xl flex items-center gap-2 animate-pulse font-bangla border border-amber-300">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>সঙ্গী পেইজ রিফ্রেশ করছে, অপেক্ষা করুন... ⏳ (সংযোগ সংরক্ষিত আছে)</span>
        </div>
      )}

      {/* Kobutor Quest Overlay */}
      {questState && onUpdateQuest && (
        <KobutorQuestOverlay
          quest={questState}
          myRole={myRole}
          onUpdateQuest={onUpdateQuest}
          onDismiss={() => {
            onUpdateQuest({
              ...questState,
              status: 'dismissed',
            });
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Dynamic Toast Notification */}
      {(showHeartToast || toastMessage) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold shadow-xl backdrop-blur-md flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage || '10 🪶 Appreciation Sent! 🕊️'}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MAIN CENTER STAGE: SERENE VOICE & LIVING PIGEON FLIGHT */}
      {/* ========================================================= */}
      <main className="relative flex-1 w-full h-full flex flex-col items-center justify-center px-6 bg-gradient-to-b from-[#F0F9FF] via-[#FFFFFF] to-[#F5F3FF] overflow-hidden">
        {/* Soft Ambient Resonance Aura */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <div
            className="w-80 h-80 rounded-full bg-cyan-200/40 blur-3xl transition-transform duration-300"
            style={{
              transform: `scale(${1 + Math.min(0.6, (localVolume + remoteVolume) * 2)})`,
              opacity: 0.35 + Math.min(0.5, (localVolume + remoteVolume) * 1.8),
            }}
          />
        </div>

        {/* Living Companion Flight Canvas */}
        <ConnectingPigeonsCanvas
          phase="settled"
          localVolume={localVolume}
          remoteVolume={remoteVolume}
          myRole={myRole}
          isJustStay={isJustStay}
          className="w-full max-w-sm h-64 sm:h-80"
        />

        {/* Clean Status & Guidance (Bound to real WebRTC audio state) */}
        <div className="mt-2 text-center z-10">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-bangla">
            {introPhase === 'connecting'
              ? 'ভয়েস সংযোগ হচ্ছে...'
              : introPhase === 'connected'
              ? 'কথা বলুন, মন খুলে 🕊️'
              : introPhase === 'reconnecting'
              ? 'পুনরায় সংযোগ হচ্ছে...'
              : 'সংযোগ বিচ্ছিন্ন • পুনরায় চেষ্টা করা হচ্ছে...'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 font-medium font-bangla">
            {isJustStay ? 'শান্ত নীরবতা • Just Stay' : 'পরিষ্কার ও সুরক্ষিত ভয়েস সংযোগ'}
          </p>
        </div>

        {/* 🕊️ KOBUTOR BUDDY (Cute, liquid pigeon companion) */}
        {voiceStatus === 'connected' && (
          <div className="absolute top-4 right-4 z-20 pointer-events-auto">
            <KobutorBuddy
              phase="settled"
              localVolume={localVolume}
              remoteVolume={remoteVolume}
              silenceDurationSec={silenceDurationSec}
              reactionsCount={chatMessages.length}
              isJustStay={isJustStay}
              onTriggerSurprise={() => {
                liquidAudio.playSynchronyChime();
                setIsSurpriseModalOpen(true);
              }}
              onTriggerSecretQuestion={() => {
                liquidAudio.playSynchronyChime();
                setIsSurpriseModalOpen(true);
              }}
              onTriggerGuessAnswer={() => {
                liquidAudio.playSynchronyChime();
                setIsSurpriseModalOpen(true);
              }}
              onTriggerRapidFire={() => {
                liquidAudio.playSynchronyChime();
                setIsSurpriseModalOpen(true);
              }}
              onTriggerQuestion={() => {
                liquidAudio.playSynchronyChime();
                setIsSurpriseModalOpen(true);
              }}
              onTriggerQuest={() => {
                liquidAudio.playSynchronyChime();
                if (onUpdateQuest) {
                  const firstQuest = QUEST_POOL[Math.floor(Math.random() * QUEST_POOL.length)];
                  onUpdateQuest({
                    id: `quest-${Date.now()}`,
                    titleBangla: firstQuest.titleBangla,
                    descBangla: firstQuest.desc,
                    descEnglish: firstQuest.descEnglish,
                    rewardFeathers: firstQuest.rewardFeathers,
                    rewardXp: firstQuest.rewardXp,
                    status: 'active',
                    completedBy: {},
                    timerSeconds: firstQuest.timerSeconds,
                    startedAt: Date.now(),
                  });
                }
              }}
            />
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* 3. CALL FOOTER CONTROLS (MIC, SPEAKER, CHAT, END CALL) */}
      {/* ========================================================= */}
      <footer
        className={`relative z-30 px-6 pb-8 pt-3 flex items-center justify-center pointer-events-auto transition-opacity duration-500 ${
          areControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-4 p-2 px-4 rounded-full bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
          {/* 1. Microphone Toggle */}
          <button
            onClick={() => {
              resetIdleTimer();
              liquidAudio.playSubtleBubble();
              onToggleMute();
            }}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              isMuted
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* 2. Speaker Toggle */}
          <button
            onClick={handleToggleSpeaker}
            title={isSpeakerMuted ? 'Turn on speaker' : 'Mute speaker'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              isSpeakerMuted
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
            }`}
          >
            {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* 3. Chat Toggle */}
          <button
            onClick={() => {
              resetIdleTimer();
              liquidAudio.playRippleSound();
              onOpenChat();
            }}
            title="Open Chat"
            className="relative w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center justify-center transition-all active:scale-95"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && !isChatOpen && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-600 text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* 4. End Call Button (Triggers Post-Call Interactive Options) */}
          <button
            onClick={() => {
              resetIdleTimer();
              liquidAudio.playRippleSound();
              setIsPostCallDialogOpen(true);
            }}
            title="End Call"
            className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-rose-600/30"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* 4. POST-CALL INTERACTION SHEET (NOT A DIRECT ABRUPT EXIT) */}
      {/* ========================================================= */}
      {isPostCallDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-[32px] p-5 border border-slate-200/90 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] bg-white/95 backdrop-blur-md text-slate-800 flex flex-col justify-between overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🕊️</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-bangla">
                    বিদায়ের আগে আর একটু গল্প?
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Interesting options before leaving
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPostCallDialogOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-700 transition-all active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Interactive Options */}
            <div className="py-3.5 space-y-2">
              {/* Option A: Quick Mini-Game / Surprise */}
              <button
                onClick={() => {
                  liquidAudio.playRippleSound();
                  setIsPostCallDialogOpen(false);
                  setIsSurpriseModalOpen(true);
                }}
                className="w-full p-3 rounded-2xl bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200/80 flex items-center gap-3 text-left transition-all active:scale-98 group"
              >
                <div className="p-2 rounded-xl bg-white text-indigo-600 shadow-xs group-hover:scale-105 transition-transform">
                  <Gamepad2 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-indigo-950 font-bangla">
                    একটি মিনি-গেম খেলি 🎮
                  </h4>
                  <p className="text-[10px] text-indigo-700/80">সিক্রেট প্রশ্ন বা কুইজ দিয়ে জানাশোনা</p>
                </div>
              </button>

              {/* Option B: Rematch Request (15 🪶) */}
              <button
                onClick={() => {
                  liquidAudio.playRippleSound();
                  handleRequestRematch();
                }}
                disabled={hasRequestedRematch}
                className="w-full p-3 rounded-2xl bg-purple-50/80 hover:bg-purple-100/90 border border-purple-200/80 flex items-center gap-3 text-left transition-all active:scale-98 group disabled:opacity-75"
              >
                <div className="p-2 rounded-xl bg-white text-purple-600 shadow-xs group-hover:scale-105 transition-transform">
                  <RefreshCw className={`w-4 h-4 stroke-[2.2] ${hasRequestedRematch ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-purple-950 font-bangla flex items-center gap-1.5">
                    <span>পুনরায় কথা বলি (Rematch)</span>
                    <span className="text-[10px] font-mono font-black text-purple-700">15 🪶</span>
                  </h4>
                  <p className="text-[10px] text-purple-700/80">
                    {hasRequestedRematch ? 'আমন্ত্রণ পাঠানো হয়েছে • সঙ্গী গ্রহণের অপেক্ষায়' : 'উভয়ে রাজি থাকলে পুনরায় সংযোগ'}
                  </p>
                </div>
              </button>

              {/* Option C: Next Kobutor Instant Match */}
              <button
                onClick={() => {
                  liquidAudio.playRippleSound();
                  setIsPostCallDialogOpen(false);
                  if (onNextKobutor) {
                    onNextKobutor(currentMemory);
                  } else {
                    onEndSession(currentMemory);
                  }
                }}
                className="w-full p-3 rounded-2xl bg-cyan-50/80 hover:bg-cyan-100/90 border border-cyan-200/80 flex items-center gap-3 text-left transition-all active:scale-98 group"
              >
                <div className="p-2 rounded-xl bg-white text-cyan-600 shadow-xs group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-cyan-950 font-bangla">
                    পরবর্তী কবুতর খুঁজুন 🕊️
                  </h4>
                  <p className="text-[10px] text-cyan-700/80">অন্য একজন সুন্দর মনের মানুষের সাথে কথা বলুন</p>
                </div>
              </button>

              {/* Option D: Send Appreciation Reaction */}
              <button
                onClick={() => {
                  handleSendAppreciation();
                }}
                className="w-full p-3 rounded-2xl bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200/80 flex items-center gap-3 text-left transition-all active:scale-98 group"
              >
                <div className="p-2 rounded-xl bg-white text-rose-600 shadow-xs group-hover:scale-105 transition-transform">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-rose-950 font-bangla">
                    বিদায় শুভেচ্ছা পাঠান 💖
                  </h4>
                  <p className="text-[10px] text-rose-700/80">১০ পালক ও আন্তরিক শুভেচ্ছা দিন</p>
                </div>
              </button>
            </div>

            {/* Bottom Actions: Stay or Finish Call */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsPostCallDialogOpen(false)}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95"
              >
                থাকুন (Stay)
              </button>
              <button
                onClick={() => {
                  liquidAudio.playSubtleBubble();
                  setIsPostCallDialogOpen(false);
                  onEndSession(currentMemory);
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-rose-600/30"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>কল শেষ করি</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. KOBUTOR SURPRISE & CHALLENGE MODAL */}
      <KobutorSurpriseModal
        isOpen={isSurpriseModalOpen}
        onClose={() => setIsSurpriseModalOpen(false)}
        gameState={gameState || null}
        onUpdateGame={(st) => {
          if (onUpdateGame) onUpdateGame('sync', st);
        }}
        myRole={myRole}
      />
    </div>
  );
};

