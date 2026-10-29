import React, { useState, useEffect, useRef } from 'react';
import { HomeView } from './components/HomeView';
import { TwoLiquidWorlds } from './components/TwoLiquidWorlds';
import { OnboardingModal } from './components/OnboardingModal';
import { MatchmakingView } from './components/MatchmakingView';
import { ChatOverlay } from './components/ChatOverlay';
import { MiniGamesModal } from './components/MiniGamesModal';
import { MikoCompanion } from './components/MikoCompanion';
import { PassTheKobutorModal } from './components/PassTheKobutorModal';
import { HumanWeatherView } from './components/HumanWeatherView';
import { InviteShareModal } from './components/InviteShareModal';
import { OpenADoorModal } from './components/OpenADoorModal';
import { SafetyModal } from './components/SafetyModal';
import { SettingsView } from './components/SettingsView';
import { ConnectionsView } from './components/ConnectionsView';
import { PlayView } from './components/PlayView';
import { BottomNav, NavTab } from './components/BottomNav';
import { KobutorCallModal } from './components/KobutorCallModal';
import { MyKobutorModal } from './components/MyKobutorModal';
import { KobutorBoardView } from './components/KobutorBoardView';
import { FeatherRewardBanner } from './components/FeatherRewardBanner';
import { featherSystem } from './lib/featherSystem';

import { socketClient } from './lib/socket';
import { voiceEngine } from './lib/webrtc';
import { liquidAudio } from './lib/audioSynth';
import { ChatMessage, GameState, KobutorMemory, MatchSession, UserPreferences, KobutorQuest } from './types';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // App Navigation & Screen state
  const [currentTab, setCurrentTab] = useState<NavTab>('explore');
  const [viewState, setViewState] = useState<
    'home' | 'matchmaking' | 'connected' | 'weather' | 'settings' | 'connections' | 'play' | 'board'
  >('home');

  // User Preferences
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('kobutor_prefs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      gender: 'male',
      lookingFor: 'female',
      connectionType: 'Someone to Talk To',
      mood: 'Calm',
      interests: ['Music', 'Deep Talks'],
      conversationStyle: 'casual',
      availability: 'now',
    };
  });

  const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('kobutor_onboarded') === 'true';
  });

  // Active Connection Session
  const [session, setSession] = useState<MatchSession | null>(null);
  const [myRole, setMyRole] = useState<'A' | 'B'>('A');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isJustStay, setIsJustStay] = useState<boolean>(false);
  const [lastMemory, setLastMemory] = useState<KobutorMemory | null>(null);

  // Real-time audio intensities (0.0 - 1.0)
  const [localVolume, setLocalVolume] = useState<number>(0);
  const [remoteVolume, setRemoteVolume] = useState<number>(0);

  // Real-time Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Mini Game State & Kobutor Quests
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [questState, setQuestState] = useState<KobutorQuest | null>(null);
  const [partnerStatus, setPartnerStatus] = useState<'connected' | 'refreshing'>('connected');

  // Blocklist
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    const saved = localStorage.getItem('kobutor_blocked');
    return saved ? JSON.parse(saved) : [];
  });

  // Modal States
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isDoorModalOpen, setIsDoorModalOpen] = useState<boolean>(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isMoreOpen, setIsMoreOpen] = useState<boolean>(false);
  const [isMikoOpen, setIsMikoOpen] = useState<boolean>(false);
  const [isPassKobutorOpen, setIsPassKobutorOpen] = useState<boolean>(false);
  const [isKobutorCallOpen, setIsKobutorCallOpen] = useState<boolean>(false);
  const [isMyKobutorOpen, setIsMyKobutorOpen] = useState<boolean>(false);
  const [featherBalance, setFeatherBalance] = useState<number>(() => featherSystem.getState().balance);

  // Subscribe to feather balance updates
  useEffect(() => {
    return featherSystem.subscribe((state) => {
      setFeatherBalance(state.balance);
    });
  }, []);

  // Floating Icon Ripples
  const [activeRipples, setActiveRipples] = useState<{
    kobutorCall?: boolean;
    miko?: boolean;
    weather?: boolean;
    play?: boolean;
    room?: boolean;
    safety?: boolean;
    settings?: boolean;
  }>({});

  // Real Queue statistics
  const [queueStats, setQueueStats] = useState<{
    searchingCount: number;
    maleSearching: number;
    femaleSearching: number;
  }>({
    searchingCount: 0,
    maleSearching: 0,
    femaleSearching: 0,
  });

  // Real Notification permission state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  // In-app matched toast / alert state
  const [matchedToast, setMatchedToast] = useState<{
    text: string;
    subtext?: string;
  } | null>(null);

  // Current direct room code if sharing or entering
  const [roomCode, setRoomCode] = useState<string>('PEARL');

  // Request real browser notification permission
  const handleRequestNotifPermission = async () => {
    if (typeof Notification !== 'undefined') {
      try {
        const perm = await Notification.requestPermission();
        setNotifPermission(perm);
      } catch (e) {
        console.warn('Notification permission error:', e);
      }
    }
  };

  // Trigger real browser notification when match occurs
  const sendRealNotification = (title: string, body: string) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.warn('Notification error:', e);
      }
    }
  };

  // Poll real queue stats periodically for Kobutor Call live pulse
  useEffect(() => {
    const fetchQueueStats = async () => {
      try {
        const res = await fetch('/api/queue/stats');
        if (res.ok) {
          const data = await res.json();
          setQueueStats({
            searchingCount: data.searchingCount || 0,
            maleSearching: data.maleSearching || 0,
            femaleSearching: data.femaleSearching || 0,
          });

          // If someone is waiting in real queue, gently ripple Kobutor Call icon
          if (data.searchingCount > 0) {
            setActiveRipples((prev) => ({ ...prev, kobutorCall: true }));
          } else {
            setActiveRipples((prev) => ({ ...prev, kobutorCall: false }));
          }
        }
      } catch (e) {}
    };

    fetchQueueStats();
    const interval = setInterval(fetchQueueStats, 4000);
    return () => clearInterval(interval);
  }, []);

  // Check URL params for direct door invites (?room=XYZ)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomCode(room.toUpperCase());
      setIsDoorModalOpen(true);
    }
  }, []);

  // Sync preferences to localStorage
  useEffect(() => {
    localStorage.setItem('kobutor_prefs', JSON.stringify(preferences));
  }, [preferences]);

  // 🛡️ REFRESH PROTECTION: Browser warning before leaving/refreshing while active
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (session) {
        const warningMsg = 'তুমি কি সত্যিই Kobutor connection থেকে বের হতে চাও?';
        e.preventDefault();
        e.returnValue = warningMsg;
        return warningMsg;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session]);

  // 🛡️ REFRESH PROTECTION: Auto-restore active session on refresh within grace window
  useEffect(() => {
    const attemptResume = async () => {
      const raw = sessionStorage.getItem('kobutor_active_session');
      if (!raw) return;
      try {
        const cached = JSON.parse(raw);
        if (!cached?.sessionId) return;

        // Check if cached within grace period (60 seconds)
        if (Date.now() - (cached.timestamp || 0) > 60000) {
          sessionStorage.removeItem('kobutor_active_session');
          return;
        }

        console.log('Restoring active session from refresh...', cached.sessionId);
        const res = await socketClient.resumeSession(cached.sessionId);
        if (res.active && res.session) {
          const restored = res.session;
          const restoredRole = cached.role || 'A';
          const newSession: MatchSession = {
            sessionId: restored.sessionId,
            role: restoredRole,
            userAId: restored.userAId,
            userBId: restored.userBId,
            userAPrefs: restored.userAPrefs,
            userBPrefs: restored.userBPrefs,
            startTime: restored.startTime,
            isJustStay: !!restored.isJustStay,
          };
          setSession(newSession);
          setMyRole(restoredRole);
          setViewState('connected');
          setIsJustStay(!!restored.isJustStay);
          if (restored.gameState) setGameState(restored.gameState);
          if (restored.questState) setQuestState(restored.questState);

          liquidAudio.init();
          liquidAudio.playRippleSound();

          setMatchedToast({
            text: '🕊️ সংযোগ পুনরুদ্ধার হয়েছে!',
            subtext: 'আপনার আগের সেশনের সাথে পুনরায় যুক্ত হয়েছে...',
          });
          setTimeout(() => setMatchedToast(null), 4000);

          // Start WebRTC Voice Engine with isInitiator
          await voiceEngine.startLocalAudio(
            (lvl) => {
              setLocalVolume(lvl);
              socketClient.sendVoiceLevel(lvl);
            },
            (signal) => {
              socketClient.sendWebRTCSignal(signal);
            },
            restoredRole === 'A'
          );
        } else {
          sessionStorage.removeItem('kobutor_active_session');
        }
      } catch (err) {
        console.warn('Session resume error:', err);
        sessionStorage.removeItem('kobutor_active_session');
      }
    };

    attemptResume();
  }, []);

  // Unlock continuous ambient sound on first user gesture anywhere
  useEffect(() => {
    const handleFirstGesture = () => {
      liquidAudio.init();
      voiceEngine.unlockAudio();
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture, { passive: true });
    window.addEventListener('touchstart', handleFirstGesture, { passive: true });
    window.addEventListener('click', handleFirstGesture, { passive: true });
    window.addEventListener('keydown', handleFirstGesture, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  // Connect WebSocket on mount & register listeners
  useEffect(() => {
    socketClient.connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        socketClient.connect();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 1. Matched Event
    const unbindMatched = socketClient.on('matched', async (payload: any) => {
      console.log('Connected to companion:', payload);
      liquidAudio.init();
      liquidAudio.playRippleSound();

      // Trigger one elegant liquid pulse on Kobutor Call icon
      setActiveRipples((prev) => ({ ...prev, kobutorCall: true }));
      setTimeout(() => {
        setActiveRipples((prev) => ({ ...prev, kobutorCall: false }));
      }, 3000);

      // Determine match notification messages according to role
      const matchedBannerText =
        payload.role === 'B' ? '🕊️ তোমার Kobutor এসে গেছে!' : '🕊️ একজন তোমাকে খুঁজছে';

      if (payload.isReconnected) {
        setMatchedToast({
          text: '🕊️ সংযোগ পুনরুদ্ধার হয়েছে!',
          subtext: 'আপনার সাথীর সাথে পুনরায় যুক্ত হয়েছে...',
        });
        if (payload.gameState) setGameState(payload.gameState);
        if (payload.questState) setQuestState(payload.questState);
      } else {
        setMatchedToast({
          text: matchedBannerText,
          subtext: 'Starting your direct voice connection...',
        });
        // 🪶 Kobutor Feathers: Reward First Connection (+50 🪶) & Daily Connection (+25 🪶)
        featherSystem.rewardFirstConnection();
        featherSystem.rewardDailyConnection();
      }

      // Also dispatch real browser notification if enabled
      sendRealNotification('Kobutor', 'একজন Kobutor তোমাকে খুঁজছে');

      const newSession: MatchSession = {
        sessionId: payload.sessionId,
        role: payload.role,
        userAId: payload.userAId,
        userBId: payload.userBId,
        userAPrefs: payload.userAPrefs,
        userBPrefs: payload.userBPrefs,
        startTime: payload.startTime,
        isJustStay: false,
      };

      setSession(newSession);
      setMyRole(payload.role);
      setViewState('connected');
      if (!payload.isReconnected) {
        setChatMessages([]);
      }
      setIsJustStay(false);
      setPartnerStatus('connected');

      // Auto clear matched banner after 4 seconds
      setTimeout(() => {
        setMatchedToast(null);
      }, 4000);

      // Start WebRTC Voice Engine with isInitiator configuration
      await voiceEngine.startLocalAudio(
        (lvl) => {
          setLocalVolume(lvl);
          // Broadcast level to partner
          socketClient.sendVoiceLevel(lvl);
        },
        (signal) => {
          socketClient.sendWebRTCSignal(signal);
        },
        !!payload.isInitiator
      );
    });

    // 2. WebRTC Signal Relay
    const unbindSignal = socketClient.on('webrtc_signal', async (signal: any) => {
      await voiceEngine.handleSignal(signal, (outSignal) => {
        socketClient.sendWebRTCSignal(outSignal);
      });
    });

    // 3. Partner Voice Level Update
    const unbindVoice = socketClient.on('voice_level', (payload: any) => {
      if (typeof payload?.level === 'number') {
        setRemoteVolume(payload.level);
      }
    });

    // 4. Chat Message Received
    const unbindChat = socketClient.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    // 5. Game Update Received
    const unbindGame = socketClient.on('game_update', (state: GameState) => {
      setGameState(state);
    });

    // 6. Kobutor Quest Update Received
    const unbindQuest = socketClient.on('quest_update', (quest: KobutorQuest) => {
      setQuestState(quest);
    });

    // 7. Partner Connection State (refreshing vs active)
    const unbindPartnerState = socketClient.on('partner_connection_state', (payload: any) => {
      if (payload?.state === 'refreshing') {
        setPartnerStatus('refreshing');
        liquidAudio.playSubtleBubble(220);
      } else if (payload?.state === 'connected') {
        setPartnerStatus('connected');
        liquidAudio.playSynchronyChime();
      }
    });

    // 8. Just Stay Mode Update
    const unbindJustStay = socketClient.on('just_stay_update', (payload: any) => {
      setIsJustStay(!!payload?.isJustStay);
    });

    // 9. Session Ended
    const unbindEnded = socketClient.on('session_ended', () => {
      sessionStorage.removeItem('kobutor_active_session');
      voiceEngine.stop();
      setSession(null);
      setPartnerStatus('connected');
      // 🪶 Kobutor Feathers: Reward completed connection (+15 🪶)
      featherSystem.rewardCompletedConnection();
      setIsPassKobutorOpen(true); // Open Pass the Kobutor blessing flow
    });

    return () => {
      unbindMatched();
      unbindSignal();
      unbindVoice();
      unbindChat();
      unbindGame();
      unbindQuest();
      unbindPartnerState();
      unbindJustStay();
      unbindEnded();
    };
  }, []);

  // Voice remote level analyzer listener
  useEffect(() => {
    voiceEngine.setRemoteAudioListener((lvl) => {
      setRemoteVolume(lvl);
    });
  }, []);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleStartFinding = (overridePrefs?: UserPreferences) => {
    liquidAudio.init();
    voiceEngine.unlockAudio();
    voiceEngine.ensureMicrophoneReady();
    const activePrefs = overridePrefs || preferences;
    setViewState('matchmaking');
    socketClient.joinQueue(activePrefs);
  };

  const handleNextKobutor = (memory?: KobutorMemory) => {
    sessionStorage.removeItem('kobutor_active_session');
    if (memory) setLastMemory(memory);
    voiceEngine.stop();
    socketClient.endSession('Next Kobutor requested');
    setSession(null);
    setGameState(null);
    setQuestState(null);
    setPartnerStatus('connected');
    liquidAudio.playRippleSound();
    handleStartFinding();
  };

  const handleCompleteOnboarding = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    setHasOnboarded(true);
    localStorage.setItem('kobutor_onboarded', 'true');
    setIsOnboardingOpen(false);

    setViewState('matchmaking');
    socketClient.joinQueue(newPrefs);
  };

  const handleCancelMatchmaking = () => {
    socketClient.leaveQueue();
    setViewState('home');
    setCurrentTab('home');
  };

  const handleEnterDoor = (code: string) => {
    setRoomCode(code);
    setViewState('matchmaking');
    socketClient.openDoor(code, preferences);
  };

  const handleToggleMute = () => {
    const muted = voiceEngine.toggleMute();
    setIsMuted(muted);
    liquidAudio.playSubtleBubble();
  };

  const handleToggleJustStay = () => {
    const next = !isJustStay;
    setIsJustStay(next);
    socketClient.setJustStay(next);
    liquidAudio.playSubtleBubble();
  };

  const handleSendMessage = (text: string) => {
    socketClient.sendChatMessage(text, myRole);
  };

  const handleUpdateGame = (actionOrState: any, maybePayload?: any) => {
    let newState: Partial<GameState>;
    if (typeof actionOrState === 'string') {
      newState = maybePayload || {};
    } else {
      newState = actionOrState || {};
    }
    const merged = { ...(gameState || {}), ...newState } as GameState;
    setGameState(merged);
    socketClient.sendGameUpdate(merged);
  };

  const handleUpdateQuest = (quest: KobutorQuest) => {
    setQuestState(quest);
    socketClient.sendQuestUpdate(quest);
  };

  const handleEndSession = (memory?: KobutorMemory) => {
    sessionStorage.removeItem('kobutor_active_session');
    if (memory) setLastMemory(memory);
    voiceEngine.stop();
    socketClient.endSession('User requested end');
    setSession(null);
    setGameState(null);
    setQuestState(null);
    setPartnerStatus('connected');
    // 🪶 Kobutor Feathers: Reward completed connection (+15 🪶)
    featherSystem.rewardCompletedConnection();
    setIsPassKobutorOpen(true);
  };

  const handleBlockUser = () => {
    sessionStorage.removeItem('kobutor_active_session');
    if (session) {
      const partnerId = myRole === 'A' ? session.userBId : session.userAId;
      const updated = [...blockedUsers, partnerId];
      setBlockedUsers(updated);
      localStorage.setItem('kobutor_blocked', JSON.stringify(updated));
      socketClient.blockUser(partnerId);
    }
    voiceEngine.stop();
    setSession(null);
    setGameState(null);
    setQuestState(null);
    setPartnerStatus('connected');
    setViewState('home');
    setCurrentTab('explore');
  };

  const handleReportUser = (reason: string) => {
    console.log('Reported companion for reason:', reason);
    handleEndSession();
  };

  const handleClearBlocked = () => {
    setBlockedUsers([]);
    localStorage.removeItem('kobutor_blocked');
    liquidAudio.playSubtleBubble();
  };

  const handleTabSelect = (tab: NavTab) => {
    setCurrentTab(tab);
    if (tab === 'explore') setViewState('home');
    else if (tab === 'board') setViewState('board');
    else if (tab === 'settings') setViewState('settings');
  };

  return (
    <main
      className={`relative w-full h-[100dvh] flex items-center justify-center font-sans overflow-hidden transition-colors duration-500 ${
        isDarkMode && viewState !== 'connected' ? 'bg-[#050811]' : 'bg-[#f8fafc]'
      }`}
    >
      {/* Container frame mimicking modern mobile application layout with Artistic Flair */}
      <div
        className={`w-full h-full sm:max-w-[420px] sm:h-[840px] sm:max-h-[96vh] rounded-none sm:rounded-[48px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] relative border-0 sm:border-[8px] flex flex-col justify-between overflow-hidden transition-all ${
          isDarkMode && viewState !== 'connected'
            ? 'bg-[#090d16] border-slate-800/80 shadow-[0_32px_64px_rgba(0,0,0,0.6)]'
            : 'bg-white border-white'
        }`}
      >
        {/* Real-time In-App Notification Toast */}
        {matchedToast && (
          <div className="absolute top-4 inset-x-4 z-50 flex items-center gap-3 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-cyan-400/40 dark:border-cyan-500/40 backdrop-blur-md shadow-lg animate-fade-in">
            <span className="text-xl animate-bounce">🕊️</span>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                {matchedToast.text}
              </p>
              {matchedToast.subtext && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {matchedToast.subtext}
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* ========================================================= */}
        {/* VIEW ROUTING (SINGLE SCREEN LIVING FLUID TRANSITIONS) */}
        {/* ========================================================= */}

        {/* 1. CONNECTED STATE (TWO LIQUID WORLDS) */}
        {viewState === 'connected' && session ? (
          <TwoLiquidWorlds
            session={session}
            myRole={myRole}
            localVolume={localVolume}
            remoteVolume={remoteVolume}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onOpenChat={() => setIsChatOpen(true)}
            onOpenMore={() => setIsMoreOpen(true)}
            onEndSession={handleEndSession}
            chatMessages={chatMessages}
            isJustStay={isJustStay}
            onToggleJustStay={handleToggleJustStay}
            onOpenSafety={() => setIsSafetyModalOpen(true)}
            onNextKobutor={handleNextKobutor}
            isDarkMode={isDarkMode}
            isChatOpen={isChatOpen}
            gameState={gameState}
            onUpdateGame={handleUpdateGame}
            questState={questState}
            onUpdateQuest={handleUpdateQuest}
            partnerStatus={partnerStatus}
          />
        ) : viewState === 'matchmaking' ? (
          /* 2. MATCHMAKING & WAITING STATE */
          <MatchmakingView
            onCancel={handleCancelMatchmaking}
            onOpenDoor={() => setIsDoorModalOpen(true)}
            onShareInvite={() => setIsInviteModalOpen(true)}
            isDarkMode={isDarkMode}
          />
        ) : viewState === 'weather' ? (
          /* 3. HUMAN WEATHER VIEW */
          <HumanWeatherView
            onBack={() => {
              setViewState('home');
              setCurrentTab('explore');
            }}
            onFilterMatch={(mood) => {
              setPreferences((prev) => ({ ...prev, mood: mood as any }));
              handleStartFinding();
            }}
            isDarkMode={isDarkMode}
          />
        ) : viewState === 'settings' ? (
          /* 4. SETTINGS VIEW */
          <SettingsView
            onBack={() => {
              setViewState('home');
              setCurrentTab('explore');
            }}
            preferences={preferences}
            onEditPreferences={() => setIsOnboardingOpen(true)}
            onOpenDoor={() => setIsDoorModalOpen(true)}
            onOpenMyKobutor={() => setIsMyKobutorOpen(true)}
            featherBalance={featherBalance}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            blockedCount={blockedUsers.length}
            onClearBlocked={handleClearBlocked}
          />
        ) : viewState === 'connections' ? (
          /* 5. PAST CONNECTIONS VIEW */
          <ConnectionsView
            onBack={() => {
              setViewState('home');
              setCurrentTab('explore');
            }}
            onFindNew={handleStartFinding}
            isDarkMode={isDarkMode}
          />
        ) : viewState === 'play' ? (
          /* 6. PLAY VIEW */
          <PlayView
            onBack={() => {
              if (session) {
                setViewState('connected');
              } else {
                setViewState('home');
                setCurrentTab('explore');
              }
            }}
            onStartMatch={(gameType) => {
              if (gameType) {
                handleUpdateGame({ type: gameType });
              }
              handleStartFinding();
            }}
            onOpenConnectedGame={(gameType) => {
              handleUpdateGame({ type: gameType });
              setViewState('connected');
              setIsMoreOpen(true);
            }}
            isConnected={!!session}
            isDarkMode={isDarkMode}
          />
        ) : viewState === 'board' ? (
          /* KOBUTOR LEADERBOARD & REPUTATION BOARD */
          <KobutorBoardView
            onBack={() => {
              setViewState('home');
              setCurrentTab('explore');
            }}
            onStartMatch={handleStartFinding}
            isDarkMode={isDarkMode}
          />
        ) : (
          /* 7. FIRST SCREEN / SIGNATURE HOME VIEW (EXACT FLOW) */
          <HomeView
            onSelectGenderAndFind={(selectedGender) => {
              const updatedPrefs: UserPreferences = {
                ...preferences,
                gender: selectedGender,
                lookingFor: selectedGender === 'male' ? 'female' : 'male',
              };
              setPreferences(updatedPrefs);
              handleStartFinding(updatedPrefs);
            }}
            onOpenMiko={() => setIsMikoOpen(true)}
            onOpenPlay={() => {
              setViewState('play');
              setCurrentTab('play');
            }}
            onOpenWeather={() => {
              setViewState('weather');
              setCurrentTab('weather');
            }}
            onOpenRoom={() => setIsDoorModalOpen(true)}
            onOpenSafety={() => setIsSafetyModalOpen(true)}
            onOpenSettings={() => {
              setViewState('settings');
              setCurrentTab('settings');
            }}
            onOpenKobutorCall={() => setIsKobutorCallOpen(true)}
            onOpenMyKobutor={() => setIsMyKobutorOpen(true)}
            featherBalance={featherBalance}
            activeRipples={activeRipples}
            isDarkMode={isDarkMode}
          />
        )}

        {/* BOTTOM NAVIGATION (Visible only when outside connected session) */}
        {viewState !== 'connected' && viewState !== 'matchmaking' && (
          <BottomNav
            currentTab={currentTab}
            onSelectTab={handleTabSelect}
            isDarkMode={isDarkMode}
          />
        )}
      </div>


      {/* ========================================================= */}
      {/* MODALS & OVERLAYS */}
      {/* ========================================================= */}

      {/* 1. Onboarding Questionnaire Modal */}
      {isOnboardingOpen && (
        <OnboardingModal
          initialPrefs={preferences}
          onComplete={handleCompleteOnboarding}
          onCancel={() => setIsOnboardingOpen(false)}
          isDarkMode={isDarkMode}
        />
      )}

      {/* 2. Open a Door / Room Code Modal */}
      <OpenADoorModal
        isOpen={isDoorModalOpen}
        onClose={() => setIsDoorModalOpen(false)}
        onEnterDoor={handleEnterDoor}
        isDarkMode={isDarkMode}
      />

      {/* 3. Viral Invite / Share Modal */}
      <InviteShareModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        inviteCode={roomCode}
        isDarkMode={isDarkMode}
      />

      {/* 4. Realtime Translucent Chat Overlay */}
      <ChatOverlay
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        myRole={myRole}
        onSendMessage={handleSendMessage}
        isDarkMode={isDarkMode}
      />

      {/* 5. Mini Games Modal */}
      <MiniGamesModal
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        gameState={gameState}
        onUpdateGame={handleUpdateGame}
        myRole={myRole}
        isDarkMode={isDarkMode}
      />

      {/* 6. Miko AI Companion */}
      <MikoCompanion
        isOpen={isMikoOpen}
        onClose={() => setIsMikoOpen(false)}
        onSendSuggestionToChat={handleSendMessage}
      />

      {/* 7. Pass The Kobutor Blessing Flow */}
      <PassTheKobutorModal
        isOpen={isPassKobutorOpen}
        onPass={() => {
          setIsPassKobutorOpen(false);
          handleStartFinding();
        }}
        onGoHome={() => {
          setIsPassKobutorOpen(false);
          setViewState('home');
          setCurrentTab('home');
        }}
        onPlayGames={() => {
          setIsPassKobutorOpen(false);
          setViewState('play');
          setCurrentTab('play');
        }}
        isDarkMode={isDarkMode}
        memory={lastMemory}
      />

      {/* 8. Safety, Block & Moderation Modal */}
      <SafetyModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        onBlockUser={handleBlockUser}
        onReportUser={handleReportUser}
        isDarkMode={isDarkMode}
      />

      {/* 9. Kobutor Call Live Status & Notification Modal */}
      <KobutorCallModal
        isOpen={isKobutorCallOpen}
        onClose={() => setIsKobutorCallOpen(false)}
        notificationPermission={notifPermission}
        onRequestNotificationPermission={handleRequestNotifPermission}
        waitingCount={queueStats.searchingCount}
        maleWaiting={queueStats.maleSearching}
        femaleWaiting={queueStats.femaleSearching}
        onFindKobutor={() => {
          setIsKobutorCallOpen(false);
          handleStartFinding();
        }}
        isDarkMode={isDarkMode}
      />

      {/* 10. My Kobutor Wardrobe & Feathers Customization Modal */}
      <MyKobutorModal
        isOpen={isMyKobutorOpen}
        onClose={() => setIsMyKobutorOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* Non-intrusive Floating Feather Reward Banner & Celebration */}
      <FeatherRewardBanner
        onOpenMyKobutor={() => setIsMyKobutorOpen(true)}
        isDarkMode={isDarkMode}
      />
    </main>
  );
}
