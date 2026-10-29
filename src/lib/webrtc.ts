/**
 * WebRTC and Web Audio Voice Engine for Kobutor
 * Provides robust real-time bidirectional peer voice streaming across all mobile devices
 * (Android ↔ Android, Android ↔ iPhone, iPhone ↔ Android) and cellular carrier NATs.
 * Includes complete STUN + TURN relay fallbacks (UDP, TCP, TLS/TURNS on port 443),
 * audio element autoplay unlock, synchronized track negotiation, and real-time audio analysis.
 */

export interface VoiceState {
  hasMicPermission: boolean;
  isMuted: boolean;
  localVolume: number; // 0.0 to 1.0 smoothed
  remoteVolume: number; // 0.0 to 1.0 smoothed
  isConnected: boolean;
  error: string | null;
}

export type SignalCallback = (data: { type: 'offer' | 'answer' | 'candidate'; payload: unknown }) => void;

// Comprehensive STUN and TURN configuration for NAT traversal and Symmetric Cellular NATs
export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  // Primary Public STUN Clusters
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:openrelay.metered.ca:80' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  // Active Metered TURN Relays (UDP, TCP & TLS/TURNS on 80 & 443)
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
  // OpenRelay StaticAuth Cluster (UDP, TCP & TLS/TURNS on 80, 443 & 5349)
  {
    urls: [
      'turn:staticauth.openrelay.metered.ca:80?transport=udp',
      'turn:staticauth.openrelay.metered.ca:80?transport=tcp',
      'turn:staticauth.openrelay.metered.ca:443',
      'turn:staticauth.openrelay.metered.ca:443?transport=tcp',
      'turns:staticauth.openrelay.metered.ca:443?transport=tcp',
      'turns:staticauth.openrelay.metered.ca:5349?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayprojectsecret',
  },
  // OpenRelay Primary Cluster (UDP, TCP & TLS/TURNS on 443 & 5349)
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
  // Global Metered TURN Relays
  {
    urls: [
      'turn:global.relay.metered.ca:80?transport=udp',
      'turn:global.relay.metered.ca:80?transport=tcp',
      'turn:global.relay.metered.ca:443',
      'turn:global.relay.metered.ca:443?transport=tcp',
      'turns:global.relay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  // Standard Metered TURN Relays
  {
    urls: [
      'turn:relay.metered.ca:80?transport=udp',
      'turn:relay.metered.ca:80?transport=tcp',
      'turn:relay.metered.ca:443',
      'turn:relay.metered.ca:443?transport=tcp',
      'turns:relay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'disconnected';

class VoiceEngine {
  private localStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private audioCtx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalyser: AnalyserNode | null = null;
  private localDataArray: Uint8Array | null = null;
  private remoteDataArray: Uint8Array | null = null;
  private sendSignal: SignalCallback | null = null;
  private queuedOutgoingCandidates: Array<{ type: 'candidate'; payload: unknown }> = [];
  private lastIceRestartTime = 0;
  private nonInitiatorRestartTimer: number | null = null;
  private animFrameId: number | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private isAudioUnlocked = false;
  private micInitPromise: Promise<boolean> | null = null;
  private statsInterval: number | null = null;
  private isNegotiating = false;
  private isInitiator = false;
  private iceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS;
  private disconnectTimeout: number | null = null;
  private currentVoiceStatus: VoiceStatus = 'idle';
  private statusListeners = new Set<(status: VoiceStatus, diagnostics: typeof this.diagnostics) => void>();

  public onStatusChange(callback: (status: VoiceStatus, diagnostics: typeof this.diagnostics) => void) {
    this.statusListeners.add(callback);
    callback(this.currentVoiceStatus, this.diagnostics);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public getVoiceStatus(): VoiceStatus {
    return this.currentVoiceStatus;
  }

  private setVoiceStatus(status: VoiceStatus) {
    if (this.currentVoiceStatus !== status) {
      this.currentVoiceStatus = status;
      this.diagnostics.connectionState = status;
      this.statusListeners.forEach((cb) => {
        try {
          cb(status, this.diagnostics);
        } catch (e) {}
      });
    }
  }

  // Diagnostics milestone triggers (logged once per state transition)
  private hasLoggedLocalAudio = false;
  private hasLoggedRemoteTrack = false;
  private hasLoggedIceConnected = false;
  private hasLoggedTurnRelay = false;
  private hasLoggedRemotePlaying = false;
  private hasLoggedAudioFlow = false;

  // Real-time diagnostics snapshot
  public diagnostics = {
    // 5 Core Milestones
    localAudioDetected: false,
    remoteAudioTrackReceived: false,
    iceConnected: false,
    turnRelayConnected: false,
    remoteAudioPlaying: false,

    // Bi-directional Audio Flow Verification
    audioBytesSent: 0,
    audioBytesReceived: 0,
    audioPacketsSent: 0,
    audioPacketsReceived: 0,
    audioFlowVerified: false,

    // Detailed Networking & Audio State
    micReadyState: 'not_requested',
    micTrackEnabled: false,
    micTrackId: 'none',
    connectionState: 'idle',
    iceConnectionState: 'idle',
    iceGatheringState: 'idle',
    signalingState: 'idle',
    remoteTrackKind: 'none',
    remoteTrackReadyState: 'none',
    remoteTrackId: 'none',
    remoteAudioElementAttached: false,
    remoteAudioElementHasSrc: false,
    remoteAudioElementMuted: false,
    remoteAudioElementVolume: 1.0,
    audioPlaybackStatus: 'idle',
    lastPlaybackError: null as string | null,
    selectedCandidatePair: null as any,
    turnRelayActive: false,
    senders: [] as string[],
    receivers: [] as string[],
    lastEvent: 'initialized',
  };

  public localVolume = 0;
  public remoteVolume = 0;
  public isMuted = false;
  public isCameraActive = false;
  public isSpeakerMuted = false;
  public localVideoStream: MediaStream | null = null;
  public remoteVideoStream: MediaStream | null = null;
  public isConnected = false;
  public onVolumeUpdate?: (local: number, remote: number) => void;

  private localVideoListeners = new Set<(stream: MediaStream | null) => void>();
  private remoteVideoListeners = new Set<(stream: MediaStream | null) => void>();
  private cameraListeners = new Set<(isOn: boolean) => void>();
  private speakerListeners = new Set<(isMuted: boolean) => void>();

  public onLocalVideoChange(cb: (stream: MediaStream | null) => void) {
    this.localVideoListeners.add(cb);
    cb(this.localVideoStream);
    return () => this.localVideoListeners.delete(cb);
  }

  public onRemoteVideoChange(cb: (stream: MediaStream | null) => void) {
    this.remoteVideoListeners.add(cb);
    cb(this.remoteVideoStream);
    return () => this.remoteVideoListeners.delete(cb);
  }

  public onCameraChange(cb: (isOn: boolean) => void) {
    this.cameraListeners.add(cb);
    cb(this.isCameraActive);
    return () => this.cameraListeners.delete(cb);
  }

  public onSpeakerChange(cb: (isMuted: boolean) => void) {
    this.speakerListeners.add(cb);
    cb(this.isSpeakerMuted);
    return () => this.speakerListeners.delete(cb);
  }

  private notifyLocalVideoListeners(stream: MediaStream | null) {
    this.localVideoListeners.forEach((cb) => {
      try { cb(stream); } catch (e) {}
    });
  }

  private notifyRemoteVideoListeners(stream: MediaStream | null) {
    this.remoteVideoListeners.forEach((cb) => {
      try { cb(stream); } catch (e) {}
    });
  }

  private notifyCameraListeners(isOn: boolean) {
    this.cameraListeners.forEach((cb) => {
      try { cb(isOn); } catch (e) {}
    });
  }

  private notifySpeakerListeners(isMuted: boolean) {
    this.speakerListeners.forEach((cb) => {
      try { cb(isMuted); } catch (e) {}
    });
  }

  constructor() {
    // Expose diagnostics globally for testing
    if (typeof window !== 'undefined') {
      (window as any).__kobutorVoice = this;
      (window as any).getKobutorVoiceDiagnostics = () => this.getDiagnostics();

      // Listen for visibility changes to resume suspended audio on mobile
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.resumeAudioContextAndPlayback();
        }
      });

      // User gesture resume listeners for mobile audio unlock
      const resumeAudio = () => this.resumeAudioContextAndPlayback();
      window.addEventListener('click', resumeAudio, { passive: true });
      window.addEventListener('touchstart', resumeAudio, { passive: true });
      window.addEventListener('pointerdown', resumeAudio, { passive: true });

      // Network change listeners for seamless Wi-Fi <-> Cellular handoff
      window.addEventListener('online', () => {
        this.handleNetworkChange('online');
      });
      window.addEventListener('offline', () => {
        this.handleNetworkChange('offline');
      });
      if ('connection' in navigator) {
        try {
          (navigator as any).connection?.addEventListener('change', () => {
            this.handleNetworkChange('connection-type-changed');
          });
        } catch (e) {}
      }

      // Fetch dynamic ICE servers from server in background
      this.ensureIceServersReady();
    }
  }

  private iceServersPromise: Promise<void> | null = null;

  public ensureIceServersReady(): Promise<void> {
    if (!this.iceServersPromise) {
      this.iceServersPromise = this.fetchIceServers();
    }
    return this.iceServersPromise;
  }

  private async fetchIceServers() {
    try {
      const res = await fetch('/api/ice-servers');
      if (res.ok) {
        const data = await res.json();
        if (data.iceServers && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
          this.iceServers = data.iceServers;
          this.log('Dynamic ICE servers loaded from server', { count: data.iceServers.length });
        }
      }
    } catch (e) {
      this.log('Using default verified ICE servers configuration');
    }
  }

  private flushOutgoingCandidates() {
    if (this.sendSignal && this.queuedOutgoingCandidates.length > 0) {
      const queued = [...this.queuedOutgoingCandidates];
      this.queuedOutgoingCandidates = [];
      queued.forEach((cand) => {
        try {
          this.sendSignal!(cand);
        } catch (e) {}
      });
    }
  }

  private log(message: string, data?: unknown) {
    this.diagnostics.lastEvent = message;
    const formatted = message.startsWith('[KOBUTOR VOICE]') ? message : `[KOBUTOR VOICE] ${message}`;
    if (data !== undefined) {
      console.log(`%c${formatted}`, 'color: #0284c7; font-weight: 500', data);
    } else {
      console.log(`%c${formatted}`, 'color: #0284c7; font-weight: 500');
    }
  }

  /**
   * Log high-visibility diagnostic banner for the 5 key milestones
   */
  private logDiagnosticMilestone(
    milestone: 'LOCAL AUDIO DETECTED' | 'REMOTE AUDIO TRACK RECEIVED' | 'ICE CONNECTED' | 'TURN RELAY CONNECTED' | 'REMOTE AUDIO PLAYING',
    details: string
  ) {
    console.log(
      `%c\n=======================================================\n🕊️ [KOBUTOR DIAGNOSTIC] ${milestone}\n${details}\n=======================================================\n`,
      'color: #059669; font-weight: bold; background: #ecfdf5; padding: 4px; border: 1px solid #10b981; border-radius: 4px;'
    );
  }

  /**
   * Resume AudioContext and remote audio element when mobile screen unlocks / tab refocuses
   */
  public resumeAudioContextAndPlayback() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch((e) => this.log('AudioContext resume on focus notice:', e));
    }
    if (this.remoteAudioElement && this.remoteAudioElement.srcObject && this.remoteAudioElement.paused) {
      this.remoteAudioElement.play().then(() => {
        this.diagnostics.remoteAudioPlaying = true;
        this.diagnostics.audioPlaybackStatus = 'playing';
      }).catch(() => {});
    }
  }

  /**
   * Unlock AudioContext and Audio Element on initial user gesture (required for mobile iOS & Android)
   */
  public unlockAudio() {
    if (this.isAudioUnlocked) return;
    try {
      this.getOrCreateAudioContext();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch((e) => this.log('AudioContext resume notice:', e));
      }
      const el = this.ensureRemoteAudioElement();

      // Mobile Safari / Chrome audio priming with silent wave snippet using a separate detached Audio element
      // to avoid resetting, pausing, or conflicting with the persistent remote WebRTC audio stream
      try {
        const silentPrimer = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        silentPrimer.play().catch(() => {});
      } catch (_e) {}

      // Ensure remote element is unmuted, at full volume, and plays if stream is already attached
      el.muted = false;
      el.volume = 1.0;
      if (el.srcObject && el.paused) {
        el.play().catch(() => {});
      }

      this.isAudioUnlocked = true;
      this.log('Audio unlocked via user gesture');
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
  }

  private getOrCreateAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    return this.audioCtx;
  }

  /**
   * Ensure a single, persistent <audio> element is in the DOM for remote playback
   */
  private ensureRemoteAudioElement(): HTMLAudioElement {
    if (!this.remoteAudioElement) {
      let el = document.getElementById('kobutor-remote-audio') as HTMLAudioElement | null;
      if (!el) {
        el = document.createElement('audio');
        el.id = 'kobutor-remote-audio';
        el.setAttribute('playsinline', 'true');
        el.setAttribute('webkit-playsinline', 'true');
        el.autoplay = true;
        el.style.position = 'fixed';
        el.style.top = '-9999px';
        el.style.left = '-9999px';
        el.style.width = '1px';
        el.style.height = '1px';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        document.body.appendChild(el);
      }
      el.volume = 1.0;
      el.muted = false;
      this.remoteAudioElement = el;
      this.diagnostics.remoteAudioElementAttached = true;
      this.diagnostics.remoteAudioElementVolume = el.volume;
      this.diagnostics.remoteAudioElementMuted = el.muted;
    }
    return this.remoteAudioElement;
  }

  /**
   * Acquires local microphone with echo cancellation and attaches it to Web Audio analyser
   */
  public async ensureMicrophoneReady(): Promise<boolean> {
    if (this.localStream && this.localStream.getAudioTracks().length > 0) {
      const activeTrack = this.localStream.getAudioTracks()[0];
      if (activeTrack && activeTrack.readyState === 'live') {
        return true;
      }
    }

    if (this.micInitPromise) {
      return this.micInitPromise;
    }

    this.micInitPromise = (async () => {
      try {
        this.unlockAudio();
        const ctx = this.getOrCreateAudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }

        this.log('Requesting microphone access with echo cancellation & noise suppression...');
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000,
          },
          video: false,
        });

        const tracks = this.localStream.getAudioTracks();
        if (tracks.length > 0) {
          const track = tracks[0];
          this.diagnostics.micReadyState = track.readyState;
          this.diagnostics.micTrackEnabled = track.enabled;
          this.diagnostics.micTrackId = track.id;
          this.log(`Microphone track acquired: readyState=${track.readyState}, enabled=${track.enabled}, id=${track.id}`);
        }

        // Attach local stream to Web Audio Analyser (isolated, non-looping)
        if (ctx && this.localStream) {
          try {
            const source = ctx.createMediaStreamSource(this.localStream);
            this.localAnalyser = ctx.createAnalyser();
            this.localAnalyser.fftSize = 256;
            this.localAnalyser.smoothingTimeConstant = 0.8;
            this.localDataArray = new Uint8Array(this.localAnalyser.frequencyBinCount);
            source.connect(this.localAnalyser);
          } catch (e) {
            console.warn('Local analyser notice:', e);
          }
        }

        // Attach tracks to existing peer connection if one exists
        this.attachLocalTracksToPeer();
        this.startAudioLoop();
        return true;
      } catch (err) {
        this.log('Microphone error or permission denied:', err);
        this.diagnostics.micReadyState = 'error_or_denied';
        return false;
      } finally {
        this.micInitPromise = null;
      }
    })();

    return this.micInitPromise;
  }

  private attachLocalTracksToPeer() {
    if (!this.peerConnection || !this.localStream) return;

    try {
      const audioTracks = this.localStream.getAudioTracks().filter((t) => t.readyState === 'live');
      if (audioTracks.length === 0) return;

      const track = audioTracks[0];
      const transceivers = this.peerConnection.getTransceivers();
      const audioTransceiver = transceivers.find((t) => {
        return (
          (t.sender && t.sender.track?.kind === 'audio') ||
          (t.receiver && t.receiver.track?.kind === 'audio') ||
          t.direction === 'recvonly' ||
          t.direction === 'sendrecv' ||
          t.mid !== null
        );
      });

      if (audioTransceiver) {
        // Enforce sendrecv direction so browser creates bidirectional audio m-line
        if (audioTransceiver.direction !== 'sendrecv') {
          audioTransceiver.direction = 'sendrecv';
          this.log('Configured audio transceiver direction to sendrecv');
        }
        if (audioTransceiver.sender) {
          if (audioTransceiver.sender.track?.id !== track.id) {
            audioTransceiver.sender.replaceTrack(track).then(() => {
              this.log(`Replaced audio track on transceiver sender (track ${track.id})`);
            }).catch((e) => {
              this.log('replaceTrack notice:', e);
            });
          }
        }
      } else {
        // Fallback: check senders or addTrack
        const senders = this.peerConnection.getSenders();
        const existingAudioSender = senders.find((s) => s.track?.kind === 'audio');
        if (existingAudioSender) {
          existingAudioSender.replaceTrack(track).then(() => {
            this.log(`Replaced audio track on sender (track ${track.id})`);
          }).catch((e) => {
            this.log('replaceTrack notice:', e);
          });
        } else {
          try {
            this.peerConnection.addTrack(track, this.localStream);
            this.log(`Added audio track to peer connection (track ${track.id})`);
          } catch (e) {
            this.log('addTrack notice:', e);
          }
        }
      }

      // Configure Opus codec preferences if supported
      this.configureCodecPreferences(this.peerConnection);
      this.updateSendersReceiversDiagnostics();
    } catch (err) {
      console.warn('Error attaching local tracks to peer:', err);
    }
  }

  private configureCodecPreferences(pc: RTCPeerConnection) {
    try {
      if ('setCodecPreferences' in RTCRtpTransceiver.prototype && 'getCapabilities' in RTCRtpReceiver) {
        const capabilities = RTCRtpReceiver.getCapabilities('audio');
        if (capabilities && capabilities.codecs) {
          const opusCodecs = capabilities.codecs.filter((c) => c.mimeType.toLowerCase() === 'audio/opus');
          const otherCodecs = capabilities.codecs.filter((c) => c.mimeType.toLowerCase() !== 'audio/opus');
          const prioritized = [...opusCodecs, ...otherCodecs];

          pc.getTransceivers().forEach((transceiver) => {
            if (transceiver.receiver && transceiver.receiver.track && transceiver.receiver.track.kind === 'audio') {
              try {
                transceiver.setCodecPreferences(prioritized);
              } catch (e) {}
            }
          });
        }
      }
    } catch (e) {}
  }

  /**
   * Optimize SDP for Opus audio quality, inband forward error correction (FEC) and DTX
   */
  private optimizeSDP(sdp: string): string {
    let optimized = sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, params) => {
      if (params.includes('minptime') || params.includes('useinbandfec') || params.includes('opus')) {
        return `a=fmtp:${pt} ${params};useinbandfec=1;usedtx=1;maxaveragebitrate=64000`;
      }
      return match;
    });

    // Ensure audio section is sendrecv if local audio track is live
    if (this.localStream && this.localStream.getAudioTracks().some((t) => t.readyState === 'live')) {
      optimized = optimized.replace(/\r\na=recvonly\r\n/g, '\r\na=sendrecv\r\n');
      optimized = optimized.replace(/\r\na=inactive\r\n/g, '\r\na=sendrecv\r\n');
    }

    return optimized;
  }

  /**
   * Start local audio and initialize RTCPeerConnection with tracks attached
   */
  public async startLocalAudio(
    onLocalVolume: (lvl: number) => void,
    sendSignalFn: SignalCallback,
    isInitiator = false
  ): Promise<boolean> {
    this.sendSignal = sendSignalFn;
    this.isInitiator = isInitiator;
    this.onVolumeUpdate = (local, _remote) => {
      onLocalVolume(local);
    };

    this.log(`Starting local audio session (isInitiator=${isInitiator})`);

    // Reset milestone log flags for new session
    this.hasLoggedLocalAudio = false;
    this.hasLoggedRemoteTrack = false;
    this.hasLoggedIceConnected = false;
    this.hasLoggedTurnRelay = false;
    this.hasLoggedRemotePlaying = false;

    // 1. Ensure ICE servers are loaded and ready before creating RTCPeerConnection
    await this.ensureIceServersReady();

    // 2. Ensure microphone stream is ready FIRST so tracks can be attached before offer/answer creation
    const hasMic = await this.ensureMicrophoneReady();

    // 3. Initialize RTCPeerConnection
    this.initPeerConnection(sendSignalFn, isInitiator);

    return hasMic;
  }

  /**
   * Initialize RTCPeerConnection with STUN + TURN servers and full diagnostic event handlers
   */
  public initPeerConnection(sendSignalFn: SignalCallback, isInitiator: boolean) {
    this.sendSignal = sendSignalFn;
    this.isInitiator = isInitiator;
    this.flushOutgoingCandidates();

    // If active peer connection exists in stable state, ensure tracks are attached and return
    if (
      this.peerConnection &&
      this.peerConnection.connectionState !== 'closed' &&
      this.peerConnection.connectionState !== 'failed' &&
      this.peerConnection.iceConnectionState !== 'failed'
    ) {
      this.attachLocalTracksToPeer();
      if (isInitiator && this.peerConnection.signalingState === 'stable') {
        this.createOffer();
      }
      return;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {}
    }

    const config: RTCConfiguration = {
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    };

    this.log('[KOBUTOR VOICE] Creating peer connection', {
      iceServersCount: this.iceServers.length,
      isInitiator,
    });
    const pc = new RTCPeerConnection(config);
    this.peerConnection = pc;
    this.setVoiceStatus('connecting');

    // Ensure audio transceiver is configured as sendrecv and tracks attached
    if (this.localStream && this.localStream.getAudioTracks().length > 0) {
      this.localStream.getAudioTracks().forEach((track) => {
        try {
          pc.addTrack(track, this.localStream!);
          this.log(`Attached track ${track.id} during peer initialization`);
        } catch (e) {
          this.log('Initial addTrack notice:', e);
        }
      });
    } else {
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
        this.log('Added default audio sendrecv transceiver');
      } catch (e) {
        this.log('addTransceiver notice:', e);
      }
    }

    this.configureCodecPreferences(pc);

    // --- 1. REMOTE TRACK RECEIVED (Milestone 2) ---
    pc.ontrack = (event) => {
      this.log('WebRTC ontrack received remote media track:', {
        kind: event.track.kind,
        id: event.track.id,
        readyState: event.track.readyState,
        enabled: event.track.enabled,
        streams: event.streams.length,
      });

      if (event.track.kind === 'audio') {
        this.diagnostics.remoteAudioTrackReceived = true;
        this.diagnostics.remoteTrackKind = event.track.kind;
        this.diagnostics.remoteTrackReadyState = event.track.readyState;
        this.diagnostics.remoteTrackId = event.track.id;

        if (!this.hasLoggedRemoteTrack) {
          this.hasLoggedRemoteTrack = true;
          this.logDiagnosticMilestone(
            'REMOTE AUDIO TRACK RECEIVED',
            `Track Kind: ${event.track.kind} | ID: ${event.track.id} | ReadyState: ${event.track.readyState} | Enabled: ${event.track.enabled}`
          );
        }

        let remoteStream = event.streams && event.streams[0];
        if (!remoteStream) {
          remoteStream = new MediaStream([event.track]);
        }

        this.setupRemoteAudio(remoteStream);
      } else if (event.track.kind === 'video') {
        this.log('[KOBUTOR VIDEO] Remote video track received', {
          id: event.track.id,
          readyState: event.track.readyState,
          enabled: event.track.enabled,
        });

        let remoteVideoStream = event.streams && event.streams[0];
        if (!remoteVideoStream) {
          remoteVideoStream = new MediaStream([event.track]);
        }

        this.remoteVideoStream = remoteVideoStream;
        event.track.onended = () => {
          this.log('[KOBUTOR VIDEO] Remote video track ended');
          if (this.remoteVideoStream) {
            this.remoteVideoStream = null;
            this.notifyRemoteVideoListeners(null);
          }
        };

        event.track.onmute = () => {
          this.log('[KOBUTOR VIDEO] Remote video track muted');
          this.notifyRemoteVideoListeners(null);
        };

        event.track.onunmute = () => {
          this.log('[KOBUTOR VIDEO] Remote video track unmuted');
          this.notifyRemoteVideoListeners(this.remoteVideoStream);
        };

        this.notifyRemoteVideoListeners(this.remoteVideoStream);
      }

      this.updateSendersReceiversDiagnostics();
    };

    // --- 2. ICE CANDIDATE GATHERING & EMISSION (Trickle ICE) ---
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const c = event.candidate;
        const type = c.type || (c.candidate && c.candidate.includes(' typ relay ') ? 'relay' : 'unknown');
        const protocol = c.protocol || 'udp';

        if (type === 'relay' || (c.candidate && c.candidate.includes(' typ relay '))) {
          this.log('[KOBUTOR VOICE] TURN relay candidate detected', {
            proto: protocol,
            address: c.address || 'relay',
            port: c.port,
          });
        }

        this.log(`[KOBUTOR VOICE] Sending ICE candidate (type=${type}, proto=${protocol})`);

        const candidateJson = event.candidate.toJSON();
        if (this.sendSignal) {
          this.sendSignal({ type: 'candidate', payload: candidateJson });
        } else {
          this.queuedOutgoingCandidates.push({ type: 'candidate', payload: candidateJson });
        }
      } else {
        this.log('ICE Candidate gathering complete (null candidate)');
      }
    };

    // --- 3. CONNECTION STATE MONITORING ---
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      this.diagnostics.connectionState = state;
      this.log(`RTCPeerConnection connectionState changed -> ${state}`);

      if (state === 'connected') {
        this.isConnected = true;
        this.setVoiceStatus('connected');
        this.startDiagnosticsPolling();
      } else if (state === 'connecting') {
        this.setVoiceStatus('connecting');
      } else if (state === 'disconnected') {
        this.isConnected = false;
        this.setVoiceStatus('reconnecting');
        this.handleDisconnectedState();
      } else if (state === 'failed') {
        this.isConnected = false;
        this.setVoiceStatus('failed');
        this.log('[KOBUTOR VOICE] ICE state: failed');
        this.restartIce();
      } else if (state === 'closed') {
        this.isConnected = false;
        this.setVoiceStatus('disconnected');
      }
    };

    // --- 4. ICE CONNECTION STATE MONITORING (Milestone 3 & 4) ---
    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      this.diagnostics.iceConnectionState = iceState;
      this.log(`[KOBUTOR VOICE] ICE state: ${iceState}`);

      if (iceState === 'connected' || iceState === 'completed') {
        this.isConnected = true;
        this.diagnostics.iceConnected = true;
        this.setVoiceStatus('connected');

        if (this.disconnectTimeout) {
          clearTimeout(this.disconnectTimeout);
          this.disconnectTimeout = null;
        }

        if (!this.hasLoggedIceConnected) {
          this.hasLoggedIceConnected = true;
          this.logDiagnosticMilestone(
            'ICE CONNECTED',
            `State: ${iceState} | SignalingState: ${pc.signalingState} | ConnectionState: ${pc.connectionState}`
          );
        }

        this.inspectSelectedCandidatePair();
      } else if (iceState === 'checking') {
        if (this.currentVoiceStatus !== 'connected') {
          this.setVoiceStatus('connecting');
        }
      } else if (iceState === 'disconnected') {
        this.setVoiceStatus('reconnecting');
        this.handleDisconnectedState();
      } else if (iceState === 'failed') {
        this.setVoiceStatus('failed');
        this.log('[KOBUTOR VOICE] ICE state: failed');
        this.restartIce();
      }
    };

    // --- 5. ICE GATHERING STATE MONITORING ---
    pc.onicegatheringstatechange = () => {
      this.diagnostics.iceGatheringState = pc.iceGatheringState;
      this.log(`ICE gatheringState changed -> ${pc.iceGatheringState}`);
    };

    // --- 6. SIGNALING STATE MONITORING ---
    pc.onsignalingstatechange = () => {
      this.diagnostics.signalingState = pc.signalingState;
      this.log(`SignalingState changed -> ${pc.signalingState}`);
    };

    // --- 7. NEGOTIATION NEEDED ---
    pc.onnegotiationneeded = async () => {
      if (this.isNegotiating) return;
      this.log('onnegotiationneeded triggered');
      if (this.isInitiator && pc.signalingState === 'stable') {
        await this.createOffer();
      }
    };

    if (isInitiator) {
      this.createOffer();
    }
  }

  private handleDisconnectedState() {
    if (this.disconnectTimeout) return;
    this.log('ICE state disconnected. Waiting 3.5s before triggering auto-recovery restart...');
    this.disconnectTimeout = window.setTimeout(() => {
      this.disconnectTimeout = null;
      if (this.peerConnection && (this.peerConnection.iceConnectionState === 'disconnected' || this.peerConnection.iceConnectionState === 'failed')) {
        this.log('Still disconnected after grace period. Restarting ICE...');
        this.restartIce();
      }
    }, 3500);
  }

  /**
   * Set up remote audio playback and Web Audio frequency analyser
   */
  private setupRemoteAudio(remoteStream: MediaStream) {
    const audioEl = this.ensureRemoteAudioElement();
    if (audioEl.srcObject !== remoteStream) {
      audioEl.srcObject = remoteStream;
    }
    audioEl.volume = 1.0;
    audioEl.muted = false;

    // Prevent accidental pauses while connected
    audioEl.onpause = () => {
      if (this.isConnected && audioEl.srcObject) {
        this.log('Remote audio element paused unexpectedly. Auto-resuming...');
        audioEl.play().catch(() => {});
      }
    };

    this.diagnostics.remoteAudioElementHasSrc = true;
    this.diagnostics.remoteAudioElementVolume = audioEl.volume;
    this.diagnostics.remoteAudioElementMuted = audioEl.muted;

    this.log('Attached remote stream to persistent <audio> element. Initiating playback...');

    const playPromise = audioEl.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.diagnostics.remoteAudioPlaying = true;
          this.diagnostics.audioPlaybackStatus = 'playing';
          this.diagnostics.lastPlaybackError = null;

          if (!this.hasLoggedRemotePlaying) {
            this.hasLoggedRemotePlaying = true;
            this.logDiagnosticMilestone(
              'REMOTE AUDIO PLAYING',
              'HTMLAudioElement srcObject set | Stream Live: true | Playback: playing | Volume: 100%'
            );
          }
        })
        .catch((err) => {
          this.diagnostics.remoteAudioPlaying = false;
          this.diagnostics.audioPlaybackStatus = 'autoplay_blocked';
          this.diagnostics.lastPlaybackError = err?.message || String(err);
          this.log('Autoplay restriction encountered. Registering user touch unlock...', err);

          const unlockOnGesture = () => {
            audioEl.play().then(() => {
              this.diagnostics.remoteAudioPlaying = true;
              this.diagnostics.audioPlaybackStatus = 'playing';
              if (!this.hasLoggedRemotePlaying) {
                this.hasLoggedRemotePlaying = true;
                this.logDiagnosticMilestone(
                  'REMOTE AUDIO PLAYING',
                  'HTMLAudioElement playback resumed on user gesture | Volume: 100%'
                );
              }
            }).catch(() => {});

            if (this.audioCtx && this.audioCtx.state === 'suspended') {
              this.audioCtx.resume().catch(() => {});
            }

            window.removeEventListener('pointerdown', unlockOnGesture);
            window.removeEventListener('touchstart', unlockOnGesture);
            window.removeEventListener('click', unlockOnGesture);
            window.removeEventListener('keydown', unlockOnGesture);
          };

          window.addEventListener('pointerdown', unlockOnGesture, { once: true, passive: true });
          window.addEventListener('touchstart', unlockOnGesture, { once: true, passive: true });
          window.addEventListener('click', unlockOnGesture, { once: true, passive: true });
          window.addEventListener('keydown', unlockOnGesture, { once: true, passive: true });
        });
    }

    // Connect cloned remote stream to Web Audio Analyser (isolated so createMediaStreamSource does not mute <audio>)
    try {
      const ctx = this.getOrCreateAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const analyserStream = remoteStream.clone();
        const remoteSource = ctx.createMediaStreamSource(analyserStream);
        this.remoteAnalyser = ctx.createAnalyser();
        this.remoteAnalyser.fftSize = 256;
        this.remoteAnalyser.smoothingTimeConstant = 0.8;
        this.remoteDataArray = new Uint8Array(this.remoteAnalyser.frequencyBinCount);
        remoteSource.connect(this.remoteAnalyser);
        this.log('Connected isolated remote stream clone to Web Audio Analyser');
      }
    } catch (e) {
      console.warn('Remote analyser setup notice:', e);
    }
  }

  /**
   * Create and send SDP Offer (with optional iceRestart flag for recovery)
   */
  public async createOffer(iceRestart = false) {
    if (!this.peerConnection || !this.sendSignal) return;
    try {
      this.isNegotiating = true;
      this.log(`Creating WebRTC SDP offer with audio sendrecv (iceRestart=${iceRestart})...`);
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart,
      });

      if (offer.sdp) {
        offer.sdp = this.optimizeSDP(offer.sdp);
      }

      await this.peerConnection.setLocalDescription(offer);
      this.log('[KOBUTOR VOICE] Local description set');
      this.sendSignal({ type: 'offer', payload: this.peerConnection.localDescription?.toJSON() || offer });
    } catch (err) {
      this.log('Error creating WebRTC offer:', err);
    } finally {
      this.isNegotiating = false;
    }
  }

  /**
   * Process incoming WebRTC signaling data (offer, answer, ICE candidate, ice_restart_request)
   */
  public async handleSignal(
    data: { type: 'offer' | 'answer' | 'candidate' | 'ice_restart_request'; payload: unknown },
    sendSignalFn?: SignalCallback
  ) {
    if (sendSignalFn) {
      this.sendSignal = sendSignalFn;
      this.flushOutgoingCandidates();
    }

    this.log(`Received incoming WebRTC signal of type: ${data.type}`);

    // Ensure ICE servers are loaded before initializing peer connection
    await this.ensureIceServersReady();

    // Clear non-initiator safety restart timer when signals arrive
    if (this.nonInitiatorRestartTimer) {
      clearTimeout(this.nonInitiatorRestartTimer);
      this.nonInitiatorRestartTimer = null;
    }

    // Handle remote peer asking for ICE restart
    if (data.type === 'ice_restart_request') {
      this.log('Received ice_restart_request from peer. Initiating offer with iceRestart...');
      if (this.peerConnection) {
        if ('restartIce' in this.peerConnection) {
          this.peerConnection.restartIce();
        }
        await this.createOffer(true);
      }
      return;
    }

    // If receiving offer, ensure local mic stream is prepared so answer contains sendrecv audio
    if (data.type === 'offer') {
      await this.ensureMicrophoneReady();
    }

    if (!this.peerConnection && this.sendSignal) {
      this.initPeerConnection(this.sendSignal, false);
    }
    if (!this.peerConnection) {
      if (data.type === 'candidate') {
        const candInit = this.extractCandidate(data.payload);
        if (candInit && candInit.candidate) {
          this.pendingCandidates.push(candInit);
          this.log('Queued early ICE candidate before peerConnection initialized');
        }
      }
      return;
    }

    try {
      if (data.type === 'offer') {
        const offerDesc = new RTCSessionDescription(data.payload as RTCSessionDescriptionInit);
        this.log(`Setting remote description (offer) in signalingState: ${this.peerConnection.signalingState}...`);
        await this.peerConnection.setRemoteDescription(offerDesc);

        // Process any queued pending candidates
        await this.drainPendingCandidates();

        // Attach local tracks before creating answer (enforces sendrecv direction)
        this.attachLocalTracksToPeer();

        this.log('Creating WebRTC SDP answer with audio and video capability...');
        const answer = await this.peerConnection.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        if (answer.sdp) {
          answer.sdp = this.optimizeSDP(answer.sdp);
        }

        await this.peerConnection.setLocalDescription(answer);
        this.log('[KOBUTOR VOICE] Local description set');

        if (this.sendSignal) {
          this.sendSignal({ type: 'answer', payload: this.peerConnection.localDescription?.toJSON() || answer });
        }
      } else if (data.type === 'answer') {
        const answerDesc = new RTCSessionDescription(data.payload as RTCSessionDescriptionInit);
        this.log(`Setting remote description (answer) in signalingState: ${this.peerConnection.signalingState}...`);
        await this.peerConnection.setRemoteDescription(answerDesc);

        // Process any queued pending candidates
        await this.drainPendingCandidates();
      } else if (data.type === 'candidate') {
        this.log('[KOBUTOR VOICE] Received ICE candidate');
        const candInit = this.extractCandidate(data.payload);
        if (!candInit || !candInit.candidate) {
          return; // Ignore empty end-of-candidate notification
        }
        if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candInit));
            this.log('Successfully added ICE candidate to active peer connection');
          } catch (e) {
            this.log('addIceCandidate notice:', e);
          }
        } else {
          this.log('Queuing ICE candidate (remoteDescription pending)');
          this.pendingCandidates.push(candInit);
        }
      }
    } catch (err) {
      this.log('WebRTC signal handling error:', err);
    }
  }

  private extractCandidate(payload: unknown): RTCIceCandidateInit | null {
    if (!payload || typeof payload !== 'object') return null;
    const p = payload as any;
    if (p.candidate && typeof p.candidate === 'object' && p.candidate.candidate) {
      return p.candidate;
    }
    if (typeof p.candidate === 'string') {
      return p;
    }
    if (p.sdpMid !== undefined || p.sdpMLineIndex !== undefined) {
      return p;
    }
    return null;
  }

  private async drainPendingCandidates() {
    if (!this.peerConnection || this.pendingCandidates.length === 0) return;
    this.log(`Draining ${this.pendingCandidates.length} queued ICE candidates...`);
    const candidates = [...this.pendingCandidates];
    this.pendingCandidates = [];
    for (const cand of candidates) {
      if (!cand || !cand.candidate) continue;
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        this.log('Error draining candidate:', e);
      }
    }
  }

  public restartIce() {
    if (!this.peerConnection || !this.sendSignal) return;
    const now = Date.now();
    if (now - this.lastIceRestartTime < 3000) {
      this.log('ICE restart throttled (already attempted in last 3s)');
      return;
    }
    this.lastIceRestartTime = now;
    try {
      this.log('[KOBUTOR VOICE] Starting ICE restart');
      if (this.isInitiator) {
        if ('restartIce' in this.peerConnection) {
          this.peerConnection.restartIce();
        }
        this.createOffer(true);
      } else {
        this.log('Non-initiator requesting ICE restart from initiator...');
        this.sendSignal({ type: 'ice_restart_request' as any, payload: {} });

        if (this.nonInitiatorRestartTimer) clearTimeout(this.nonInitiatorRestartTimer);
        this.nonInitiatorRestartTimer = window.setTimeout(() => {
          this.nonInitiatorRestartTimer = null;
          if (
            this.peerConnection &&
            (this.peerConnection.iceConnectionState === 'failed' || this.peerConnection.iceConnectionState === 'disconnected')
          ) {
            this.log('Non-initiator timeout elapsed without recovery. Initiating direct restart offer...');
            if ('restartIce' in this.peerConnection) {
              this.peerConnection.restartIce();
            }
            this.createOffer(true);
          }
        }, 3500);
      }
    } catch (e) {
      this.log('restartIce error:', e);
    }
  }

  public handleNetworkChange(reason: string) {
    this.log(`Network migration event detected (${reason}).`);
    this.diagnostics.lastEvent = `network_change_${reason}`;
    if (this.peerConnection && this.isConnected) {
      this.log('Network migrated during active session. Triggering automatic ICE restart...');
      this.restartIce();
    }
  }

  private updateSendersReceiversDiagnostics() {
    if (!this.peerConnection) return;
    try {
      this.diagnostics.senders = this.peerConnection.getSenders().map((s) => {
        return `track:${s.track ? s.track.kind + '(' + s.track.readyState + ')' : 'none'}`;
      });
      this.diagnostics.receivers = this.peerConnection.getReceivers().map((r) => {
        return `track:${r.track ? r.track.kind + '(' + r.track.readyState + ')' : 'none'}`;
      });
    } catch (e) {}
  }

  private async inspectSelectedCandidatePair() {
    if (!this.peerConnection) return;
    try {
      const stats = await this.peerConnection.getStats();
      let audioBytesSent = 0;
      let audioBytesReceived = 0;
      let audioPacketsSent = 0;
      let audioPacketsReceived = 0;

      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.selected) {
          const localCand = stats.get(report.localCandidateId);
          const remoteCand = stats.get(report.remoteCandidateId);
          const isTurn = localCand?.candidateType === 'relay' || remoteCand?.candidateType === 'relay';

          this.diagnostics.turnRelayActive = isTurn;
          this.diagnostics.turnRelayConnected = isTurn;
          this.diagnostics.selectedCandidatePair = {
            localType: localCand?.candidateType,
            localProtocol: localCand?.protocol,
            remoteType: remoteCand?.candidateType,
            remoteProtocol: remoteCand?.protocol,
            roundTripTime: report.currentRoundTripTime,
            bytesSent: report.bytesSent,
            bytesReceived: report.bytesReceived,
            isRelayed: isTurn,
          };

          if (isTurn && !this.hasLoggedTurnRelay) {
            this.hasLoggedTurnRelay = true;
            this.logDiagnosticMilestone(
              'TURN RELAY CONNECTED',
              `Selected Candidate Pair: Local [${localCand?.candidateType}/${localCand?.protocol}] ↔ Remote [${remoteCand?.candidateType}/${remoteCand?.protocol}] | TURN Relay Active: true | RoundTrip: ${report.currentRoundTripTime ? (report.currentRoundTripTime * 1000).toFixed(0) + 'ms' : 'N/A'}`
            );
          } else if (!isTurn) {
            this.log(`Direct P2P Candidate pair established: Local [${localCand?.candidateType}/${localCand?.protocol}] ↔ Remote [${remoteCand?.candidateType}/${remoteCand?.protocol}]`);
          }
        }

        // Measure actual audio packet transmission in both directions
        if (report.type === 'outbound-rtp' && (report.kind === 'audio' || report.mediaType === 'audio')) {
          audioBytesSent = report.bytesSent || 0;
          audioPacketsSent = report.packetsSent || 0;
        }
        if (report.type === 'inbound-rtp' && (report.kind === 'audio' || report.mediaType === 'audio')) {
          audioBytesReceived = report.bytesReceived || 0;
          audioPacketsReceived = report.packetsReceived || 0;
        }
      });

      this.diagnostics.audioBytesSent = audioBytesSent;
      this.diagnostics.audioBytesReceived = audioBytesReceived;
      this.diagnostics.audioPacketsSent = audioPacketsSent;
      this.diagnostics.audioPacketsReceived = audioPacketsReceived;

      if (audioPacketsReceived > 0 && audioPacketsSent > 0) {
        this.diagnostics.audioFlowVerified = true;
        if (!this.hasLoggedAudioFlow) {
          this.hasLoggedAudioFlow = true;
          this.log(
            `[KOBUTOR VOICE] Real bidirectional audio flow verified! Sent: ${audioPacketsSent} pkts (${(audioBytesSent / 1024).toFixed(1)} KB) ↔ Received: ${audioPacketsReceived} pkts (${(audioBytesReceived / 1024).toFixed(1)} KB)`
          );
        }
      }
    } catch (e) {}
  }

  private startDiagnosticsPolling() {
    if (this.statsInterval) return;
    this.statsInterval = window.setInterval(() => {
      this.inspectSelectedCandidatePair();
      this.updateSendersReceiversDiagnostics();
    }, 3500);
  }

  private stopDiagnosticsPolling() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  public getDiagnostics() {
    return {
      ...this.diagnostics,
      timestamp: new Date().toISOString(),
      isMuted: this.isMuted,
      isConnected: this.isConnected,
      localVolume: Math.round(this.localVolume * 100) / 100,
      remoteVolume: Math.round(this.remoteVolume * 100) / 100,
    };
  }

  public toggleMute(): boolean {
    if (!this.localStream) return false;
    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted;
    });
    this.diagnostics.micTrackEnabled = !this.isMuted;
    this.log(`Microphone mute toggled: isMuted=${this.isMuted}`);
    return this.isMuted;
  }

  public toggleSpeaker(): boolean {
    this.isSpeakerMuted = !this.isSpeakerMuted;
    if (this.remoteAudioElement) {
      this.remoteAudioElement.muted = this.isSpeakerMuted;
    }
    this.diagnostics.remoteAudioElementMuted = this.isSpeakerMuted;
    this.log(`Speaker toggle: isSpeakerMuted=${this.isSpeakerMuted}`);
    this.notifySpeakerListeners(this.isSpeakerMuted);
    return this.isSpeakerMuted;
  }

  public async toggleCamera(): Promise<boolean> {
    return this.enableCamera(!this.isCameraActive);
  }

  public async enableCamera(enabled: boolean): Promise<boolean> {
    if (enabled === this.isCameraActive && this.localVideoStream) {
      return this.isCameraActive;
    }

    if (enabled) {
      try {
        this.log('[KOBUTOR VIDEO] Enabling flattering natural camera stream...');
        let stream: MediaStream;
        try {
          // Priority: 1080p @ 30-60fps high quality natural capture
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              frameRate: { ideal: 30, max: 60 },
              facingMode: 'user',
            },
            audio: false,
          });
        } catch (e1) {
          this.log('[KOBUTOR VIDEO] HD constraint fallback to 720p/480p');
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              facingMode: 'user',
            },
            audio: false,
          });
        }

        this.localVideoStream = stream;
        this.isCameraActive = true;
        const videoTrack = stream.getVideoTracks()[0];

        if (this.peerConnection) {
          const transceivers = this.peerConnection.getTransceivers();
          const videoTransceiver = transceivers.find((t) => {
            return (
              (t.sender && t.sender.track?.kind === 'video') ||
              (t.receiver && t.receiver.track?.kind === 'video') ||
              (t.mid !== null && t.receiver && t.receiver.track?.kind !== 'audio')
            );
          });

          if (videoTransceiver) {
            videoTransceiver.direction = 'sendrecv';
            if (videoTransceiver.sender) {
              await videoTransceiver.sender.replaceTrack(videoTrack);
              this.log('[KOBUTOR VIDEO] Replaced video track on transceiver');
            }
          } else {
            const senders = this.peerConnection.getSenders();
            const existingVideoSender = senders.find((s) => s.track?.kind === 'video');
            if (existingVideoSender) {
              await existingVideoSender.replaceTrack(videoTrack);
              this.log('[KOBUTOR VIDEO] Replaced video track on existing sender');
            } else {
              this.peerConnection.addTrack(videoTrack, stream);
              this.log('[KOBUTOR VIDEO] Added video track to peer connection');
            }
          }

          if (this.isConnected) {
            if (this.isInitiator && this.peerConnection.signalingState === 'stable') {
              await this.createOffer();
            } else if (this.sendSignal) {
              this.sendSignal({ type: 'camera_toggled', payload: { isCameraOn: true } } as any);
            }
          }
        }

        this.notifyLocalVideoListeners(this.localVideoStream);
        this.notifyCameraListeners(true);
        return true;
      } catch (err) {
        this.log('[KOBUTOR VIDEO] Camera permission error or denied:', err);
        this.isCameraActive = false;
        this.localVideoStream = null;
        this.notifyLocalVideoListeners(null);
        this.notifyCameraListeners(false);
        return false;
      }
    } else {
      this.isCameraActive = false;
      if (this.localVideoStream) {
        this.localVideoStream.getTracks().forEach((t) => t.stop());
        this.localVideoStream = null;
      }

      if (this.peerConnection) {
        const transceivers = this.peerConnection.getTransceivers();
        const videoTransceiver = transceivers.find((t) => {
          return (
            (t.sender && t.sender.track?.kind === 'video') ||
            (t.receiver && t.receiver.track?.kind === 'video')
          );
        });

        if (videoTransceiver && videoTransceiver.sender) {
          videoTransceiver.sender.replaceTrack(null).catch(() => {});
        } else {
          const senders = this.peerConnection.getSenders();
          const existingVideoSender = senders.find((s) => s.track?.kind === 'video');
          if (existingVideoSender) {
            existingVideoSender.replaceTrack(null).catch(() => {});
          }
        }

        if (this.isConnected && this.sendSignal) {
          this.sendSignal({ type: 'camera_toggled', payload: { isCameraOn: false } } as any);
        }
      }

      this.notifyLocalVideoListeners(null);
      this.notifyCameraListeners(false);
      return false;
    }
  }

  public setRemoteAudioListener(cb: (lvl: number) => void) {
    this.onVolumeUpdate = (local, remote) => cb(remote);
  }

  private startAudioLoop() {
    if (this.animFrameId) return;

    const tick = () => {
      let currentLocal = 0;
      let currentRemote = 0;

      if (this.localAnalyser && this.localDataArray && !this.isMuted) {
        this.localAnalyser.getByteFrequencyData(this.localDataArray);
        let sum = 0;
        for (let i = 0; i < this.localDataArray.length; i++) {
          sum += this.localDataArray[i];
        }
        const avg = sum / this.localDataArray.length;
        currentLocal = Math.min(1.0, Math.max(0, (avg - 10) / 70));

        // Milestone 1: LOCAL AUDIO DETECTED
        if (currentLocal > 0.05) {
          this.diagnostics.localAudioDetected = true;
          if (!this.hasLoggedLocalAudio) {
            this.hasLoggedLocalAudio = true;
            this.logDiagnosticMilestone(
              'LOCAL AUDIO DETECTED',
              `Microphone Audio Signal Active | Level: ${(currentLocal * 100).toFixed(0)}% | Track ID: ${this.diagnostics.micTrackId}`
            );
          }
        }
      }

      if (this.remoteAnalyser && this.remoteDataArray) {
        this.remoteAnalyser.getByteFrequencyData(this.remoteDataArray);
        let sum = 0;
        for (let i = 0; i < this.remoteDataArray.length; i++) {
          sum += this.remoteDataArray[i];
        }
        const avg = sum / this.remoteDataArray.length;
        currentRemote = Math.min(1.0, Math.max(0, (avg - 10) / 70));
      }

      // Smooth interpolation for silky liquid physics
      this.localVolume += (currentLocal - this.localVolume) * 0.25;
      this.remoteVolume += (currentRemote - this.remoteVolume) * 0.25;

      if (this.onVolumeUpdate) {
        this.onVolumeUpdate(this.localVolume, this.remoteVolume);
      }

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  public stop() {
    this.cleanup();
  }

  public cleanup() {
    this.log('Cleaning up voice engine session');
    this.stopDiagnosticsPolling();

    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach((t) => t.stop());
      this.localVideoStream = null;
    }
    this.remoteVideoStream = null;
    this.isCameraActive = false;
    this.isSpeakerMuted = false;
    this.notifyLocalVideoListeners(null);
    this.notifyRemoteVideoListeners(null);
    this.notifyCameraListeners(false);
    this.notifySpeakerListeners(false);
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {}
      this.peerConnection = null;
    }
    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
      this.remoteAudioElement.pause();
    }
    this.pendingCandidates = [];
    this.localVolume = 0;
    this.remoteVolume = 0;
    this.isConnected = false;
    this.setVoiceStatus('disconnected');

    // Reset diagnostics
    this.diagnostics.localAudioDetected = false;
    this.diagnostics.remoteAudioTrackReceived = false;
    this.diagnostics.iceConnected = false;
    this.diagnostics.turnRelayConnected = false;
    this.diagnostics.remoteAudioPlaying = false;
    this.diagnostics.connectionState = 'closed';
    this.diagnostics.audioPlaybackStatus = 'stopped';
    this.diagnostics.remoteAudioElementHasSrc = false;

    this.hasLoggedLocalAudio = false;
    this.hasLoggedRemoteTrack = false;
    this.hasLoggedIceConnected = false;
    this.hasLoggedTurnRelay = false;
    this.hasLoggedRemotePlaying = false;
  }
}

export const voiceEngine = new VoiceEngine();
