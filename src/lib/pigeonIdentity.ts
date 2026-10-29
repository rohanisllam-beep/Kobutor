/**
 * 🕊️ KOBUTOR ANONYMOUS PIGEON IDENTITY SYSTEM
 * Every user gets a unique, recognizable visual Liquid Pigeon identity + anonymous ID.
 * Examples: 🕊️ #A7F2, 🕊️ #K83B, 🕊️ #M49C
 *
 * Visually different pigeons while strictly preserving the Kobutor design language:
 * - Deterministic color palettes (Ocean Aqua, Lavender Cloud, Emerald Mist, Sunset Amber, Celestial Indigo, Rose Quartz)
 * - Subtle variations in wing shape, crown accent, tail style, and idle shimmer
 * - Poetic anonymous titles (e.g. 'শান্ত পথিক', 'কথার কারিগর', 'নক্ষত্র কবুতর')
 * - STRICT PRIVACY: NEVER reveals real name, photo, phone, exact location, or private data.
 */

export interface PigeonTrait {
  id: string;
  paletteKey: 'ocean_aqua' | 'lavender_cloud' | 'emerald_mist' | 'sunset_amber' | 'celestial_indigo' | 'rose_quartz';
  paletteName: string;
  paletteBangla: string;
  primaryColor: string;
  secondaryColor: string;
  deepColor: string;
  coreColor: string;
  glowColor: string;
  wingStyle: 'classic' | 'elongated' | 'streamlined' | 'angelic';
  crestStyle: 'pearl_dot' | 'starlight' | 'feather_crest' | 'halo';
  tailStyle: 'fanned' | 'tri_feather' | 'sleek';
  titleBangla: string;
  titleEnglish: string;
}

const PALETTES: Record<PigeonTrait['paletteKey'], {
  name: string;
  nameBangla: string;
  primary: string;
  secondary: string;
  deep: string;
  core: string;
  glow: string;
}> = {
  ocean_aqua: {
    name: 'Ocean Aqua',
    nameBangla: 'সাগর নীল',
    primary: 'rgba(56, 189, 248, 0.92)',
    secondary: 'rgba(165, 243, 252, 0.88)',
    deep: 'rgba(14, 116, 144, 0.75)',
    core: 'rgba(255, 255, 255, 0.96)',
    glow: 'rgba(56, 189, 248, 0.35)',
  },
  lavender_cloud: {
    name: 'Lavender Cloud',
    nameBangla: 'ল্যাভেন্ডার মেঘ',
    primary: 'rgba(168, 85, 247, 0.92)',
    secondary: 'rgba(233, 213, 255, 0.88)',
    deep: 'rgba(126, 34, 206, 0.75)',
    core: 'rgba(255, 255, 255, 0.96)',
    glow: 'rgba(192, 132, 252, 0.35)',
  },
  emerald_mist: {
    name: 'Emerald Mist',
    nameBangla: 'পান্না কুয়াশা',
    primary: 'rgba(52, 211, 153, 0.92)',
    secondary: 'rgba(167, 243, 208, 0.88)',
    deep: 'rgba(5, 150, 105, 0.75)',
    core: 'rgba(255, 255, 255, 0.96)',
    glow: 'rgba(52, 211, 153, 0.35)',
  },
  sunset_amber: {
    name: 'Sunset Amber',
    nameBangla: 'সন্ধ্যা রক্তিম',
    primary: 'rgba(251, 146, 60, 0.92)',
    secondary: 'rgba(254, 215, 170, 0.88)',
    deep: 'rgba(194, 65, 12, 0.75)',
    core: 'rgba(255, 255, 255, 0.96)',
    glow: 'rgba(251, 146, 60, 0.35)',
  },
  celestial_indigo: {
    name: 'Celestial Indigo',
    nameBangla: 'মহাজাগতিক নীল',
    primary: 'rgba(99, 102, 241, 0.92)',
    secondary: 'rgba(199, 210, 254, 0.88)',
    deep: 'rgba(67, 56, 202, 0.75)',
    core: 'rgba(255, 255, 255, 0.96)',
    glow: 'rgba(99, 102, 241, 0.35)',
  },
  rose_quartz: {
    name: 'Rose Quartz',
    nameBangla: 'গোলাপি স্ফটিক',
    primary: 'rgba(244, 114, 182, 0.92)',
    secondary: 'rgba(252, 231, 243, 0.88)',
    deep: 'rgba(190, 24, 93, 0.75)',
    core: 'rgba(255, 255, 255, 0.96)',
    glow: 'rgba(244, 114, 182, 0.35)',
  },
};

const TITLES = [
  { bangla: 'শান্ত পথিক', english: 'Gentle Voyager' },
  { bangla: 'কথার কারিগর', english: 'Story Weaver' },
  { bangla: 'নক্ষত্র কবুতর', english: 'Star Dove' },
  { bangla: 'হাসির সাথী', english: 'Joyful Companion' },
  { bangla: 'রাতের পরিব্রাজক', english: 'Midnight Wanderer' },
  { bangla: 'মায়ার সুর', english: 'Echo of Warmth' },
  { bangla: 'গভীর শ্রোতা', english: 'Deep Listener' },
  { bangla: 'সকালের স্নিগ্ধতা', english: 'Morning Glow' },
];

const STORAGE_KEY = 'kobutor_anonymous_identity_v1';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getOrGenerateMyPigeonIdentity(): PigeonTrait {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}

  // Generate a random, elegant 4-character hex ID
  const hex = Math.floor(0x1000 + Math.random() * 0xefff).toString(16).toUpperCase();
  const id = `🕊️ #${hex}`;
  const trait = derivePigeonTrait(id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trait));
  } catch (e) {}

  return trait;
}

export function derivePigeonTrait(anonymousId: string): PigeonTrait {
  const hash = hashString(anonymousId);
  const paletteKeys = Object.keys(PALETTES) as PigeonTrait['paletteKey'][];
  const paletteKey = paletteKeys[hash % paletteKeys.length];
  const pal = PALETTES[paletteKey];

  const wingStyles: PigeonTrait['wingStyle'][] = ['classic', 'elongated', 'streamlined', 'angelic'];
  const crestStyles: PigeonTrait['crestStyle'][] = ['pearl_dot', 'starlight', 'feather_crest', 'halo'];
  const tailStyles: PigeonTrait['tailStyle'][] = ['fanned', 'tri_feather', 'sleek'];

  const wingStyle = wingStyles[(hash >> 2) % wingStyles.length];
  const crestStyle = crestStyles[(hash >> 4) % crestStyles.length];
  const tailStyle = tailStyles[(hash >> 6) % tailStyles.length];
  const title = TITLES[(hash >> 8) % TITLES.length];

  return {
    id: anonymousId,
    paletteKey,
    paletteName: pal.name,
    paletteBangla: pal.nameBangla,
    primaryColor: pal.primary,
    secondaryColor: pal.secondary,
    deepColor: pal.deep,
    coreColor: pal.core,
    glowColor: pal.glow,
    wingStyle,
    crestStyle,
    tailStyle,
    titleBangla: title.bangla,
    titleEnglish: title.english,
  };
}

/**
 * Render a recognizable mini Liquid Pigeon on any 2D canvas context
 */
export function drawRecognizablePigeon(
  ctx: CanvasRenderingContext2D,
  trait: PigeonTrait,
  centerX: number,
  centerY: number,
  scale: number = 0.8,
  timeSec: number = 0
) {
  ctx.save();
  ctx.translate(centerX, centerY);

  const s = scale;
  const wingPhase = Math.sin(timeSec * 3.5);

  // 1. Wing
  ctx.save();
  ctx.translate(-4 * s, -8 * s);
  ctx.rotate(-wingPhase * 0.45);

  const wingGrad = ctx.createLinearGradient(-20 * s, -35 * s, 10 * s, 10 * s);
  wingGrad.addColorStop(0, trait.secondaryColor);
  wingGrad.addColorStop(0.6, trait.primaryColor);
  wingGrad.addColorStop(1, trait.deepColor);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  if (trait.wingStyle === 'elongated') {
    ctx.bezierCurveTo(-12 * s, -20 * s, -30 * s, -50 * s, -45 * s, -60 * s);
    ctx.bezierCurveTo(-38 * s, -45 * s, -28 * s, -30 * s, -18 * s, -15 * s);
  } else if (trait.wingStyle === 'angelic') {
    ctx.bezierCurveTo(-14 * s, -22 * s, -26 * s, -44 * s, -38 * s, -52 * s);
    ctx.bezierCurveTo(-32 * s, -46 * s, -28 * s, -36 * s, -22 * s, -28 * s);
    ctx.bezierCurveTo(-26 * s, -22 * s, -18 * s, -14 * s, -12 * s, -8 * s);
  } else {
    ctx.bezierCurveTo(-12 * s, -18 * s, -25 * s, -38 * s, -35 * s, -46 * s);
    ctx.bezierCurveTo(-30 * s, -38 * s, -22 * s, -26 * s, -16 * s, -18 * s);
  }
  ctx.closePath();
  ctx.fillStyle = wingGrad;
  ctx.fill();
  ctx.strokeStyle = trait.coreColor;
  ctx.lineWidth = 1 * s;
  ctx.stroke();
  ctx.restore();

  // 2. Tail Feathers
  ctx.save();
  const tailGrad = ctx.createLinearGradient(-30 * s, 15 * s, 0, 0);
  tailGrad.addColorStop(0, trait.secondaryColor);
  tailGrad.addColorStop(0.7, trait.primaryColor);
  tailGrad.addColorStop(1, trait.deepColor);

  ctx.beginPath();
  ctx.moveTo(-14 * s, 5 * s);
  if (trait.tailStyle === 'tri_feather') {
    ctx.bezierCurveTo(-28 * s, 14 * s, -40 * s, 20 * s, -50 * s, 26 * s);
    ctx.bezierCurveTo(-42 * s, 20 * s, -32 * s, 12 * s, -26 * s, 6 * s);
    ctx.bezierCurveTo(-36 * s, 12 * s, -42 * s, 14 * s, -46 * s, 15 * s);
    ctx.bezierCurveTo(-34 * s, 8 * s, -22 * s, 2 * s, -12 * s, 2 * s);
  } else {
    ctx.bezierCurveTo(-24 * s, 12 * s, -36 * s, 18 * s, -44 * s, 22 * s);
    ctx.bezierCurveTo(-36 * s, 16 * s, -28 * s, 10 * s, -22 * s, 4 * s);
  }
  ctx.closePath();
  ctx.fillStyle = tailGrad;
  ctx.fill();
  ctx.restore();

  // 3. Main Pigeon Body
  const bodyGrad = ctx.createRadialGradient(4 * s, -2 * s, 2 * s, 0, 0, 30 * s);
  bodyGrad.addColorStop(0, trait.coreColor);
  bodyGrad.addColorStop(0.35, trait.secondaryColor);
  bodyGrad.addColorStop(0.8, trait.primaryColor);
  bodyGrad.addColorStop(1, trait.deepColor);

  ctx.beginPath();
  ctx.moveTo(-16 * s, 4 * s);
  ctx.bezierCurveTo(-10 * s, -2 * s, -4 * s, -6 * s, 2 * s, -12 * s);
  ctx.bezierCurveTo(6 * s, -16 * s, 12 * s, -20 * s, 18 * s, -19 * s);
  ctx.bezierCurveTo(22 * s, -18 * s, 26 * s, -15 * s, 27 * s, -10 * s);
  // Beak
  ctx.lineTo(34 * s, -9 * s);
  ctx.lineTo(26 * s, -6 * s);
  // Chest
  ctx.bezierCurveTo(24 * s, 4 * s, 16 * s, 14 * s, 4 * s, 16 * s);
  ctx.bezierCurveTo(-6 * s, 16 * s, -12 * s, 12 * s, -16 * s, 4 * s);
  ctx.closePath();
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = trait.coreColor;
  ctx.lineWidth = 1 * s;
  ctx.stroke();

  // 4. Eye
  ctx.beginPath();
  ctx.arc(22 * s, -12 * s, 1.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Eye reflection dot
  ctx.beginPath();
  ctx.arc(22.5 * s, -12.5 * s, 0.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // 5. Crown / Crest Accent
  if (trait.crestStyle === 'starlight') {
    ctx.beginPath();
    ctx.arc(20 * s, -21 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (trait.crestStyle === 'feather_crest') {
    ctx.beginPath();
    ctx.moveTo(17 * s, -19 * s);
    ctx.bezierCurveTo(18 * s, -25 * s, 21 * s, -28 * s, 23 * s, -26 * s);
    ctx.bezierCurveTo(21 * s, -23 * s, 20 * s, -20 * s, 19 * s, -19 * s);
    ctx.fillStyle = trait.secondaryColor;
    ctx.fill();
  } else if (trait.crestStyle === 'halo') {
    ctx.beginPath();
    ctx.ellipse(19 * s, -22 * s, 5 * s, 2 * s, -0.2, 0, Math.PI * 2);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1 * s;
    ctx.stroke();
  }

  ctx.restore();
}
