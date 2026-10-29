import React, { useEffect, useRef } from 'react';
import { drawEquippedCosmetics } from '../lib/pigeonCosmetics';
import { featherSystem } from '../lib/featherSystem';

export interface LiquidReactionItem {
  id: string;
  type: 'pearl' | 'heart_wave' | 'flutter' | 'resonance' | 'spark';
  fromRole: 'A' | 'B';
}

interface ConnectingPigeonsCanvasProps {
  phase: 'approaching' | 'circling' | 'settled';
  localVolume: number;
  remoteVolume: number;
  myRole: 'A' | 'B';
  isJustStay: boolean;
  liquidReactions?: LiquidReactionItem[];
  onSymbolFormed?: () => void;
  className?: string;
}

interface TrailNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  size: number;
  color: string;
  alpha: number;
}

interface TravelingReaction {
  id: string;
  type: 'pearl' | 'heart_wave' | 'flutter' | 'resonance' | 'spark';
  fromRole: 'A' | 'B';
  progress: number;
}

export const ConnectingPigeonsCanvas: React.FC<ConnectingPigeonsCanvasProps> = ({
  phase,
  localVolume,
  remoteVolume,
  myRole,
  isJustStay,
  liquidReactions = [],
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const trailsRef = useRef<{ a: TrailNode[]; b: TrailNode[]; symbol: TrailNode[] }>({
    a: [],
    b: [],
    symbol: [],
  });
  const travelingReactionsRef = useRef<TravelingReaction[]>([]);
  const processedReactionIdsRef = useRef<Set<string>>(new Set());

  const smoothVolARef = useRef(0);
  const smoothVolBRef = useRef(0);

  // Sync incoming liquid reactions
  useEffect(() => {
    liquidReactions.forEach((rx) => {
      if (!processedReactionIdsRef.current.has(rx.id)) {
        processedReactionIdsRef.current.add(rx.id);
        travelingReactionsRef.current.push({
          id: rx.id,
          type: rx.type,
          fromRole: rx.fromRole,
          progress: 0,
        });
      }
    });
    // Keep set bounded
    if (processedReactionIdsRef.current.size > 50) {
      processedReactionIdsRef.current.clear();
    }
  }, [liquidReactions]);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth || 360;
      height = parent.clientHeight || 480;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resize();
    window.addEventListener('resize', resize);

    // Color palettes for Pigeon A (Aqua/Cyan) and Pigeon B (Lavender/Rose Pearl)
    const paletteA = {
      primary: 'rgba(56, 189, 248, 0.9)',    // Vibrant Aqua
      secondary: 'rgba(165, 243, 252, 0.85)', // Light Aqua Sheen
      core: 'rgba(255, 255, 255, 0.95)',      // Pearl Core
      deep: 'rgba(14, 116, 144, 0.7)',        // Ocean Accent
      glow: 'rgba(56, 189, 248, 0.35)',
      trail: 'rgba(6, 182, 212, 0.55)',
    };

    const paletteB = {
      primary: 'rgba(168, 85, 247, 0.9)',    // Soft Lavender Violet
      secondary: 'rgba(233, 213, 255, 0.85)', // Light Lavender Sheen
      core: 'rgba(255, 255, 255, 0.95)',      // Pearl Core
      deep: 'rgba(126, 34, 206, 0.7)',        // Royal Violet Accent
      glow: 'rgba(192, 132, 252, 0.35)',
      trail: 'rgba(168, 85, 247, 0.55)',
    };

    // Helper: Draw anatomically clear 🕊️ living liquid dove
    const drawLiquidPigeon = (
      x: number,
      y: number,
      scale: number,
      angle: number,
      wingFlap: number,
      palette: typeof paletteA,
      voiceMod: number,
      flipH: boolean = false,
      cosmetics: string[] = [],
      elapsedTime: number = 0
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      if (flipH) ctx.scale(-1, 1);

      const s = scale * (1 + voiceMod * 0.12);

      // 1. Back Wing (Behind Body)
      ctx.save();
      ctx.translate(-4 * s, -10 * s);
      ctx.rotate(-wingFlap * 0.9 + 0.1);

      const backWingGrad = ctx.createLinearGradient(-25 * s, -45 * s, 10 * s, 10 * s);
      backWingGrad.addColorStop(0, palette.secondary);
      backWingGrad.addColorStop(0.5, palette.primary);
      backWingGrad.addColorStop(1, palette.deep);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-14 * s, -24 * s, -30 * s, -48 * s, -42 * s, -56 * s);
      ctx.bezierCurveTo(-38 * s, -52 * s, -32 * s, -40 * s, -28 * s, -32 * s);
      ctx.bezierCurveTo(-24 * s, -28 * s, -18 * s, -18 * s, -14 * s, -12 * s);
      ctx.bezierCurveTo(-10 * s, -6 * s, -4 * s, -2 * s, 0, 0);
      ctx.closePath();
      ctx.fillStyle = backWingGrad;
      ctx.fill();
      ctx.strokeStyle = palette.core;
      ctx.lineWidth = 1.1 * s;
      ctx.stroke();
      ctx.restore();

      // 2. Fanned Tail Feathers (Lower Rear)
      const tailGrad = ctx.createLinearGradient(-35 * s, 20 * s, -5 * s, 0);
      tailGrad.addColorStop(0, palette.secondary);
      tailGrad.addColorStop(0.6, palette.primary);
      tailGrad.addColorStop(1, palette.deep);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-16 * s, 6 * s);
      // Feather 1
      ctx.bezierCurveTo(-30 * s, 15 * s, -45 * s, 24 * s, -54 * s, 30 * s);
      ctx.bezierCurveTo(-48 * s, 26 * s, -40 * s, 18 * s, -35 * s, 14 * s);
      // Feather 2
      ctx.bezierCurveTo(-44 * s, 20 * s, -50 * s, 24 * s, -55 * s, 24 * s);
      ctx.bezierCurveTo(-44 * s, 16 * s, -35 * s, 10 * s, -30 * s, 6 * s);
      // Feather 3
      ctx.bezierCurveTo(-40 * s, 12 * s, -45 * s, 14 * s, -48 * s, 16 * s);
      ctx.bezierCurveTo(-36 * s, 8 * s, -24 * s, 2 * s, -12 * s, 2 * s);
      ctx.closePath();
      ctx.fillStyle = tailGrad;
      ctx.fill();
      ctx.strokeStyle = palette.core;
      ctx.lineWidth = 1.0 * s;
      ctx.stroke();
      ctx.restore();

      // 3. Main Pigeon Body (Chest, sleek back, neck, distinct head & beak 🕊️)
      const bodyGrad = ctx.createRadialGradient(6 * s, -3 * s, 3 * s, 0, 0, 38 * s);
      bodyGrad.addColorStop(0, palette.core);
      bodyGrad.addColorStop(0.35, palette.secondary);
      bodyGrad.addColorStop(0.75, palette.primary);
      bodyGrad.addColorStop(1, palette.deep);

      ctx.beginPath();
      // Back start near tail
      ctx.moveTo(-18 * s, 4 * s);
      // Back curvature up to neck
      ctx.bezierCurveTo(-12 * s, -2 * s, -5 * s, -8 * s, 2 * s, -14 * s);
      // Neck leading to head crown
      ctx.bezierCurveTo(7 * s, -19 * s, 13 * s, -24 * s, 21 * s, -23 * s);
      // Rounded pigeon crown / head
      ctx.bezierCurveTo(26 * s, -22 * s, 31 * s, -18 * s, 32 * s, -13 * s);
      // Small pointed dove beak 🕊️
      ctx.lineTo(40 * s, -11 * s);
      ctx.lineTo(31 * s, -8 * s);
      // Rounded throat and plump chest
      ctx.bezierCurveTo(30 * s, -3 * s, 28 * s, 4 * s, 22 * s, 9 * s);
      // Curving full breast / belly
      ctx.bezierCurveTo(15 * s, 15 * s, 5 * s, 17 * s, -5 * s, 14 * s);
      // Underbelly tapering to tail
      ctx.bezierCurveTo(-12 * s, 12 * s, -16 * s, 8 * s, -18 * s, 4 * s);
      ctx.closePath();

      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.strokeStyle = palette.core;
      ctx.lineWidth = 1.4 * s;
      ctx.stroke();

      // 4. Front Main Wing (Spanning Upwards)
      ctx.save();
      ctx.translate(2 * s, -5 * s);
      ctx.rotate(wingFlap);

      const frontWingGrad = ctx.createLinearGradient(0, 0, 38 * s, -55 * s);
      frontWingGrad.addColorStop(0, palette.core);
      frontWingGrad.addColorStop(0.35, palette.secondary);
      frontWingGrad.addColorStop(0.75, palette.primary);
      frontWingGrad.addColorStop(1, palette.deep);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(12 * s, -18 * s, 28 * s, -44 * s, 40 * s, -58 * s);
      ctx.bezierCurveTo(36 * s, -52 * s, 28 * s, -40 * s, 25 * s, -33 * s);
      ctx.bezierCurveTo(23 * s, -30 * s, 18 * s, -22 * s, 15 * s, -15 * s);
      ctx.bezierCurveTo(12 * s, -11 * s, 6 * s, -5 * s, 3 * s, 2 * s);
      ctx.bezierCurveTo(1 * s, 3 * s, -2 * s, 1 * s, 0, 0);
      ctx.closePath();

      ctx.fillStyle = frontWingGrad;
      ctx.fill();
      ctx.strokeStyle = palette.core;
      ctx.lineWidth = 1.5 * s;
      ctx.stroke();

      // Inner wing water caustics
      ctx.beginPath();
      ctx.moveTo(6 * s, -6 * s);
      ctx.bezierCurveTo(14 * s, -20 * s, 22 * s, -35 * s, 32 * s, -48 * s);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.0 * s;
      ctx.stroke();
      ctx.restore();

      // 5. Eye (Aquatic living gem)
      ctx.beginPath();
      ctx.arc(24 * s, -15 * s, 2.0 * s, 0, Math.PI * 2);
      ctx.fillStyle = palette.deep;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(23.4 * s, -15.5 * s, 0.8 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // 6. Chest Highlight Sheen
      ctx.beginPath();
      ctx.moveTo(14 * s, -3 * s);
      ctx.bezierCurveTo(20 * s, 3 * s, 16 * s, 10 * s, 8 * s, 13 * s);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.6 * s;
      ctx.stroke();

      // Voice-reactive subtle ripple
      if (voiceMod > 0.05) {
        ctx.beginPath();
        ctx.arc(0, 0, (28 + voiceMod * 25) * s, 0, Math.PI * 2);
        ctx.strokeStyle = palette.glow;
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();
      }

      // Unlocked & Equipped Cosmetics (Rendered smoothly on Liquid Dove)
      if (cosmetics && cosmetics.length > 0) {
        drawEquippedCosmetics(ctx, cosmetics, s, elapsedTime, { x: 26 * s, y: -22 * s });
      }

      ctx.restore();
    };

    // Render loop
    const render = () => {
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000;

      // Smooth audio levels
      const targetVolA = myRole === 'A' ? localVolume : remoteVolume;
      const targetVolB = myRole === 'A' ? remoteVolume : localVolume;
      smoothVolARef.current += (targetVolA - smoothVolARef.current) * 0.2;
      smoothVolBRef.current += (targetVolB - smoothVolBRef.current) * 0.2;
      const volA = smoothVolARef.current;
      const volB = smoothVolBRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height * 0.46;

      // Trajectory calculation based on timeline:
      // Phase 1: 0.0s - 2.0s -> APPROACH (Flying inward toward center)
      // Phase 2: 2.0s - 4.4s -> CIRCLING & INTERTWINE (Orbits center once, trails weave into shared symbol)
      // Phase 3: > 4.4s      -> SIDE-BY-SIDE HARMONY (Gliding side-by-side gracefully with flowing resonant stream)

      let posA = { x: 0, y: 0, angle: 0, wingFlap: 0, flip: false, scale: 0.85 };
      let posB = { x: 0, y: 0, angle: 0, wingFlap: 0, flip: false, scale: 0.85 };

      const wingSpeedA = 3.5 + volA * 4.0;
      const wingSpeedB = 3.5 + volB * 4.0;

      if (elapsed < 2.0) {
        // --- PHASE 1: INWARD APPROACH ---
        const t = elapsed / 2.0;
        // Ease in-out
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        // Pigeon A starts left (-0.48 width) and flies right toward center (-40px)
        const startXA = cx - width * 0.44;
        const targetXA = cx - 50;
        const currXA = startXA + (targetXA - startXA) * ease;
        const currYA = cy - 25 + Math.sin(t * Math.PI) * -35;

        // Pigeon B starts right (+0.48 width) and flies left toward center (+50px)
        const startXB = cx + width * 0.44;
        const targetXB = cx + 50;
        const currXB = startXB + (targetXB - startXB) * ease;
        const currYB = cy + 25 + Math.sin(t * Math.PI) * 35;

        posA = {
          x: currXA,
          y: currYA,
          angle: -0.15 + (1 - ease) * 0.2,
          wingFlap: Math.sin(elapsed * wingSpeedA) * 0.35,
          flip: false, // facing right
          scale: 0.88,
        };

        posB = {
          x: currXB,
          y: currYB,
          angle: -0.15 - (1 - ease) * 0.2,
          wingFlap: Math.sin(elapsed * wingSpeedB + 0.5) * 0.35,
          flip: true, // facing left
          scale: 0.88,
        };
      } else if (elapsed < 4.4) {
        // --- PHASE 2: CIRCLING & INTERTWINE ---
        const t = (elapsed - 2.0) / 2.4; // 0 to 1
        const orbitAngle = t * Math.PI * 2; // 360 degree orbit
        const orbitRadiusX = 58 * (1 - Math.sin(t * Math.PI) * 0.25);
        const orbitRadiusY = 40 * (1 - Math.sin(t * Math.PI) * 0.25);

        // Pigeon A orbits starting from left (-PI)
        const currXA = cx + Math.cos(orbitAngle + Math.PI) * orbitRadiusX;
        const currYA = cy + Math.sin(orbitAngle + Math.PI) * orbitRadiusY;
        const headingA = orbitAngle + Math.PI + Math.PI / 2;

        // Pigeon B orbits starting from right (0)
        const currXB = cx + Math.cos(orbitAngle) * orbitRadiusX;
        const currYB = cy + Math.sin(orbitAngle) * orbitRadiusY;
        const headingB = orbitAngle + Math.PI / 2;

        posA = {
          x: currXA,
          y: currYA,
          angle: Math.sin(headingA) * 0.35,
          wingFlap: Math.sin(elapsed * wingSpeedA) * 0.4,
          flip: Math.cos(headingA) < 0,
          scale: 0.86,
        };

        posB = {
          x: currXB,
          y: currYB,
          angle: Math.sin(headingB) * 0.35,
          wingFlap: Math.sin(elapsed * wingSpeedB + 0.4) * 0.4,
          flip: Math.cos(headingB) < 0,
          scale: 0.86,
        };

        // Emit central shared symbol particles (shimmering intertwined water loop)
        if (t > 0.4 && t < 0.95 && Math.random() > 0.3) {
          const symAngle = (elapsed * 6) % (Math.PI * 2);
          const symR = 18 * Math.sin(symAngle * 2);
          trailsRef.current.symbol.push({
            x: cx + Math.cos(symAngle) * symR,
            y: cy + Math.sin(symAngle) * (symR * 0.7),
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3 - 0.2,
            age: 0,
            maxAge: 45,
            size: 1.5 + Math.random() * 2,
            color: Math.random() > 0.5 ? 'rgba(56, 189, 248, 0.8)' : 'rgba(192, 132, 252, 0.8)',
            alpha: 0.9,
          });
        }
      } else {
        // --- PHASE 3: HARMONIOUS FACING PIGEONS (CONNECTED STATE) ---
        const t = elapsed - 4.4;

        // Smooth transition to facing position
        // Pigeon A rests on left (-55px) facing right, Pigeon B rests on right (+55px) facing left toward Pigeon A
        const floatY1 = Math.sin(t * 1.8) * 6 + (volA * -10);
        const floatY2 = Math.sin(t * 1.8 + 0.6) * 6 + (volB * -10);
        const floatX1 = Math.cos(t * 1.2) * 3;
        const floatX2 = Math.cos(t * 1.2 + 0.6) * 3;

        const targetXA = cx - 55 + floatX1;
        const targetYA = cy + floatY1;

        const targetXB = cx + 55 + floatX2;
        const targetYB = cy + floatY2;

        posA = {
          x: targetXA,
          y: targetYA,
          angle: Math.sin(t * 1.5) * 0.05 - 0.02,
          wingFlap: Math.sin(elapsed * (isJustStay ? 1.5 : wingSpeedA)) * (isJustStay ? 0.18 : 0.28),
          flip: false, // Pigeon A on the left faces RIGHT toward Pigeon B
          scale: 0.9,
        };

        posB = {
          x: targetXB,
          y: targetYB,
          angle: -(Math.sin(t * 1.5 + 0.5) * 0.05 - 0.02),
          wingFlap: Math.sin(elapsed * (isJustStay ? 1.5 : wingSpeedB) + 0.4) * (isJustStay ? 0.18 : 0.28),
          flip: true, // Pigeon B on the right faces LEFT toward Pigeon A
          scale: 0.9,
        };
      }

      // Add fluid trail nodes behind Pigeon A and Pigeon B
      const trailInterval = elapsed < 4.4 ? 0.4 : 0.6;
      if (Math.random() > trailInterval) {
        const offsetA = posA.flip ? 20 : -20;
        trailsRef.current.a.push({
          x: posA.x + offsetA * posA.scale,
          y: posA.y + 12 * posA.scale + (Math.random() - 0.5) * 8,
          vx: (posA.flip ? 1 : -1) * (0.8 + Math.random() * 0.6),
          vy: 0.3 + Math.random() * 0.4,
          age: 0,
          maxAge: elapsed < 4.4 ? 40 : 28,
          size: 3.5 + volA * 3.5,
          color: paletteA.trail,
          alpha: 0.75,
        });
      }

      if (Math.random() > trailInterval) {
        const offsetB = posB.flip ? 20 : -20;
        trailsRef.current.b.push({
          x: posB.x + offsetB * posB.scale,
          y: posB.y + 12 * posB.scale + (Math.random() - 0.5) * 8,
          vx: (posB.flip ? 1 : -1) * (0.8 + Math.random() * 0.6),
          vy: 0.3 + Math.random() * 0.4,
          age: 0,
          maxAge: elapsed < 4.4 ? 40 : 28,
          size: 3.5 + volB * 3.5,
          color: paletteB.trail,
          alpha: 0.75,
        });
      }

      // Render living liquid trails & particles
      const renderTrails = (list: TrailNode[], glowColor: string) => {
        for (let i = list.length - 1; i >= 0; i--) {
          const pt = list[i];
          pt.age++;
          pt.x += pt.vx;
          pt.y += pt.vy;
          const currentAlpha = (1 - pt.age / pt.maxAge) * pt.alpha;

          if (pt.age >= pt.maxAge || currentAlpha <= 0) {
            list.splice(i, 1);
          } else {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size * (1 - pt.age / pt.maxAge * 0.4), 0, Math.PI * 2);
            ctx.fillStyle = pt.color.replace(/[\d.]+\)$/, `${currentAlpha})`);
            ctx.fill();

            // Tiny droplet glimmer
            if (pt.age < pt.maxAge * 0.4) {
              ctx.beginPath();
              ctx.arc(pt.x - pt.size * 0.25, pt.y - pt.size * 0.25, pt.size * 0.35, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.8})`;
              ctx.fill();
            }
          }
        }
      };

      renderTrails(trailsRef.current.a, paletteA.glow);
      renderTrails(trailsRef.current.b, paletteB.glow);
      renderTrails(trailsRef.current.symbol, 'rgba(56, 189, 248, 0.4)');

      // --- ELEGANT CONNECTING LIQUID STREAM (HARMONY STREAM) ---
      // In settled state (and during close orbit), an organic flowing water ribbon connects them
      if (elapsed > 3.0) {
        const streamAlpha = Math.min(1, (elapsed - 3.0) / 1.5) * (0.65 + (volA + volB) * 0.35);
        const waveT = elapsed * 3.5;

        // Draw flowing dual-wave bezier ribbon between Pigeon A and Pigeon B
        const p1x = posA.x + 10;
        const p1y = posA.y + 4;
        const p2x = posB.x - 10;
        const p2y = posB.y + 4;

        const midX = (p1x + p2x) / 2;
        const midY = (p1y + p2y) / 2 + Math.sin(waveT) * 8;

        const streamGrad = ctx.createLinearGradient(p1x, p1y, p2x, p2y);
        streamGrad.addColorStop(0, `rgba(56, 189, 248, ${streamAlpha * 0.8})`);
        streamGrad.addColorStop(0.5, `rgba(255, 255, 255, ${streamAlpha * 0.95})`);
        streamGrad.addColorStop(1, `rgba(192, 132, 252, ${streamAlpha * 0.8})`);

        // Upper water strand
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.quadraticCurveTo(midX, midY - 6 - Math.cos(waveT * 1.2) * 4, p2x, p2y);
        ctx.strokeStyle = streamGrad;
        ctx.lineWidth = (2.2 + (volA + volB) * 2.5);
        ctx.stroke();

        // Lower complementary strand
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.quadraticCurveTo(midX, midY + 6 + Math.cos(waveT * 1.2) * 4, p2x, p2y);
        ctx.strokeStyle = `rgba(224, 247, 250, ${streamAlpha * 0.6})`;
        ctx.lineWidth = (1.5 + (volA + volB) * 1.5);
        ctx.stroke();

        // Little water droplet nodes traveling along the stream
        const dropT1 = (elapsed * 0.6) % 1;
        const dropX1 = p1x + (p2x - p1x) * dropT1;
        const dropY1 = (1 - dropT1) * (1 - dropT1) * p1y + 2 * (1 - dropT1) * dropT1 * midY + dropT1 * dropT1 * p2y;

        ctx.beginPath();
        ctx.arc(dropX1, dropY1, 2.5 + (volA + volB) * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${streamAlpha * 0.9})`;
        ctx.fill();

        const dropT2 = (elapsed * 0.6 + 0.5) % 1;
        const dropX2 = p1x + (p2x - p1x) * dropT2;
        const dropY2 = (1 - dropT2) * (1 - dropT2) * p1y + 2 * (1 - dropT2) * dropT2 * midY + dropT2 * dropT2 * p2y;

        ctx.beginPath();
        ctx.arc(dropX2, dropY2, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 247, 250, ${streamAlpha * 0.85})`;
        ctx.fill();
      }

      // Draw Pigeon A (Aqua - Local User with Equipped Cosmetics)
      const myCosmetics = featherSystem.getEquipped();
      drawLiquidPigeon(
        posA.x,
        posA.y,
        posA.scale,
        posA.angle,
        posA.wingFlap,
        paletteA,
        volA,
        posA.flip,
        myCosmetics,
        elapsed
      );

      // Draw Pigeon B (Lavender Pearl - Peer)
      drawLiquidPigeon(
        posB.x,
        posB.y,
        posB.scale,
        posB.angle,
        posB.wingFlap,
        paletteB,
        volB,
        posB.flip,
        [],
        elapsed
      );

      // --- KOBUTOR VOICE PULSE (Acoustic Water Rings) ---
      if (volA > 0.05) {
        const ringT = (elapsed * 4) % 1;
        ctx.beginPath();
        ctx.arc(posA.x + 28, posA.y - 10, 10 + ringT * 32, -0.6, 0.6);
        ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - ringT) * 0.75 * Math.min(1, volA * 3)})`;
        ctx.lineWidth = 2.0;
        ctx.stroke();
      }

      if (volB > 0.05) {
        const ringT = (elapsed * 4) % 1;
        ctx.beginPath();
        ctx.arc(posB.x - 28, posB.y - 10, 10 + ringT * 32, Math.PI - 0.6, Math.PI + 0.6);
        ctx.strokeStyle = `rgba(192, 132, 252, ${(1 - ringT) * 0.75 * Math.min(1, volB * 3)})`;
        ctx.lineWidth = 2.0;
        ctx.stroke();
      }

      // Harmonic Resonance when both are speaking
      if (volA > 0.06 && volB > 0.06) {
        const harmR = 24 + Math.sin(elapsed * 6) * 10;
        ctx.beginPath();
        ctx.arc(cx, cy, harmR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, harmR * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.fill();
      }

      // --- TRAVELING LIQUID REACTIONS (No emoji spam, pure aquatic fluid kinetics) ---
      for (let i = travelingReactionsRef.current.length - 1; i >= 0; i--) {
        const rx = travelingReactionsRef.current[i];
        rx.progress += 0.022; // ~1.2 seconds traversal

        if (rx.progress >= 1) {
          // Arrival splash on target pigeon
          const targetPos = rx.fromRole === 'A' ? posB : posA;
          for (let p = 0; p < 8; p++) {
            const angle = (p / 8) * Math.PI * 2;
            trailsRef.current.symbol.push({
              x: targetPos.x,
              y: targetPos.y,
              vx: Math.cos(angle) * (1.2 + Math.random() * 0.8),
              vy: Math.sin(angle) * (1.2 + Math.random() * 0.8),
              age: 0,
              maxAge: 25,
              size: 2.8,
              color: 'rgba(255, 255, 255, 0.95)',
              alpha: 0.9,
            });
          }
          travelingReactionsRef.current.splice(i, 1);
          continue;
        }

        const tProg = rx.progress;
        const startP = rx.fromRole === 'A' ? posA : posB;
        const targetP = rx.fromRole === 'A' ? posB : posA;

        // Quadratic arc path
        const curX = startP.x + (targetP.x - startP.x) * tProg;
        const curY = startP.y + (targetP.y - startP.y) * tProg - Math.sin(tProg * Math.PI) * 48;
        const alpha = Math.sin(tProg * Math.PI) * 0.95;

        // Render specific liquid reaction
        ctx.save();
        ctx.translate(curX, curY);

        if (rx.type === 'pearl') {
          // Aqua Pearl Droplet
          ctx.beginPath();
          ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
          const pGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8);
          pGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
          pGrad.addColorStop(0.5, `rgba(56, 189, 248, ${alpha})`);
          pGrad.addColorStop(1, `rgba(2, 132, 199, ${alpha})`);
          ctx.fillStyle = pGrad;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(186, 230, 253, ${alpha * 0.6})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (rx.type === 'heart_wave') {
          // Rose Water Heart Droplet
          ctx.scale(0.8, 0.8);
          ctx.beginPath();
          ctx.moveTo(0, 4);
          ctx.bezierCurveTo(-6, -6, -14, -6, -14, 2);
          ctx.bezierCurveTo(-14, 9, -5, 14, 0, 19);
          ctx.bezierCurveTo(5, 14, 14, 9, 14, 2);
          ctx.bezierCurveTo(14, -6, 6, -6, 0, 4);
          const hGrad = ctx.createLinearGradient(0, -6, 0, 19);
          hGrad.addColorStop(0, `rgba(251, 113, 133, ${alpha * 0.9})`);
          hGrad.addColorStop(1, `rgba(244, 63, 94, ${alpha * 0.95})`);
          ctx.fillStyle = hGrad;
          ctx.fill();
        } else if (rx.type === 'flutter') {
          // Translucent Water Feather
          ctx.rotate(tProg * 3);
          ctx.beginPath();
          ctx.ellipse(0, 0, 11, 4, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.7})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else if (rx.type === 'resonance') {
          // Double Acoustic Water Ripple
          ctx.beginPath();
          ctx.arc(0, 0, 8 + Math.sin(tProg * 10) * 4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.9})`;
          ctx.lineWidth = 2.0;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fill();
        } else {
          // Spark / Water Starlight
          ctx.rotate(tProg * 4);
          for (let s = 0; s < 4; s++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(1.5, 9);
            ctx.lineTo(0, 12);
            ctx.lineTo(-1.5, 9);
            ctx.closePath();
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
          }
        }

        ctx.restore();
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [phase, localVolume, remoteVolume, myRole, isJustStay]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center pointer-events-none select-none ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
