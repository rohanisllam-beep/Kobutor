/**
 * Procedural Cosmetic Renderer for Kobutor Liquid Pigeon
 * Seamlessly layers unlocked accessories onto the Liquid Dove canvas.
 */

export type CosmeticId = 'cap' | 'glasses' | 'bag' | 'sparkle' | 'rainbow_wings' | 'crown';

export interface CosmeticItem {
  id: CosmeticId;
  name: string;
  nameBangla: string;
  price: number;
  icon: string;
  category: 'head' | 'eyes' | 'accessory' | 'aura' | 'wings';
  description: string;
  descriptionBangla: string;
}

export const COSMETIC_CATALOG: CosmeticItem[] = [
  {
    id: 'cap',
    name: 'Cute Cap',
    nameBangla: 'কিউট ক্যাপ',
    price: 30,
    icon: '🧢',
    category: 'head',
    description: 'A stylish oceanic cap with a curved visor.',
    descriptionBangla: 'মাথায় স্টাইলিশ সমুদ্রের নীল রঙের কিউট ক্যাপ।',
  },
  {
    id: 'glasses',
    name: 'Glasses',
    nameBangla: 'চশমা',
    price: 40,
    icon: '👓',
    category: 'eyes',
    description: 'Chic round golden spectacles with glassy reflection.',
    descriptionBangla: 'চোখে মিষ্টি গোল ফ্রেমের চকচকে চশমা।',
  },
  {
    id: 'bag',
    name: 'Mini Bag',
    nameBangla: 'মিনি ব্যাগ',
    price: 50,
    icon: '🎒',
    category: 'accessory',
    description: 'A tiny adventurer satchel strapped across the chest.',
    descriptionBangla: 'পিঠে ঝোলানো ছোট্ট অ্যাডভেঞ্চার স্যাচেল ব্যাগ।',
  },
  {
    id: 'sparkle',
    name: 'Sparkle Effect',
    nameBangla: 'স্পার্কল এফেক্ট',
    price: 60,
    icon: '✨',
    category: 'aura',
    description: 'Delicate golden starlight particles floating around.',
    descriptionBangla: 'চারপাশে ঘুরে বেড়ানো জাদুকরী চকচকে তারার আলো।',
  },
  {
    id: 'rainbow_wings',
    name: 'Colorful Wing Effect',
    nameBangla: 'রঙিন ডানার আভা',
    price: 80,
    icon: '🌈',
    category: 'wings',
    description: 'Prismatic iridescent rainbow shimmer on the wings.',
    descriptionBangla: 'ডানায় বর্ণিল রামধনু তরঙ্গের ঝলকানি ও দ্যুতি।',
  },
  {
    id: 'crown',
    name: 'Tiny Crown',
    nameBangla: 'ছোট্ট মুকুট',
    price: 100,
    icon: '👑',
    category: 'head',
    description: 'A regal royal golden crown with jewel pearls.',
    descriptionBangla: 'মাথায় রাজকীয় সোনালী মুকুট ও মণিমুক্তো।',
  },
];

/**
 * Draws equipped cosmetics in the local coordinate space of the pigeon.
 * Assumes the origin (0, 0) is the center of the pigeon body.
 * 
 * @param ctx CanvasRenderingContext2D
 * @param equipped Array of active cosmetic IDs
 * @param s Scale factor (e.g. size / 200)
 * @param t Time elapsed in seconds (for animations like sparkles)
 * @param headPos Optional head anchor coordinates [x, y]
 */
export function drawEquippedCosmetics(
  ctx: CanvasRenderingContext2D,
  equipped: string[],
  s: number,
  t: number,
  headPos: { x: number; y: number } = { x: 26 * s, y: -22 * s }
) {
  if (!equipped || equipped.length === 0) return;

  const hasItem = (id: CosmeticId) => equipped.includes(id);

  // 1. ✨ SPARKLE EFFECT (Aura around the dove)
  if (hasItem('sparkle')) {
    ctx.save();
    const sparkles = [
      { baseAngle: 0.2, dist: 45 * s, speed: 1.4, size: 3.5 * s },
      { baseAngle: 1.8, dist: 52 * s, speed: 1.1, size: 4.2 * s },
      { baseAngle: 3.4, dist: 48 * s, speed: 1.6, size: 3.0 * s },
      { baseAngle: 4.9, dist: 55 * s, speed: 1.3, size: 4.5 * s },
      { baseAngle: 5.8, dist: 38 * s, speed: 1.8, size: 3.2 * s },
    ];

    sparkles.forEach((sp, idx) => {
      const angle = sp.baseAngle + t * sp.speed * 0.4;
      const distance = sp.dist + Math.sin(t * 2.5 + idx) * (6 * s);
      const px = Math.cos(angle) * distance;
      const py = Math.sin(angle) * (distance * 0.75); // slight oval
      const pulse = 0.6 + Math.sin(t * 4 + idx * 1.5) * 0.4;
      const curSize = sp.size * pulse;

      // 4-point diamond star
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(t * 1.2 + idx);

      ctx.beginPath();
      ctx.moveTo(0, -curSize);
      ctx.quadraticCurveTo(0, 0, curSize, 0);
      ctx.quadraticCurveTo(0, 0, 0, curSize);
      ctx.quadraticCurveTo(0, 0, -curSize, 0);
      ctx.quadraticCurveTo(0, 0, 0, -curSize);
      ctx.closePath();

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, curSize);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#fef08a'); // soft gold
      grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.85 * pulse;
      ctx.fill();

      // Tiny center gleaming dot
      ctx.beginPath();
      ctx.arc(0, 0, 0.8 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    });
    ctx.restore();
  }

  // 2. 🎒 MINI BAG (Satchel on back / shoulder with chest strap)
  if (hasItem('bag')) {
    ctx.save();
    // Satchel body positioned on upper back
    const bagX = -6 * s;
    const bagY = 2 * s;
    const bagW = 14 * s;
    const bagH = 15 * s;

    // Diagonal chest strap
    ctx.beginPath();
    ctx.moveTo(bagX + 4 * s, bagY - 4 * s);
    ctx.quadraticCurveTo(6 * s, 0, 14 * s, 6 * s);
    ctx.strokeStyle = '#92400e'; // rich warm leather
    ctx.lineWidth = 2.2 * s;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Satchel base (rounded pouch)
    ctx.beginPath();
    ctx.roundRect(bagX - bagW / 2, bagY, bagW, bagH, 3.5 * s);
    const bagGrad = ctx.createLinearGradient(bagX, bagY, bagX + bagW, bagY + bagH);
    bagGrad.addColorStop(0, '#b45309');
    bagGrad.addColorStop(0.5, '#d97706');
    bagGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = bagGrad;
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.0 * s;
    ctx.stroke();

    // Satchel flap
    ctx.beginPath();
    ctx.moveTo(bagX - bagW / 2, bagY + 2 * s);
    ctx.lineTo(bagX + bagW / 2, bagY + 2 * s);
    ctx.lineTo(bagX + bagW / 2, bagY + 7 * s);
    ctx.lineTo(bagX, bagY + 9 * s); // pointed flap tip
    ctx.lineTo(bagX - bagW / 2, bagY + 7 * s);
    ctx.closePath();
    ctx.fillStyle = '#92400e';
    ctx.fill();

    // Mini golden buckle
    ctx.beginPath();
    ctx.arc(bagX, bagY + 7.5 * s, 1.4 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 0.6 * s;
    ctx.stroke();

    ctx.restore();
  }

  // 3. 👓 GLASSES (Chic spectacles over eye)
  if (hasItem('glasses')) {
    ctx.save();
    // Eye is near (26*s, -16*s)
    const eyeX = headPos.x + 1 * s;
    const eyeY = headPos.y + 6 * s;
    const glassR = 4.8 * s;

    // Round lens frame
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, glassR, 0, Math.PI * 2);
    ctx.strokeStyle = '#d97706'; // gold rim
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();

    // Lens glass tint & reflection gleam
    ctx.fillStyle = 'rgba(224, 247, 250, 0.45)';
    ctx.fill();

    // Lens glare reflection
    ctx.beginPath();
    ctx.arc(eyeX - 1.2 * s, eyeY - 1.2 * s, 1.8 * s, -0.6, 0.8);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.2 * s;
    ctx.stroke();

    // Nose bridge pointing left
    ctx.beginPath();
    ctx.moveTo(eyeX - glassR, eyeY);
    ctx.quadraticCurveTo(eyeX - glassR - 2 * s, eyeY - 1.5 * s, eyeX - glassR - 4 * s, eyeY);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.4 * s;
    ctx.stroke();

    // Ear temple arm extending back along head
    ctx.beginPath();
    ctx.moveTo(eyeX + glassR * 0.8, eyeY - glassR * 0.4);
    ctx.lineTo(eyeX - 14 * s, eyeY - 4 * s);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.2 * s;
    ctx.stroke();

    ctx.restore();
  }

  // 4. 🧢 CUTE CAP (Sporty curved cap on crown)
  if (hasItem('cap')) {
    ctx.save();
    const capX = headPos.x - 2 * s;
    const capY = headPos.y - 1 * s;

    // Cap Dome (rounded skull cap)
    ctx.beginPath();
    ctx.moveTo(capX - 12 * s, capY + 3 * s);
    ctx.quadraticCurveTo(capX - 4 * s, capY - 11 * s, capX + 7 * s, capY - 2 * s);
    ctx.quadraticCurveTo(capX, capY + 2 * s, capX - 12 * s, capY + 3 * s);
    ctx.closePath();

    const capGrad = ctx.createLinearGradient(capX - 10 * s, capY - 10 * s, capX + 6 * s, capY + 4 * s);
    capGrad.addColorStop(0, '#0284c7'); // Vibrant cyan/sky
    capGrad.addColorStop(0.6, '#0369a1');
    capGrad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = capGrad;
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.0 * s;
    ctx.stroke();

    // Cap Visor / Bill extending forward over beak
    ctx.beginPath();
    ctx.moveTo(capX + 4 * s, capY);
    ctx.quadraticCurveTo(capX + 16 * s, capY - 2 * s, capX + 18 * s, capY + 2 * s);
    ctx.quadraticCurveTo(capX + 10 * s, capY + 3 * s, capX + 3 * s, capY + 2.5 * s);
    ctx.closePath();
    ctx.fillStyle = '#0f172a'; // contrast dark brim
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 0.8 * s;
    ctx.stroke();

    // Button on top of cap
    ctx.beginPath();
    ctx.arc(capX - 3 * s, capY - 8 * s, 1.6 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    ctx.restore();
  }

  // 5. 👑 TINY CROWN (Royal golden mini crown)
  if (hasItem('crown')) {
    ctx.save();
    const crX = headPos.x - 2 * s;
    const crY = headPos.y - 4 * s;
    const crW = 16 * s;
    const crH = 11 * s;

    // Crown Base & 3 Peaks
    ctx.beginPath();
    // Base bottom line
    ctx.moveTo(crX - crW / 2, crY + 1 * s);
    ctx.lineTo(crX + crW / 2, crY + 1 * s);
    // Right side
    ctx.lineTo(crX + crW / 2 + 1 * s, crY - crH * 0.7);
    // Valley between right & center
    ctx.lineTo(crX + crW * 0.22, crY - crH * 0.3);
    // Center tall peak
    ctx.lineTo(crX, crY - crH);
    // Valley between center & left
    ctx.lineTo(crX - crW * 0.22, crY - crH * 0.3);
    // Left peak
    ctx.lineTo(crX - crW / 2 - 1 * s, crY - crH * 0.7);
    ctx.closePath();

    const crownGrad = ctx.createLinearGradient(crX, crY - crH, crX, crY + 2 * s);
    crownGrad.addColorStop(0, '#fef08a'); // soft bright gold
    crownGrad.addColorStop(0.5, '#f59e0b'); // rich amber gold
    crownGrad.addColorStop(1, '#b45309'); // shadow gold
    ctx.fillStyle = crownGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.0 * s;
    ctx.stroke();

    // Crown Jewels (3 tiny pearl gems on peak tips)
    const peaks = [
      { x: crX - crW / 2 - 1 * s, y: crY - crH * 0.7, color: '#ef4444' }, // Ruby
      { x: crX, y: crY - crH, color: '#38bdf8' },                       // Diamond Aqua
      { x: crX + crW / 2 + 1 * s, y: crY - crH * 0.7, color: '#10b981' }, // Emerald
    ];

    peaks.forEach((pk) => {
      ctx.beginPath();
      ctx.arc(pk.x, pk.y - 1.2 * s, 1.4 * s, 0, Math.PI * 2);
      ctx.fillStyle = pk.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.6 * s;
      ctx.stroke();
    });

    // Crown base ribbon / headband
    ctx.beginPath();
    ctx.rect(crX - crW / 2, crY - 1 * s, crW, 2.2 * s);
    ctx.fillStyle = '#dc2626'; // velvet red trim
    ctx.fill();

    ctx.restore();
  }

  // 6. 🌈 COLORFUL WING EFFECT (Prismatic Wing Caustic overlay)
  if (hasItem('rainbow_wings')) {
    ctx.save();
    // Prismatic aura along upper body & wing junction
    const wingCausticGrad = ctx.createLinearGradient(0, -50 * s, 40 * s, -10 * s);
    wingCausticGrad.addColorStop(0.0, 'rgba(239, 68, 68, 0.45)');   // Red
    wingCausticGrad.addColorStop(0.2, 'rgba(249, 115, 22, 0.45)');  // Orange
    wingCausticGrad.addColorStop(0.4, 'rgba(234, 179, 8, 0.45)');   // Yellow
    wingCausticGrad.addColorStop(0.6, 'rgba(34, 197, 94, 0.45)');   // Green
    wingCausticGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.55)');  // Cyan
    wingCausticGrad.addColorStop(1.0, 'rgba(168, 85, 247, 0.45)');  // Purple

    ctx.beginPath();
    ctx.arc(4 * s, -12 * s, 26 * s, 0, Math.PI * 2);
    ctx.fillStyle = wingCausticGrad;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fill();
    ctx.restore();
  }
}
