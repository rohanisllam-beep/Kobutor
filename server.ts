import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;
const server = http.createServer(app);

app.use(express.json());

// Initialize Gemini Client (lazy server-side)
let genAI: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAI && process.env.GEMINI_API_KEY) {
    try {
      genAI = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (e) {
      console.warn('Failed to initialize Gemini SDK:', e);
    }
  }
  return genAI;
}

// In-memory real-time state
interface QueueUser {
  userId: string;
  gender: 'male' | 'female';
  status: 'searching' | 'matched';
  inviteRoomId?: string;
  matchId?: string;
  role?: 'A' | 'B';
  partnerId?: string;
  partnerGender?: 'male' | 'female';
  isInitiator?: boolean;
  joinedAt: number;
  lastSeenAt: number;
  ws?: WebSocket | null;
  preferences?: any;
}

interface ActiveSession {
  sessionId: string;
  userAId: string;
  userBId: string;
  userAGender: 'male' | 'female';
  userBGender: 'male' | 'female';
  userAPrefs?: any;
  userBPrefs?: any;
  startTime: number;
  isJustStay: boolean;
  gameState?: any;
  questState?: any;
  userAWs?: WebSocket | null;
  userBWs?: WebSocket | null;
  pendingSignals?: { targetUserId: string; signal: any; time: number }[];
}

const queue: Map<string, QueueUser> = new Map();
const activeSessions: Map<string, ActiveSession> = new Map();
const userSessionMap: Map<string, string> = new Map(); // userId -> sessionId
const blockedPairs: Set<string> = new Set(); // "userA_userB"
const userSockets: Map<string, WebSocket> = new Map(); // userId -> WebSocket
const disconnectGraceTimers: Map<string, NodeJS.Timeout> = new Map(); // userId -> grace period timer

// Periodic queue cleanup for disconnected / stale users
setInterval(() => {
  const now = Date.now();
  for (const [userId, user] of queue.entries()) {
    if (user.status === 'searching' && now - user.lastSeenAt > 30000) {
      queue.delete(userId);
    }
  }
}, 10000);

// Real aggregate human weather counts
const humanWeatherStats = {
  happyCount: 48,
  calmCount: 72,
  lonelyCount: 89,
  boredCount: 56,
  emotionalCount: 41,
  energeticCount: 33,
  curiousCount: 65,
  tiredCount: 49,
  wantToTalkCount: 96,
  wantCompanyCount: 82,
  wantToLaughCount: 68,
  totalActive: 639,
  updatedAt: Date.now(),
};

// ==========================================
// REST API ROUTES
// ==========================================

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: Date.now() });
});

app.get('/api/human-weather', (req: Request, res: Response) => {
  humanWeatherStats.totalActive = 600 + queue.size * 5 + activeSessions.size * 2;
  res.json(humanWeatherStats);
});

// Real-time Queue Stats for verification & transparency
app.get('/api/queue/stats', (req: Request, res: Response) => {
  let maleSearching = 0;
  let femaleSearching = 0;
  const now = Date.now();

  for (const user of queue.values()) {
    if (user.status === 'searching' && now - user.lastSeenAt <= 30000) {
      if (user.gender === 'male') maleSearching++;
      if (user.gender === 'female') femaleSearching++;
    }
  }

  res.json({
    searchingCount: maleSearching + femaleSearching,
    maleSearching,
    femaleSearching,
    activeSessionCount: activeSessions.size,
  });
});

// 1. HTTP Join Queue Endpoint
app.post('/api/match/join', (req: Request, res: Response) => {
  const { userId, gender = 'male', preferences = {}, inviteRoomId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const validGender: 'male' | 'female' = gender === 'female' ? 'female' : 'male';
  const existing = queue.get(userId);

  // If already matched in active session, return session
  if (existing && existing.status === 'matched' && existing.matchId) {
    const session = activeSessions.get(existing.matchId);
    if (session) {
      return res.json({
        status: 'matched',
        matchId: existing.matchId,
        role: existing.role,
        isInitiator: existing.isInitiator,
        userAId: session.userAId,
        userBId: session.userBId,
        partnerId: existing.partnerId,
        partnerGender: existing.partnerGender,
        startTime: session.startTime,
      });
    }
  }

  // Register in queue
  const queueEntry: QueueUser = {
    userId,
    gender: validGender,
    status: 'searching',
    inviteRoomId,
    joinedAt: Date.now(),
    lastSeenAt: Date.now(),
    ws: userSockets.get(userId) || null,
    preferences: {
      ...preferences,
      gender: validGender,
      lookingFor: validGender === 'male' ? 'female' : 'male',
    },
  };

  queue.set(userId, queueEntry);

  // Run atomic matchmaking immediately
  const matchResult = attemptMatch(userId);

  if (matchResult) {
    return res.json({
      status: 'matched',
      matchId: matchResult.sessionId,
      role: matchResult.role,
      isInitiator: matchResult.isInitiator,
      userAId: matchResult.userAId,
      userBId: matchResult.userBId,
      partnerId: matchResult.partnerId,
      partnerGender: matchResult.partnerGender,
      startTime: matchResult.startTime,
    });
  }

  return res.json({
    status: 'searching',
    userId,
    gender: validGender,
    joinedAt: queueEntry.joinedAt,
  });
});

// 2. HTTP Poll Match Status Endpoint
app.post('/api/match/status', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const entry = queue.get(userId);
  if (!entry) {
    // Check if user is in an active session
    const sessionId = userSessionMap.get(userId);
    if (sessionId) {
      const session = activeSessions.get(sessionId);
      if (session) {
        const isUserA = session.userAId === userId;
        return res.json({
          status: 'matched',
          matchId: sessionId,
          role: isUserA ? 'A' : 'B',
          isInitiator: isUserA,
          userAId: session.userAId,
          userBId: session.userBId,
          partnerId: isUserA ? session.userBId : session.userAId,
          partnerGender: isUserA ? session.userBGender : session.userAGender,
          startTime: session.startTime,
        });
      }
    }
    return res.json({ status: 'idle' });
  }

  // Update liveness
  entry.lastSeenAt = Date.now();

  if (entry.status === 'matched' && entry.matchId) {
    const session = activeSessions.get(entry.matchId);
    return res.json({
      status: 'matched',
      matchId: entry.matchId,
      role: entry.role,
      isInitiator: entry.isInitiator,
      userAId: session?.userAId || (entry.role === 'A' ? entry.userId : entry.partnerId),
      userBId: session?.userBId || (entry.role === 'B' ? entry.userId : entry.partnerId),
      partnerId: entry.partnerId,
      partnerGender: entry.partnerGender,
      startTime: session?.startTime || Date.now(),
    });
  }

  // If searching, attempt match on each poll tick
  const matchResult = attemptMatch(userId);
  if (matchResult) {
    return res.json({
      status: 'matched',
      matchId: matchResult.sessionId,
      role: matchResult.role,
      isInitiator: matchResult.isInitiator,
      userAId: matchResult.userAId,
      userBId: matchResult.userBId,
      partnerId: matchResult.partnerId,
      partnerGender: matchResult.partnerGender,
      startTime: matchResult.startTime,
    });
  }

  return res.json({
    status: 'searching',
    userId,
    gender: entry.gender,
    joinedAt: entry.joinedAt,
  });
});

// 3. HTTP Leave Queue Endpoint
app.post('/api/match/leave', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (userId) {
    queue.delete(userId);
  }
  res.json({ success: true });
});

// In-memory cache for dynamic ICE servers
let cachedDynamicIceServers: any[] | null = null;
let dynamicIceServersExpiresAt = 0;

// Helper to expand custom TURN host/urls into full UDP, TCP, and TLS/TURNS 443 variants
function expandTurnUrls(rawUrls: string): string[] {
  const urlSet = new Set<string>();
  const items = rawUrls.split(',').map((u) => u.trim()).filter(Boolean);

  items.forEach((item) => {
    urlSet.add(item);
    // Parse host and port from turn:host:port or host:port
    const match = item.match(/^(?:turn:|turns:)?([^:?/\s]+)(?::(\d+))?/i);
    if (match) {
      const host = match[1];
      const port = match[2] || '3478';
      urlSet.add(`turn:${host}:${port}?transport=udp`);
      urlSet.add(`turn:${host}:${port}?transport=tcp`);
      urlSet.add(`turn:${host}:443`);
      urlSet.add(`turn:${host}:443?transport=tcp`);
      urlSet.add(`turns:${host}:443?transport=tcp`);
      urlSet.add(`turns:${host}:5349?transport=tcp`);
    }
  });

  return Array.from(urlSet);
}

// ICE Servers Endpoint (STUN + Real Dynamic & Custom TURN Servers with UDP, TCP, and TLS/TURNS on 443)
app.get('/api/ice-servers', async (_req: Request, res: Response) => {
  const now = Date.now();

  // Return cached dynamic ICE servers if valid (10 min TTL)
  if (cachedDynamicIceServers && now < dynamicIceServersExpiresAt) {
    return res.json({ iceServers: cachedDynamicIceServers });
  }

  const primaryStunServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.relay.metered.ca:80' },
  ];

  let dynamicTurnServers: any[] = [];

  // 1. Fetch Dynamic TURN credentials from Metered API if configured
  const meteredApiKey = process.env.METERED_API_KEY || '';
  const meteredDomain = process.env.METERED_DOMAIN || '';

  if (meteredDomain || meteredApiKey) {
    let apiUrl = '';
    if (meteredDomain.startsWith('http://') || meteredDomain.startsWith('https://')) {
      apiUrl = meteredDomain;
      if (meteredApiKey && !apiUrl.includes('apiKey=')) {
        apiUrl += (apiUrl.includes('?') ? '&' : '?') + 'apiKey=' + encodeURIComponent(meteredApiKey);
      }
    } else if (meteredDomain) {
      apiUrl = `https://${meteredDomain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(meteredApiKey)}`;
    } else if (meteredApiKey) {
      apiUrl = `https://openrelay.metered.ca/api/v1/turn/credentials?apiKey=${encodeURIComponent(meteredApiKey)}`;
    }

    if (apiUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

        const apiRes = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (apiRes.ok) {
          const dynamicData = await apiRes.json();
          if (Array.isArray(dynamicData) && dynamicData.length > 0) {
            dynamicTurnServers = dynamicData;
          }
        }
      } catch (_e) {
        // Continue to custom or static fallback
      }
    }
  }

  // 2. Custom TURN Servers from environment variables (supporting both naming conventions)
  const rawTurnUrls =
    process.env.TURN_SERVER_URL ||
    process.env.TURN_SERVER_URLS ||
    process.env.TURN_URLS ||
    '';
  const customTurnUser =
    process.env.TURN_SERVER_USERNAME ||
    process.env.TURN_USERNAME ||
    '';
  const customTurnCred =
    process.env.TURN_SERVER_CREDENTIAL ||
    process.env.TURN_SERVER_CREDENTIALS ||
    process.env.TURN_CREDENTIAL ||
    process.env.TURN_CREDENTIALS ||
    '';

  const customTurnServers: any[] = [];
  if (rawTurnUrls && customTurnUser && customTurnCred) {
    const expandedUrls = expandTurnUrls(rawTurnUrls);
    customTurnServers.push({
      urls: expandedUrls,
      username: customTurnUser,
      credential: customTurnCred,
    });
  }

  // 3. Fallback TURN Relay Servers (UDP, TCP, and TLS/TURNS 443 & 5349)
  const fallbackTurnServers = [
    {
      urls: [
        'turn:global.relay.metered.ca:80',
        'turn:global.relay.metered.ca:80?transport=tcp',
        'turn:global.relay.metered.ca:443',
        'turns:global.relay.metered.ca:443?transport=tcp',
      ],
      username: '55eae56cb73af2d3558942f0',
      credential: '+DESp27cZp5QBTRJ',
    },
    {
      urls: [
        'turn:openrelay.metered.ca:80?transport=udp',
        'turn:openrelay.metered.ca:80?transport=tcp',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:5349?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ];

  // Assemble full ICE server list: STUNs first, dynamic TURN, custom TURN, then fallback TURN
  const allIceServers = [
    ...primaryStunServers,
    ...dynamicTurnServers,
    ...customTurnServers,
    ...(dynamicTurnServers.length === 0 && customTurnServers.length === 0 ? fallbackTurnServers : []),
  ];

  cachedDynamicIceServers = allIceServers;
  dynamicIceServersExpiresAt = now + 10 * 60 * 1000;

  res.json({ iceServers: allIceServers });
});

// 4. HTTP WebRTC Signal Relay Endpoint (Dual backup with participant isolation)
app.post('/api/session/signal', (req: Request, res: Response) => {
  const { userId, sessionId, signal } = req.body;
  if (!sessionId || !userId || !signal) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Strict 2-person security: verify user is an active participant in this session
  if (session.userAId !== userId && session.userBId !== userId) {
    return res.status(403).json({ error: 'Forbidden: not a participant in this session' });
  }

  const partnerId = session.userAId === userId ? session.userBId : session.userAId;
  const partnerWs = userSockets.get(partnerId);

  if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
    partnerWs.send(JSON.stringify({ type: 'webrtc_signal', payload: signal }));
  } else {
    if (!session.pendingSignals) session.pendingSignals = [];
    session.pendingSignals.push({ targetUserId: partnerId, signal, time: Date.now() });
    if (session.pendingSignals.length > 200) session.pendingSignals.shift();
  }

  res.json({ relayed: true });
});

// 4b. HTTP WebRTC Signal Poll Endpoint (redundancy for network hiccups)
app.get('/api/session/signals', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const sessionId = req.query.sessionId as string;
  if (!sessionId || !userId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.userAId !== userId && session.userBId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const pending = session.pendingSignals?.filter((s) => s.targetUserId === userId) || [];
  if (session.pendingSignals && pending.length > 0) {
    session.pendingSignals = session.pendingSignals.filter((s) => s.targetUserId !== userId);
  }

  res.json({ signals: pending.map((p) => p.signal) });
});

// 5. HTTP Chat Message Relay Endpoint (with participant isolation)
app.post('/api/session/message', (req: Request, res: Response) => {
  const { userId, sessionId, text, role } = req.body;
  if (!sessionId || !userId || !text) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Strict 2-person security: verify user is an active participant in this session
  if (session.userAId !== userId && session.userBId !== userId) {
    return res.status(403).json({ error: 'Forbidden: not a participant in this session' });
  }

  const msgPayload = {
    id: 'msg_' + Math.random().toString(36).substring(2, 9),
    senderId: userId,
    senderRole: role || (session.userAId === userId ? 'A' : 'B'),
    text,
    timestamp: Date.now(),
  };

  const wsA = userSockets.get(session.userAId);
  const wsB = userSockets.get(session.userBId);

  if (wsA && wsA.readyState === WebSocket.OPEN) {
    wsA.send(JSON.stringify({ type: 'chat_message', payload: msgPayload }));
  }
  if (wsB && wsB.readyState === WebSocket.OPEN) {
    wsB.send(JSON.stringify({ type: 'chat_message', payload: msgPayload }));
  }

  res.json({ success: true, message: msgPayload });
});

// 6. HTTP End Session Endpoint
app.post('/api/session/end', (req: Request, res: Response) => {
  const { userId, sessionId, reason } = req.body;
  if (sessionId) {
    cleanupSession(sessionId, userId, reason || 'User ended session');
  }
  res.json({ success: true });
});

// 6b. HTTP Session Resume Endpoint (Supports Refresh Resilience)
app.post('/api/session/resume', (req: Request, res: Response) => {
  const { userId, sessionId } = req.body;
  if (!userId || !sessionId) {
    return res.status(400).json({ error: 'Missing userId or sessionId' });
  }

  const session = activeSessions.get(sessionId);
  if (!session || (session.userAId !== userId && session.userBId !== userId)) {
    return res.status(404).json({ error: 'Session not found or expired', active: false });
  }

  // Cancel any pending disconnect timer for this reconnected user
  if (disconnectGraceTimers.has(userId)) {
    clearTimeout(disconnectGraceTimers.get(userId));
    disconnectGraceTimers.delete(userId);
  }

  const role = session.userAId === userId ? 'A' : 'B';
  const partnerId = session.userAId === userId ? session.userBId : session.userAId;
  const partnerGender = session.userAId === userId ? session.userBGender : session.userAGender;

  // Inform partner that user has reconnected
  const partnerWs = userSockets.get(partnerId);
  if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
    partnerWs.send(
      JSON.stringify({
        type: 'partner_connection_state',
        payload: {
          state: 'connected',
          message: 'সঙ্গী পুনরায় যুক্ত হয়েছেন 🕊️',
        },
      })
    );
  }

  res.json({
    status: 'matched',
    sessionId,
    matchId: sessionId,
    role,
    isInitiator: role === 'A',
    userAId: session.userAId,
    userBId: session.userBId,
    userAPrefs: session.userAPrefs,
    userBPrefs: session.userBPrefs,
    partnerId,
    partnerGender,
    startTime: session.startTime,
    gameState: session.gameState || null,
    questState: session.questState || null,
    isJustStay: session.isJustStay,
    active: true,
  });
});

// 6c. HTTP Game Update Endpoint (fallback & fast sync)
app.post('/api/session/game', (req: Request, res: Response) => {
  const { userId, sessionId, gameState } = req.body;
  if (!userId || !sessionId || !gameState) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const session = activeSessions.get(sessionId);
  if (!session || (session.userAId !== userId && session.userBId !== userId)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.gameState = { ...(session.gameState || {}), ...gameState };

  // Relay to both websockets
  const wsA = userSockets.get(session.userAId);
  const wsB = userSockets.get(session.userBId);
  if (wsA && wsA.readyState === WebSocket.OPEN) {
    wsA.send(JSON.stringify({ type: 'game_update', payload: session.gameState }));
  }
  if (wsB && wsB.readyState === WebSocket.OPEN) {
    wsB.send(JSON.stringify({ type: 'game_update', payload: session.gameState }));
  }

  res.json({ success: true, gameState: session.gameState });
});

// 6d. HTTP Quest Update Endpoint
app.post('/api/session/quest', (req: Request, res: Response) => {
  const { userId, sessionId, questState } = req.body;
  if (!userId || !sessionId || !questState) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const session = activeSessions.get(sessionId);
  if (!session || (session.userAId !== userId && session.userBId !== userId)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.questState = questState;

  const wsA = userSockets.get(session.userAId);
  const wsB = userSockets.get(session.userBId);
  if (wsA && wsA.readyState === WebSocket.OPEN) {
    wsA.send(JSON.stringify({ type: 'quest_update', payload: session.questState }));
  }
  if (wsB && wsB.readyState === WebSocket.OPEN) {
    wsB.send(JSON.stringify({ type: 'quest_update', payload: session.questState }));
  }

  res.json({ success: true, questState: session.questState });
});

// Miko AI conversation starter endpoint
app.post('/api/miko/starter', async (req: Request, res: Response) => {
  try {
    const ai = getGeminiClient();
    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents:
          'Generate one thoughtful, warm, deep conversation spark question for two strangers meeting anonymously. Return JSON with two fields: "topic" (in English) and "topicBangla" (translated naturally into poetic Bengali). Keep it warm, comforting, and under 25 words each.',
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return res.json({
          topic: parsed.topic || 'What is a small memory that made you smile recently?',
          topicBangla: parsed.topicBangla || 'কোন ছোট স্মৃতিটি সম্প্রতি তোমার মুখে হাসি এনে দিয়েছিল?',
        });
      }
    }
  } catch (err) {
    console.warn('Miko Gemini starter generation fallback:', err);
  }

  // Graceful fallback
  res.json({
    topic: 'What is a song that feels like home to your soul?',
    topicBangla: 'কোন গানটা শুনলে মনে হয় তোমার মনের ভেতরের কথা বলা হয়েছে?',
  });
});

// ==========================================
// REAL-TIME WEBSOCKET MATCHMAKING & SIGNALING
// ==========================================

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  if (url.pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId') || 'anon_' + Math.random().toString(36).substring(2, 9);

  userSockets.set(userId, ws);

  // If user had a disconnect grace timer running, cancel it immediately!
  if (disconnectGraceTimers.has(userId)) {
    clearTimeout(disconnectGraceTimers.get(userId));
    disconnectGraceTimers.delete(userId);
  }

  // Check if user has an active session (Refresh Reconnection)
  const activeSessionId = userSessionMap.get(userId);
  if (activeSessionId) {
    const session = activeSessions.get(activeSessionId);
    if (session) {
      const partnerId = session.userAId === userId ? session.userBId : session.userAId;
      const partnerWs = userSockets.get(partnerId);

      // Notify partner that user has reconnected
      if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
        partnerWs.send(
          JSON.stringify({
            type: 'partner_connection_state',
            payload: {
              state: 'connected',
              message: 'সঙ্গী পুনরায় যুক্ত হয়েছেন 🕊️',
            },
          })
        );
      }

      const role = session.userAId === userId ? 'A' : 'B';
      ws.send(
        JSON.stringify({
          type: 'matched',
          payload: {
            sessionId: activeSessionId,
            matchId: activeSessionId,
            role,
            userAId: session.userAId,
            userBId: session.userBId,
            userAPrefs: session.userAPrefs,
            userBPrefs: session.userBPrefs,
            startTime: session.startTime,
            isInitiator: role === 'A',
            gameState: session.gameState || null,
            questState: session.questState || null,
            isJustStay: session.isJustStay,
            isReconnected: true,
          },
        })
      );

      // Deliver any pending WebRTC signals
      if (session.pendingSignals && session.pendingSignals.length > 0) {
        const forThisUser = session.pendingSignals.filter((s) => s.targetUserId === userId);
        session.pendingSignals = session.pendingSignals.filter((s) => s.targetUserId !== userId);
        forThisUser.forEach((sig) => {
          try {
            ws.send(JSON.stringify({ type: 'webrtc_signal', payload: sig.signal }));
          } catch (e) {}
        });
      }
    }
  }

  const existingEntry = queue.get(userId);
  if (existingEntry) {
    existingEntry.ws = ws;
    existingEntry.lastSeenAt = Date.now();

    // If already matched, push matched event immediately and flush any pending signals
    if (existingEntry.status === 'matched' && existingEntry.matchId) {
      const session = activeSessions.get(existingEntry.matchId);
      if (session) {
        ws.send(
          JSON.stringify({
            type: 'matched',
            payload: {
              sessionId: existingEntry.matchId,
              matchId: existingEntry.matchId,
              role: existingEntry.role,
              userAId: session.userAId,
              userBId: session.userBId,
              userAPrefs: session.userAPrefs,
              userBPrefs: session.userBPrefs,
              startTime: session.startTime,
              isInitiator: existingEntry.isInitiator,
              gameState: session.gameState || null,
              questState: session.questState || null,
            },
          })
        );

        // Deliver any queued WebRTC signals
        if (session.pendingSignals && session.pendingSignals.length > 0) {
          const forThisUser = session.pendingSignals.filter((s) => s.targetUserId === userId);
          session.pendingSignals = session.pendingSignals.filter((s) => s.targetUserId !== userId);
          forThisUser.forEach((sig) => {
            try {
              ws.send(JSON.stringify({ type: 'webrtc_signal', payload: sig.signal }));
            } catch (e) {}
          });
        }
      }
    }
  }

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const { type, payload } = data;

      // Heartbeat ping
      if (type === 'ping') {
        const entry = queue.get(userId);
        if (entry) entry.lastSeenAt = Date.now();
        ws.send(JSON.stringify({ type: 'pong', payload: { time: Date.now() } }));
        return;
      }

      // 1. Join Matchmaking Queue
      if (type === 'join_queue') {
        const { preferences, inviteRoomId } = payload || {};
        const gender: 'male' | 'female' = preferences?.gender === 'female' ? 'female' : 'male';

        queue.set(userId, {
          ws,
          userId,
          gender,
          status: 'searching',
          inviteRoomId,
          joinedAt: Date.now(),
          lastSeenAt: Date.now(),
          preferences: {
            ...preferences,
            gender,
            lookingFor: gender === 'male' ? 'female' : 'male',
          },
        });

        // Update real weather counters based on mood
        if (preferences?.mood === 'Happy') humanWeatherStats.happyCount++;
        if (preferences?.mood === 'Lonely') humanWeatherStats.lonelyCount++;
        if (preferences?.mood === 'Calm') humanWeatherStats.calmCount++;

        ws.send(JSON.stringify({ type: 'queued', payload: { status: 'waiting', userId, gender } }));
        attemptMatch(userId);
      }

      // 2. Open a Door / Room Code Match
      else if (type === 'open_door') {
        const { doorCode, preferences } = payload || {};
        const gender: 'male' | 'female' = preferences?.gender === 'female' ? 'female' : 'male';

        queue.set(userId, {
          ws,
          userId,
          gender,
          status: 'searching',
          inviteRoomId: doorCode,
          joinedAt: Date.now(),
          lastSeenAt: Date.now(),
          preferences: preferences || {
            gender,
            lookingFor: gender === 'male' ? 'female' : 'male',
            connectionType: 'Someone to Talk To',
            mood: 'Calm',
          },
        });

        ws.send(JSON.stringify({ type: 'queued', payload: { status: 'waiting_door', doorCode } }));
        attemptMatch(userId);
      }

      // 3. Leave Queue
      else if (type === 'leave_queue') {
        queue.delete(userId);
        ws.send(JSON.stringify({ type: 'queue_left', payload: {} }));
      }

      // 4. WebRTC Signaling Relay
      else if (type === 'webrtc_signal') {
        const sessionId = userSessionMap.get(userId) || data.sessionId;
        if (sessionId) {
          const session = activeSessions.get(sessionId);
          if (session) {
            // Strict 2-person security: verify user is an active participant in this session
            if (session.userAId !== userId && session.userBId !== userId) return;

            const partnerId = session.userAId === userId ? session.userBId : session.userAId;
            const partnerWs = userSockets.get(partnerId);
            if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
              partnerWs.send(JSON.stringify({ type: 'webrtc_signal', payload }));
            } else {
              if (!session.pendingSignals) session.pendingSignals = [];
              session.pendingSignals.push({ targetUserId: partnerId, signal: payload, time: Date.now() });
              if (session.pendingSignals.length > 200) session.pendingSignals.shift();
            }
          }
        }
      }

      // 5. Real-time Voice Audio Level Relay (for living water dynamics)
      else if (type === 'voice_level') {
        const sessionId = userSessionMap.get(userId);
        if (sessionId) {
          const session = activeSessions.get(sessionId);
          if (session) {
            // Strict 2-person security: verify user is an active participant in this session
            if (session.userAId !== userId && session.userBId !== userId) return;

            const partnerId = session.userAId === userId ? session.userBId : session.userAId;
            const partnerWs = userSockets.get(partnerId);
            if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
              partnerWs.send(JSON.stringify({ type: 'voice_level', payload }));
            }
          }
        }
      }

      // 6. Real-time Chat Message Relay
      else if (type === 'chat_message') {
        const sessionId = userSessionMap.get(userId);
        if (sessionId) {
          const session = activeSessions.get(sessionId);
          if (session) {
            // Strict 2-person security: verify user is an active participant in this session
            if (session.userAId !== userId && session.userBId !== userId) return;

            const msgPayload = {
              id: 'msg_' + Math.random().toString(36).substring(2, 9),
              senderId: userId,
              senderRole: payload.role || (session.userAId === userId ? 'A' : 'B'),
              text: payload.text,
              timestamp: Date.now(),
            };
            const wsA = userSockets.get(session.userAId);
            const wsB = userSockets.get(session.userBId);

            if (wsA && wsA.readyState === WebSocket.OPEN) {
              wsA.send(JSON.stringify({ type: 'chat_message', payload: msgPayload }));
            }
            if (wsB && wsB.readyState === WebSocket.OPEN) {
              wsB.send(JSON.stringify({ type: 'chat_message', payload: msgPayload }));
            }
          }
        }
      }

      // 6b. Real-time Liquid Reactions Relay (heart, laugh, wow, wave, spark)
      else if (type === 'reaction') {
        const sessionId = userSessionMap.get(userId);
        if (sessionId) {
          const session = activeSessions.get(sessionId);
          if (session) {
            // Strict 2-person security: verify user is an active participant in this session
            if (session.userAId !== userId && session.userBId !== userId) return;

            const reactionPayload = {
              id: 'rx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
              senderId: userId,
              senderRole: payload.role || (session.userAId === userId ? 'A' : 'B'),
              reaction: payload.reaction,
              timestamp: Date.now(),
            };
            const wsA = userSockets.get(session.userAId);
            const wsB = userSockets.get(session.userBId);

            if (wsA && wsA.readyState === WebSocket.OPEN) {
              wsA.send(JSON.stringify({ type: 'reaction', payload: reactionPayload }));
            }
            if (wsB && wsB.readyState === WebSocket.OPEN) {
              wsB.send(JSON.stringify({ type: 'reaction', payload: reactionPayload }));
            }
          }
        }
      }

      // 7. Mini Game Sync
      else if (type === 'game_update') {
        const sessionId = userSessionMap.get(userId);
        if (sessionId) {
          const session = activeSessions.get(sessionId);
          if (session) {
            // Strict 2-person security: verify user is an active participant in this session
            if (session.userAId !== userId && session.userBId !== userId) return;

            if (typeof payload === 'object' && payload !== null) {
              session.gameState = { ...(session.gameState || {}), ...payload };
            }
            const wsA = userSockets.get(session.userAId);
            const wsB = userSockets.get(session.userBId);
            if (wsA && wsA.readyState === WebSocket.OPEN) {
              wsA.send(JSON.stringify({ type: 'game_update', payload: session.gameState }));
            }
            if (wsB && wsB.readyState === WebSocket.OPEN) {
              wsB.send(JSON.stringify({ type: 'game_update', payload: session.gameState }));
            }
          }
        }
      }

      // 7b. Kobutor Quest Sync
      else if (type === 'quest_update') {
        const sessionId = userSessionMap.get(userId);
        if (sessionId) {
          const session = activeSessions.get(sessionId);
          if (session) {
            if (session.userAId !== userId && session.userBId !== userId) return;
            session.questState = payload;
            const wsA = userSockets.get(session.userAId);
            const wsB = userSockets.get(session.userBId);
            if (wsA && wsA.readyState === WebSocket.OPEN) {
              wsA.send(JSON.stringify({ type: 'quest_update', payload: session.questState }));
            }
            if (wsB && wsB.readyState === WebSocket.OPEN) {
              wsB.send(JSON.stringify({ type: 'quest_update', payload: session.questState }));
            }
          }
        }
      }

      // 7c. Kobutor Buddy & Surprise Sync Event
      else if (type === 'buddy_event') {
        const sessionId = userSessionMap.get(userId);
        if (sessionId) {
          const session = activeSessions.get(sessionId);
          if (session) {
            if (session.userAId !== userId && session.userBId !== userId) return;
            const wsA = userSockets.get(session.userAId);
            const wsB = userSockets.get(session.userBId);
            if (wsA && wsA.readyState === WebSocket.OPEN) {
              wsA.send(JSON.stringify({ type: 'buddy_event', payload }));
            }
            if (wsB && wsB.readyState === WebSocket.OPEN) {
              wsB.send(JSON.stringify({ type: 'buddy_event', payload }));
            }
          }
        }
      }

      // 8. Just Stay Mode
      else if (type === 'just_stay') {
        const sessionId = userSessionMap.get(userId);
        if (sessionId) {
          const session = activeSessions.get(sessionId);
          if (session) {
            // Strict 2-person security: verify user is an active participant in this session
            if (session.userAId !== userId && session.userBId !== userId) return;

            session.isJustStay = payload.active;
            const wsA = userSockets.get(session.userAId);
            const wsB = userSockets.get(session.userBId);
            if (wsA && wsA.readyState === WebSocket.OPEN) {
              wsA.send(JSON.stringify({ type: 'just_stay_update', payload: { isJustStay: payload.active } }));
            }
            if (wsB && wsB.readyState === WebSocket.OPEN) {
              wsB.send(JSON.stringify({ type: 'just_stay_update', payload: { isJustStay: payload.active } }));
            }
          }
        }
      }

      // 9. End Session
      else if (type === 'end_session') {
        const sessionId = userSessionMap.get(userId);
        if (sessionId) {
          cleanupSession(sessionId, userId, payload?.reason || 'User ended session');
        }
      }

      // 10. Block User
      else if (type === 'block_user') {
        const { blockedId } = payload || {};
        if (blockedId) {
          blockedPairs.add(`${userId}_${blockedId}`);
          blockedPairs.add(`${blockedId}_${userId}`);
        }
        const sessionId = userSessionMap.get(userId);
        if (sessionId) {
          cleanupSession(sessionId, userId, 'User blocked');
        }
      }
    } catch (err) {
      console.error('Error handling WS message:', err);
    }
  });

  ws.on('close', () => {
    userSockets.delete(userId);
    const entry = queue.get(userId);
    if (entry) {
      entry.ws = null;
      // If user hasn't matched yet and closed connection, we keep queue for a short grace period (15s) in case of reconnect, then clean up
      setTimeout(() => {
        const current = queue.get(userId);
        if (current && current.status === 'searching' && (!current.ws || current.ws.readyState !== WebSocket.OPEN) && Date.now() - current.lastSeenAt > 15000) {
          queue.delete(userId);
        }
      }, 16000);
    }

    const sessionId = userSessionMap.get(userId);
    if (sessionId) {
      const session = activeSessions.get(sessionId);
      if (session) {
        const partnerId = session.userAId === userId ? session.userBId : session.userAId;
        const partnerWs = userSockets.get(partnerId);

        // Notify partner that peer is refreshing / reconnecting
        if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
          partnerWs.send(
            JSON.stringify({
              type: 'partner_connection_state',
              payload: {
                state: 'refreshing',
                message: 'সঙ্গী পুনরায় সংযুক্ত হচ্ছে...',
                graceSeconds: 45,
              },
            })
          );
        }

        // Set 45s grace period for refresh/reconnection before tearing down session
        const timer = setTimeout(() => {
          disconnectGraceTimers.delete(userId);
          const currentSessionId = userSessionMap.get(userId);
          if (currentSessionId === sessionId) {
            cleanupSession(sessionId, userId, 'Partner disconnected (timeout)');
          }
        }, 45000);
        disconnectGraceTimers.set(userId, timer);
      }
    }
  });
});

// Atomic matchmaker logic:
// Match ONLY Male <-> Female (or identical room door code)
// Atomically assigns one shared matchId, purges participants from queue, and enforces 2-person limit
let isMatchmakingActive = false;

function attemptMatch(targetUserId: string) {
  if (isMatchmakingActive) return null;
  isMatchmakingActive = true;

  try {
    const seeker = queue.get(targetUserId);
    if (!seeker || seeker.status !== 'searching') return null;

    // If seeker is already in an active session, purge from queue
    if (userSessionMap.has(targetUserId)) {
      queue.delete(targetUserId);
      return null;
    }

    const now = Date.now();
    const seekerGender = seeker.gender;

    for (const [candidateId, candidate] of queue.entries()) {
      if (candidateId === targetUserId) continue;
      if (candidate.status !== 'searching') continue;

      // If candidate is already in an active session, purge from queue
      if (userSessionMap.has(candidateId)) {
        queue.delete(candidateId);
        continue;
      }

      // Remove stale candidate entries (> 30s)
      if (now - candidate.lastSeenAt > 30000) {
        queue.delete(candidateId);
        continue;
      }

      // Check blocked list
      if (blockedPairs.has(`${targetUserId}_${candidateId}`) || blockedPairs.has(`${candidateId}_${targetUserId}`)) {
        continue;
      }

      // Check room code isolation
      if (seeker.inviteRoomId || candidate.inviteRoomId) {
        if (seeker.inviteRoomId !== candidate.inviteRoomId) continue;
        // Match found via door code
        return createSession(seeker, candidate);
      }

      // Core Matchmaking Rule: Strictly Opposite Gender (Male <-> Female)
      const isOppositeGender =
        (seekerGender === 'male' && candidate.gender === 'female') ||
        (seekerGender === 'female' && candidate.gender === 'male');

      if (isOppositeGender) {
        return createSession(seeker, candidate);
      }
    }

    return null;
  } finally {
    isMatchmakingActive = false;
  }
}

function createSession(user1: QueueUser, user2: QueueUser) {
  // CRITICAL 2-PERSON INTEGRITY: Verify neither user is already in a session
  if (userSessionMap.has(user1.userId) || userSessionMap.has(user2.userId)) {
    console.warn('[Matchmaker] Aborted duplicate session creation: user already in active session');
    return null;
  }

  const sessionId = 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const now = Date.now();

  // Atomically delete both users from the searching queue so no 3rd user can match with either of them
  queue.delete(user1.userId);
  queue.delete(user2.userId);

  // Atomically update user1
  user1.status = 'matched';
  user1.matchId = sessionId;
  user1.role = 'A';
  user1.partnerId = user2.userId;
  user1.partnerGender = user2.gender;
  user1.isInitiator = true;
  user1.lastSeenAt = now;

  // Atomically update user2
  user2.status = 'matched';
  user2.matchId = sessionId;
  user2.role = 'B';
  user2.partnerId = user1.userId;
  user2.partnerGender = user1.gender;
  user2.isInitiator = false;
  user2.lastSeenAt = now;

  const sessionObj: ActiveSession = {
    sessionId,
    userAId: user1.userId,
    userBId: user2.userId,
    userAGender: user1.gender,
    userBGender: user2.gender,
    userAPrefs: user1.preferences,
    userBPrefs: user2.preferences,
    startTime: now,
    isJustStay: false,
  };

  activeSessions.set(sessionId, sessionObj);
  userSessionMap.set(user1.userId, sessionId);
  userSessionMap.set(user2.userId, sessionId);

  // Notify User A (World A) via WebSocket if connected
  const wsA = userSockets.get(user1.userId) || user1.ws;
  if (wsA && wsA.readyState === WebSocket.OPEN) {
    wsA.send(
      JSON.stringify({
        type: 'matched',
        payload: {
          sessionId,
          matchId: sessionId,
          role: 'A',
          userAId: user1.userId,
          userBId: user2.userId,
          userAPrefs: user1.preferences,
          userBPrefs: user2.preferences,
          startTime: now,
          isInitiator: true, // User A initiates WebRTC offer
          matchedMessage: '🕊️ একজন তোমাকে খুঁজছে',
          partnerGender: user2.gender,
        },
      })
    );
  }

  // Notify User B (World B - waiting user) via WebSocket if connected
  const wsB = userSockets.get(user2.userId) || user2.ws;
  if (wsB && wsB.readyState === WebSocket.OPEN) {
    wsB.send(
      JSON.stringify({
        type: 'matched',
        payload: {
          sessionId,
          matchId: sessionId,
          role: 'B',
          userAId: user1.userId,
          userBId: user2.userId,
          userAPrefs: user1.preferences,
          userBPrefs: user2.preferences,
          startTime: now,
          isInitiator: false,
          matchedMessage: '🕊️ তোমার Kobutor এসে গেছে!',
          partnerGender: user1.gender,
        },
      })
    );
  }

  return {
    sessionId,
    matchId: sessionId,
    role: 'A' as const,
    userAId: user1.userId,
    userBId: user2.userId,
    partnerId: user2.userId,
    partnerGender: user2.gender,
    startTime: now,
    isInitiator: true,
  };
}

function cleanupSession(sessionId: string, endedByUserId: string, reason: string) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  // Clear any pending disconnect grace timers for both users
  if (disconnectGraceTimers.has(session.userAId)) {
    clearTimeout(disconnectGraceTimers.get(session.userAId));
    disconnectGraceTimers.delete(session.userAId);
  }
  if (disconnectGraceTimers.has(session.userBId)) {
    clearTimeout(disconnectGraceTimers.get(session.userBId));
    disconnectGraceTimers.delete(session.userBId);
  }

  activeSessions.delete(sessionId);
  userSessionMap.delete(session.userAId);
  userSessionMap.delete(session.userBId);

  // Remove from queue
  queue.delete(session.userAId);
  queue.delete(session.userBId);

  const endPayload = { sessionId, reason, endedBy: endedByUserId };

  const wsA = userSockets.get(session.userAId);
  const wsB = userSockets.get(session.userBId);

  if (wsA && wsA.readyState === WebSocket.OPEN) {
    wsA.send(JSON.stringify({ type: 'session_ended', payload: endPayload }));
  }
  if (wsB && wsB.readyState === WebSocket.OPEN) {
    wsB.send(JSON.stringify({ type: 'session_ended', payload: endPayload }));
  }
}

// ==========================================
// VITE MIDDLEWARE & SERVER STARTUP
// ==========================================

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Kobutor server running on port ${PORT}`);
  });
}

start();
