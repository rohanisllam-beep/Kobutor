/**
 * WebSocket & Backend Realtime Client for Kobutor
 * Handles server-side matchmaking queue, peer signaling, chat messages, live interactions, and state sync.
 */

import { ChatMessage, GameState, UserPreferences } from '../types';

export type SocketEventType =
  | 'connected'
  | 'queued'
  | 'matched'
  | 'empty_match'
  | 'partner_disconnected'
  | 'partner_connection_state'
  | 'chat_message'
  | 'reaction'
  | 'voice_level'
  | 'webrtc_signal'
  | 'game_update'
  | 'quest_update'
  | 'just_stay_update'
  | 'session_ended'
  | 'buddy_event';

export type EventHandler = (data: any) => void;

class SocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;
  private matchPollInterval: number | null = null;
  private pendingQueue: Array<{ type: string; payload: any }> = [];
  private lastHandledMatchId: string | null = null;
  public userId: string = '';
  public sessionId: string | null = null;
  public isConnected = false;
  public isSearching = false;

  constructor() {
    this.userId = this.getOrCreateUserId();
  }

  private getOrCreateUserId(): string {
    let id = localStorage.getItem('kobutor_user_id');
    if (!id) {
      id = 'usr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('kobutor_user_id', id);
    }
    return id;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${encodeURIComponent(this.userId)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('connected', { userId: this.userId });
        this.startHeartbeat();
        this.flushPendingQueue();
        this.pollPendingSignals();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'matched') {
            this.handleMatchedPayload(msg.payload);
          } else {
            this.emit(msg.type, msg.payload);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection state:', err);
      };
    } catch (err) {
      console.error('WebSocket init error:', err);
      this.scheduleReconnect();
    }
  }

  private flushPendingQueue() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.pendingQueue.length > 0) {
      const items = [...this.pendingQueue];
      this.pendingQueue = [];
      items.forEach((item) => {
        this.send(item.type, item.payload);
      });
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping', {});
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 2000);
  }

  public on(event: SocketEventType, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in handler for ${event}:`, err);
      }
    });
  }

  public send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type, payload, userId: this.userId, sessionId: this.sessionId }));
      } catch (e) {
        console.warn('WS send failed, queuing:', e);
        this.pendingQueue.push({ type, payload });
      }
    } else {
      this.pendingQueue.push({ type, payload });
      this.connect();
    }
  }

  private handleMatchedPayload(payload: any) {
    if (!payload || !payload.sessionId) return;
    if (this.lastHandledMatchId === payload.sessionId && !payload.isReconnected) return;

    this.lastHandledMatchId = payload.sessionId;
    this.sessionId = payload.sessionId;
    this.isSearching = false;
    this.stopMatchPolling();

    // Cache active session in sessionStorage for seamless refresh restoration
    try {
      sessionStorage.setItem(
        'kobutor_active_session',
        JSON.stringify({
          sessionId: payload.sessionId,
          role: payload.role,
          userAId: payload.userAId,
          userBId: payload.userBId,
          userAPrefs: payload.userAPrefs,
          userBPrefs: payload.userBPrefs,
          startTime: payload.startTime,
          isInitiator: payload.isInitiator,
          savedAt: Date.now(),
        })
      );
    } catch (_e) {}

    this.emit('matched', payload);
    this.pollPendingSignals();
    // Re-check after brief delay in case early offer was stored in buffer
    setTimeout(() => this.pollPendingSignals(), 1000);
  }

  public async resumeSession(sessionId: string): Promise<any | null> {
    this.sessionId = sessionId;
    try {
      const res = await fetch('/api/session/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, sessionId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.active) {
          this.lastHandledMatchId = sessionId;
          this.emit('matched', data);
          return data;
        }
      }
    } catch (e) {
      console.warn('Failed to resume session:', e);
    }
    return null;
  }

  public async pollPendingSignals() {
    if (!this.sessionId || !this.userId) return;
    try {
      const res = await fetch(`/api/session/signals?sessionId=${encodeURIComponent(this.sessionId)}&userId=${encodeURIComponent(this.userId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.signals && Array.isArray(data.signals) && data.signals.length > 0) {
          data.signals.forEach((sig: any) => {
            const signalData = sig.signal !== undefined ? sig.signal : sig;
            this.emit('webrtc_signal', signalData);
          });
        }
      }
    } catch (_e) {}
  }

  private startMatchPolling() {
    this.stopMatchPolling();
    this.matchPollInterval = window.setInterval(async () => {
      if (!this.isSearching) {
        this.stopMatchPolling();
        return;
      }

      try {
        const res = await fetch('/api/match/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: this.userId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'matched') {
            this.handleMatchedPayload(data);
          }
        }
      } catch (e) {
        // Silent poll fallback error
      }
    }, 1200);
  }

  private stopMatchPolling() {
    if (this.matchPollInterval) {
      clearInterval(this.matchPollInterval);
      this.matchPollInterval = null;
    }
  }

  // Real Matchmaking Queue entry
  public async joinQueue(preferences: UserPreferences, inviteRoomId?: string) {
    this.isSearching = true;
    this.lastHandledMatchId = null;

    // 1. Send via WebSocket (with automatic queueing if reconnecting)
    this.send('join_queue', { preferences, inviteRoomId });

    // 2. Immediate HTTP Fast-path
    try {
      const res = await fetch('/api/match/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          gender: preferences.gender,
          preferences,
          inviteRoomId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'matched') {
          this.handleMatchedPayload(data);
          return;
        }
      }
    } catch (e) {
      console.warn('HTTP join fallback error:', e);
    }

    // 3. Start high-frequency background sync timer
    this.startMatchPolling();
  }

  public async leaveQueue() {
    this.isSearching = false;
    this.stopMatchPolling();
    this.send('leave_queue', {});

    try {
      await fetch('/api/match/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId }),
      });
    } catch (e) {}
  }

  public async openDoor(doorCode: string, preferences?: UserPreferences) {
    this.isSearching = true;
    this.lastHandledMatchId = null;

    this.send('open_door', { doorCode, preferences });

    try {
      const res = await fetch('/api/match/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          gender: preferences?.gender || 'male',
          preferences,
          inviteRoomId: doorCode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'matched') {
          this.handleMatchedPayload(data);
          return;
        }
      }
    } catch (e) {}

    this.startMatchPolling();
  }

  // Session interactions
  public sendChatMessage(text: string, role: 'A' | 'B') {
    this.send('chat_message', { text, role, timestamp: Date.now() });

    // Fallback if WS not open
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      fetch('/api/session/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          sessionId: this.sessionId,
          text,
          role,
        }),
      }).catch(() => {});
    }
  }

  public sendReaction(reaction: string, role: 'A' | 'B') {
    this.send('reaction', { reaction, role });
  }

  public sendBuddyEvent(payload: any) {
    this.send('buddy_event', payload);
  }

  public sendGameAction(action: string, payload: any = {}) {
    this.send('game_update', { action, ...payload });
  }

  public sendVoiceLevel(level: number) {
    this.send('voice_level', { level });
  }

  public sendWebRTCSignal(data: any) {
    this.send('webrtc_signal', data);

    // Dual relay fallback
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      fetch('/api/session/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          sessionId: this.sessionId,
          signal: data,
        }),
      }).catch(() => {});
    }
  }

  public sendGameUpdate(gameState: Partial<GameState>) {
    this.send('game_update', gameState);

    // Redundant HTTP sync for 100% reliable state sync
    if (this.sessionId) {
      fetch('/api/session/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          sessionId: this.sessionId,
          gameState,
        }),
      }).catch(() => {});
    }
  }

  public sendQuestUpdate(questState: any) {
    this.send('quest_update', questState);

    if (this.sessionId) {
      fetch('/api/session/quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          sessionId: this.sessionId,
          questState,
        }),
      }).catch(() => {});
    }
  }

  public setJustStay(active: boolean) {
    this.send('just_stay', { active });
  }

  public toggleJustStay(active: boolean) {
    this.send('just_stay', { active });
  }

  public endSession(reason?: string) {
    this.send('end_session', { reason });

    try {
      sessionStorage.removeItem('kobutor_active_session');
    } catch (_e) {}

    if (this.sessionId) {
      fetch('/api/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          sessionId: this.sessionId,
          reason,
        }),
      }).catch(() => {});
    }

    this.sessionId = null;
    this.isSearching = false;
    this.stopMatchPolling();
  }

  public blockUser(blockedId: string) {
    this.send('block_user', { blockedId });
  }

  public reportUser(reportedId: string, reason: string) {
    this.send('report_user', { reportedId, reason });
  }
}

export const socketClient = new SocketClient();
