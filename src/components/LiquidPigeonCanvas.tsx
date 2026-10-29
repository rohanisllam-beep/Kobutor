import React, { useEffect, useRef } from 'react';
import { drawEquippedCosmetics } from '../lib/pigeonCosmetics';
import { featherSystem } from '../lib/featherSystem';

interface LiquidPigeonProps {
  size?: number; // base size in pixels
  mode?: 'idle' | 'energized' | 'connecting' | 'calm';
  voiceIntensity?: number; // 0.0 to 1.0 real-time audio volume
  accentColor?: 'aqua' | 'cyan' | 'lavender' | 'mint';
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  equippedCosmetics?: string[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

export const LiquidPigeonCanvas: React.FC<LiquidPigeonProps> = ({
  size = 220,
  mode = 'idle',
  voiceIntensity = 0,
  accentColor = 'aqua',
  className = '',
  onClick,
  interactive = false,
  equippedCosmetics,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const voiceSmoothRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const trailPointsRef = useRef<{ x: number; y: number; alpha: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Support Retina/HiDPI screens for crisp liquid refraction
    const dpr = window.devicePixelRatio || 1;
    const width = size;
    const height = size;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Color palettes for living water with Artistic Flair iridescent qualities
    const palettes = {
      aqua: {
        primary: 'rgba(224, 247, 250, 0.85)',   // Pastel Cyan (#e0f7fa)
        secondary: 'rgba(225, 190, 231, 0.75)', // Soft Lavender (#e1bee7)
        highlight: 'rgba(255, 255, 255, 0.95)', // Pure pearl sheen (#f5f5f5)
        deep: 'rgba(56, 189, 248, 0.5)',        // Refractive Aqua
        glow: 'rgba(165, 243, 252, 0.35)',
        lavender: 'rgba(233, 213, 255, 0.6)',
      },
      cyan: {
        primary: 'rgba(165, 243, 252, 0.85)',
        secondary: 'rgba(216, 180, 254, 0.7)',
        highlight: 'rgba(255, 255, 255, 0.95)',
        deep: 'rgba(14, 165, 233, 0.55)',
        glow: 'rgba(6, 182, 212, 0.35)',
        lavender: 'rgba(232, 121, 249, 0.5)',
      },
      lavender: {
        primary: 'rgba(233, 213, 255, 0.85)',
        secondary: 'rgba(186, 230, 253, 0.75)',
        highlight: 'rgba(255, 255, 255, 0.95)',
        deep: 'rgba(147, 51, 234, 0.45)',
        glow: 'rgba(192, 132, 252, 0.35)',
        lavender: 'rgba(240, 171, 252, 0.6)',
      },
      mint: {
        primary: 'rgba(204, 251, 241, 0.85)',
        secondary: 'rgba(225, 190, 231, 0.7)',
        highlight: 'rgba(255, 255, 255, 0.95)',
        deep: 'rgba(20, 184, 166, 0.45)',
        glow: 'rgba(94, 234, 212, 0.35)',
        lavender: 'rgba(216, 180, 254, 0.5)',
      },
    };

    const palette = palettes[accentColor];

    const render = () => {
      timeRef.current += mode === 'energized' ? 0.045 : mode === 'calm' ? 0.015 : 0.025;
      const t = timeRef.current;

      // Smooth audio modulation
      voiceSmoothRef.current += (voiceIntensity - voiceSmoothRef.current) * 0.2;
      const voiceMod = voiceSmoothRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Center reference coordinates
      const cx = width / 2;
      // Gentle floating hover
      const floatY = Math.sin(t * 1.5) * (mode === 'calm' ? 3 : 7) + (voiceMod * -8);
      const cy = height / 2 + floatY;

      // Scale multiplier (20-24% screen presence)
      const s = (width / 200) * (1 + voiceMod * 0.12);

      // Wing flapping dynamic angle
      const wingFlapSpeed = mode === 'energized' ? 4.5 : mode === 'calm' ? 1.2 : 2.2;
      const wingAngle = Math.sin(t * wingFlapSpeed) * (0.16 + voiceMod * 0.18);
      const wingSecondary = Math.cos(t * wingFlapSpeed * 1.2) * 0.08;

      // Draw subtle luminous fluid wake trail
      if (mode === 'energized' || mode === 'connecting' || voiceMod > 0.15) {
        if (Math.random() > 0.4) {
          trailPointsRef.current.push({
            x: cx + (Math.random() - 0.5) * 20 * s,
            y: cy + 15 * s + Math.random() * 10 * s,
            alpha: 0.6 + voiceMod * 0.4,
          });
        }
      }

      // Render & decay trails
      for (let i = trailPointsRef.current.length - 1; i >= 0; i--) {
        const pt = trailPointsRef.current[i];
        pt.y += 0.8 + voiceMod * 2;
        pt.alpha -= 0.015;
        if (pt.alpha <= 0) {
          trailPointsRef.current.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4 * s * pt.alpha, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(56, 189, 248, ${pt.alpha * 0.25})`;
          ctx.fill();
        }
      }

      // Spawn internal living liquid droplets/bubbles
      if (particlesRef.current.length < 18 && Math.random() > 0.6) {
        particlesRef.current.push({
          x: (Math.random() - 0.5) * 35 * s,
          y: (Math.random() - 0.5) * 25 * s,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.4 - Math.random() * 0.6,
          size: 1.2 + Math.random() * 2.5,
          alpha: 0.7,
          color: Math.random() > 0.5 ? palette.primary : palette.lavender,
          life: 0,
          maxLife: 40 + Math.random() * 50,
        });
      }

      ctx.save();
      ctx.translate(cx, cy);

      // Subtle gentle body tilt while flying
      const bodyTilt = Math.sin(t * 1.2) * 0.04;
      ctx.rotate(bodyTilt);

      // ==========================================
      // 🕊️ DRAW DOVE/PIGEON SILHOUETTE (LIVING WATER)
      // Anatomically: Head, small pointed beak, rounded neck,
      // chest, sleek body, 2 clear upward flight wings with feathers, distinct fanned tail.
      // ==========================================

      // 1. Back Wing (Left/Upper)
      ctx.save();
      ctx.translate(-5 * s, -12 * s);
      ctx.rotate(-wingAngle * 0.85 + 0.08);

      const backWingGrad = ctx.createLinearGradient(-30 * s, -50 * s, 10 * s, 10 * s);
      backWingGrad.addColorStop(0, palette.secondary);
      backWingGrad.addColorStop(0.5, palette.primary);
      backWingGrad.addColorStop(1, palette.deep);

      ctx.beginPath();
      // Wing root
      ctx.moveTo(0, 0);
      // Wing upper curved leading edge
      ctx.bezierCurveTo(-15 * s, -28 * s, -35 * s, -55 * s, -48 * s, -65 * s);
      // Outer primary feather tip 1
      ctx.bezierCurveTo(-45 * s, -62 * s, -38 * s, -48 * s, -34 * s, -40 * s);
      // Secondary feather tip 2
      ctx.bezierCurveTo(-30 * s, -35 * s, -24 * s, -24 * s, -18 * s, -15 * s);
      // Tertiary feather trailing edge back to base
      ctx.bezierCurveTo(-12 * s, -8 * s, -4 * s, -2 * s, 0, 0);
      ctx.closePath();

      ctx.fillStyle = backWingGrad;
      ctx.fill();

      // Wing edge refraction highlight
      ctx.strokeStyle = palette.highlight;
      ctx.lineWidth = 1.2 * s;
      ctx.stroke();
      ctx.restore();

      // 2. Distinct Fanned Tail Feathers (Lower Left)
      const tailGrad = ctx.createLinearGradient(-40 * s, 25 * s, -10 * s, 0);
      tailGrad.addColorStop(0, palette.secondary);
      tailGrad.addColorStop(0.6, palette.primary);
      tailGrad.addColorStop(1, palette.deep);

      ctx.save();
      const tailWag = Math.sin(t * 1.8) * 0.06;
      ctx.rotate(tailWag);

      ctx.beginPath();
      ctx.moveTo(-18 * s, 8 * s);
      // Fanned outer tail feather 1
      ctx.bezierCurveTo(-35 * s, 18 * s, -52 * s, 28 * s, -62 * s, 36 * s);
      ctx.bezierCurveTo(-55 * s, 32 * s, -48 * s, 24 * s, -42 * s, 20 * s);
      // Central tail feather 2
      ctx.bezierCurveTo(-52 * s, 26 * s, -58 * s, 30 * s, -64 * s, 30 * s);
      ctx.bezierCurveTo(-52 * s, 22 * s, -42 * s, 14 * s, -36 * s, 10 * s);
      // Lower tail feather 3 back to rump
      ctx.bezierCurveTo(-48 * s, 18 * s, -54 * s, 20 * s, -58 * s, 22 * s);
      ctx.bezierCurveTo(-45 * s, 12 * s, -30 * s, 4 * s, -14 * s, 2 * s);
      ctx.closePath();

      ctx.fillStyle = tailGrad;
      ctx.fill();
      ctx.strokeStyle = palette.highlight;
      ctx.lineWidth = 1.1 * s;
      ctx.stroke();
      ctx.restore();

      // 3. Main Pigeon Body (Chest, rounded neck, belly, sleek posture)
      const bodyGrad = ctx.createRadialGradient(8 * s, -4 * s, 4 * s, 0, 0, 45 * s);
      bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)'); // translucent core
      bodyGrad.addColorStop(0.3, palette.primary);
      bodyGrad.addColorStop(0.7, palette.secondary);
      bodyGrad.addColorStop(1, palette.deep);

      // Water surface wave distortion (subtle liquid living motion)
      const waveD1 = Math.sin(t * 3.5) * (1.2 + voiceMod * 2.8) * s;
      const waveD2 = Math.cos(t * 2.8) * (1.0 + voiceMod * 2.2) * s;

      ctx.beginPath();
      // Start at back near tail
      ctx.moveTo(-20 * s, 5 * s);
      // Sleek back line up to neck base
      ctx.bezierCurveTo(-14 * s, -2 * s, -6 * s, -10 * s + waveD1, 2 * s, -16 * s);
      // Rounded neck curving up to back of head
      ctx.bezierCurveTo(8 * s, -22 * s, 15 * s, -28 * s, 24 * s, -27 * s);
      // Distinct rounded pigeon crown / head
      ctx.bezierCurveTo(30 * s, -26 * s, 36 * s, -21 * s, 37 * s, -15 * s);
      // Small pointed dove beak 🕊️
      ctx.lineTo(46 * s + waveD2 * 0.4, -13 * s); // pointed beak tip
      ctx.lineTo(36 * s, -10 * s); // beak base
      // Rounded throat and plump chest
      ctx.bezierCurveTo(35 * s, -4 * s, 33 * s, 4 * s, 26 * s, 10 * s + waveD1);
      // Curving full breast / chest
      ctx.bezierCurveTo(18 * s, 18 * s + waveD2, 6 * s, 20 * s, -6 * s, 17 * s);
      // Belly line tapering back to tail base
      ctx.bezierCurveTo(-14 * s, 15 * s, -18 * s, 10 * s, -20 * s, 5 * s);
      ctx.closePath();

      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Fluid glass-like surface highlights & refractions
      ctx.strokeStyle = palette.highlight;
      ctx.lineWidth = (1.5 + voiceMod * 0.8) * s;
      ctx.stroke();

      // 4. Front Main Wing (Spanning majestically upwards)
      ctx.save();
      ctx.translate(2 * s, -6 * s);
      ctx.rotate(wingAngle + wingSecondary);

      const frontWingGrad = ctx.createLinearGradient(0, 0, 45 * s, -65 * s);
      frontWingGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      frontWingGrad.addColorStop(0.3, palette.primary);
      frontWingGrad.addColorStop(0.7, palette.secondary);
      frontWingGrad.addColorStop(1, palette.lavender);

      ctx.beginPath();
      // Wing shoulder
      ctx.moveTo(0, 0);
      // Leading wing curve sweeping high
      ctx.bezierCurveTo(14 * s, -22 * s, 32 * s, -52 * s, 46 * s + waveD1, -68 * s);
      // Primary flight feather tip 1
      ctx.bezierCurveTo(42 * s, -62 * s, 34 * s, -48 * s, 30 * s, -40 * s);
      // Primary flight feather tip 2
      ctx.bezierCurveTo(28 * s, -36 * s, 22 * s, -26 * s, 18 * s, -18 * s);
      // Secondary flight feather tip 3
      ctx.bezierCurveTo(15 * s, -14 * s, 8 * s, -6 * s, 4 * s, 2 * s);
      // Wing base curve
      ctx.bezierCurveTo(1 * s, 4 * s, -2 * s, 2 * s, 0, 0);
      ctx.closePath();

      ctx.fillStyle = frontWingGrad;
      ctx.fill();

      // Wing feather shaft caustics (living water highlights)
      ctx.strokeStyle = palette.highlight;
      ctx.lineWidth = 1.6 * s;
      ctx.stroke();

      // Inner wing water current streaks
      ctx.beginPath();
      ctx.moveTo(8 * s, -8 * s);
      ctx.bezierCurveTo(18 * s, -26 * s, 28 * s, -44 * s, 38 * s, -58 * s);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 0.9 * s;
      ctx.stroke();
      ctx.restore();

      // 5. Internal Flow Currents & Living Bubbles inside pigeon body
      ctx.save();
      // Clip to body area for internal current flow
      particlesRef.current.forEach((p, idx) => {
        p.life++;
        p.x += p.vx + Math.sin(t * 2 + p.y * 0.1) * 0.4;
        p.y += p.vy - voiceMod * 0.8;
        const pAlpha = (1 - p.life / p.maxLife) * p.alpha;

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(idx, 1);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * s, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = pAlpha;
          ctx.fill();

          // Tiny bubble gleam
          ctx.beginPath();
          ctx.arc(p.x - p.size * 0.3 * s, p.y - p.size * 0.3 * s, p.size * 0.35 * s, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fill();
        }
      });
      ctx.restore();

      // 6. Pigeon Living Water Eye (Subtle pearl aqua focal gleam)
      ctx.beginPath();
      ctx.arc(28 * s, -18 * s, 2.2 * s, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(14, 116, 144, 0.9)'; // deep aquatic pupil
      ctx.fill();
      // Eye refraction highlight
      ctx.beginPath();
      ctx.arc(27.4 * s, -18.6 * s, 0.9 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // 7. Chest Caustic Highlight & Refraction Sheen
      ctx.beginPath();
      ctx.moveTo(16 * s, -4 * s);
      ctx.bezierCurveTo(24 * s, 4 * s, 20 * s, 12 * s, 10 * s, 16 * s);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.8 * s;
      ctx.stroke();

      // Voice-reactive ripple waves around pigeon
      if (voiceMod > 0.05) {
        ctx.save();
        for (let r = 1; r <= 3; r++) {
          const rippleRad = (30 + r * 16 + (t * 25) % 30) * s;
          const rAlpha = Math.max(0, (1 - rippleRad / (80 * s)) * voiceMod * 0.4);
          ctx.beginPath();
          ctx.ellipse(0, 0, rippleRad * 1.2, rippleRad * 0.7, -0.2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${rAlpha})`;
          ctx.lineWidth = 1.2 * s;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 8. Unlocked & Equipped Liquid Pigeon Cosmetics
      const activeCosmetics = equippedCosmetics !== undefined
        ? equippedCosmetics
        : featherSystem.getEquipped();
      drawEquippedCosmetics(ctx, activeCosmetics, s, t, { x: 26 * s, y: -22 * s });

      ctx.restore(); // restore translate cx, cy
      ctx.restore(); // restore scale dpr

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [size, mode, accentColor, voiceIntensity, equippedCosmetics]);

  return (
    <div
      className={`relative flex items-center justify-center select-none ${interactive ? 'cursor-pointer active:scale-95 transition-transform' : ''} ${className}`}
      onClick={onClick}
    >
      <canvas ref={canvasRef} className="block pointer-events-none" />
    </div>
  );
};
