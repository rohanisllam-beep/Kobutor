/**
 * 🪶 KOBUTOR FEATHERS REWARD & CUSTOMIZATION SYSTEM
 * Non-intrusive, persistent client-side cosmetic reward economy.
 */

import { COSMETIC_CATALOG, CosmeticId, CosmeticItem } from './pigeonCosmetics';
import { liquidAudio } from './audioSynth';

const STORAGE_KEY = 'kobutor_feathers_v2';

export interface FeatherTransaction {
  id: string;
  amount: number;
  type: 'earn' | 'spend';
  title: string;
  titleBangla: string;
  timestamp: number;
}

export interface FeatherState {
  balance: number;
  xp: number;
  level: number;
  unlocked: CosmeticId[];
  equipped: CosmeticId[];
  history: FeatherTransaction[];
  hasSeenFirstCelebration: boolean;
  rewardedFlags: {
    firstConnection?: boolean;
    firstGame?: boolean;
    firstReaction?: boolean;
    firstIcebreaker?: boolean;
    firstSurprise?: boolean;
    lastDailyDate?: string;
  };
}

export interface LevelInfo {
  level: number;
  titleBangla: string;
  titleEnglish: string;
  currentXp: number;
  nextLevelXp: number;
  progressPercent: number;
}

export function calculateLevelInfo(xp: number): LevelInfo {
  if (xp < 100) {
    return {
      level: 1,
      titleBangla: 'নবাগত ঘুঘু',
      titleEnglish: 'Novice Kobutor',
      currentXp: xp,
      nextLevelXp: 100,
      progressPercent: Math.min(100, Math.round((xp / 100) * 100)),
    };
  } else if (xp < 250) {
    return {
      level: 2,
      titleBangla: 'সঙ্গী পায়রা',
      titleEnglish: 'Companion Kobutor',
      currentXp: xp - 100,
      nextLevelXp: 150,
      progressPercent: Math.min(100, Math.round(((xp - 100) / 150) * 100)),
    };
  } else if (xp < 500) {
    return {
      level: 3,
      titleBangla: 'হৃদয় পায়রা',
      titleEnglish: 'Heart Kobutor',
      currentXp: xp - 250,
      nextLevelXp: 250,
      progressPercent: Math.min(100, Math.round(((xp - 250) / 250) * 100)),
    };
  } else if (xp < 1000) {
    return {
      level: 4,
      titleBangla: 'উড়ন্ত কবুতর',
      titleEnglish: 'Soaring Kobutor',
      currentXp: xp - 500,
      nextLevelXp: 500,
      progressPercent: Math.min(100, Math.round(((xp - 500) / 500) * 100)),
    };
  } else {
    return {
      level: 5,
      titleBangla: 'স্বর্ণালী পায়রা',
      titleEnglish: 'Golden Kobutor',
      currentXp: xp - 1000,
      nextLevelXp: 1000,
      progressPercent: 100,
    };
  }
}

export interface FeatherAnimationEvent {
  id: string;
  amount: number;
  type: 'earn' | 'spend';
  title: string;
  titleBangla?: string;
  xpBonus?: number;
}

type Listener = (state: FeatherState, anim?: FeatherAnimationEvent) => void;
const listeners = new Set<Listener>();

// Default state: New users receive an initial welcome gift of 50 Feathers + 50 XP!
const DEFAULT_STATE: FeatherState = {
  balance: 50,
  xp: 50,
  level: 1,
  unlocked: [],
  equipped: [],
  history: [
    {
      id: 'welcome-bonus',
      amount: 50,
      type: 'earn',
      title: 'Welcome Gift',
      titleBangla: 'স্বাগতম উপহার',
      timestamp: Date.now(),
    },
  ],
  hasSeenFirstCelebration: false,
  rewardedFlags: {},
};

function loadState(): FeatherState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    const xp = typeof parsed.xp === 'number' ? parsed.xp : 50;
    const levelInfo = calculateLevelInfo(xp);
    return {
      balance: typeof parsed.balance === 'number' ? parsed.balance : 50,
      xp,
      level: levelInfo.level,
      unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : [],
      equipped: Array.isArray(parsed.equipped) ? parsed.equipped : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      hasSeenFirstCelebration: !!parsed.hasSeenFirstCelebration,
      rewardedFlags: parsed.rewardedFlags || {},
    };
  } catch (err) {
    console.warn('Failed to parse feather state:', err);
    return { ...DEFAULT_STATE };
  }
}

let currentState: FeatherState = loadState();

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  } catch (err) {
    console.warn('Failed to persist feather state:', err);
  }
}

function notify(anim?: FeatherAnimationEvent) {
  persistState();
  listeners.forEach((fn) => fn({ ...currentState }, anim));
}

export const featherSystem = {
  /**
   * Subscribe to feather balance & cosmetic updates
   */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    // Initial call
    listener({ ...currentState });
    return () => {
      listeners.delete(listener);
    };
  },

  getState(): FeatherState {
    return { ...currentState };
  },

  getCosmetics(): CosmeticItem[] {
    return COSMETIC_CATALOG;
  },

  isUnlocked(id: CosmeticId): boolean {
    return currentState.unlocked.includes(id);
  },

  isEquipped(id: CosmeticId): boolean {
    return currentState.equipped.includes(id);
  },

  getEquipped(): CosmeticId[] {
    return [...currentState.equipped];
  },

  /**
   * Mark first celebration as seen
   */
  dismissFirstCelebration() {
    currentState.hasSeenFirstCelebration = true;
    notify();
  },

  /**
   * Core Earning method
   */
  earn(amount: number, title: string, titleBangla = '', celebrateFirst = false): boolean {
    if (amount <= 0) return false;

    currentState.balance += amount;
    const tx: FeatherTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      amount,
      type: 'earn',
      title,
      titleBangla: titleBangla || title,
      timestamp: Date.now(),
    };
    currentState.history.unshift(tx);
    if (currentState.history.length > 50) currentState.history.pop();

    // Play pleasant audio feedback
    liquidAudio.playSynchronyChime();

    const anim: FeatherAnimationEvent = {
      id: tx.id,
      amount,
      type: 'earn',
      title,
      titleBangla,
    };

    if (celebrateFirst && !currentState.hasSeenFirstCelebration) {
      // First celebration will be triggered
    }

    notify(anim);
    return true;
  },

  /**
   * Spend Feathers to unlock a cosmetic item
   */
  unlockItem(itemId: CosmeticId): { success: boolean; message: string } {
    if (currentState.unlocked.includes(itemId)) {
      return { success: false, message: 'Already unlocked!' };
    }

    const item = COSMETIC_CATALOG.find((c) => c.id === itemId);
    if (!item) return { success: false, message: 'Item not found' };

    if (currentState.balance < item.price) {
      return {
        success: false,
        message: `Need ${item.price - currentState.balance} more Feathers!`,
      };
    }

    currentState.balance -= item.price;
    currentState.unlocked.push(itemId);
    // Auto-equip upon unlock for instant gratification
    this.equipItem(itemId);

    const tx: FeatherTransaction = {
      id: `spend-${Date.now()}`,
      amount: item.price,
      type: 'spend',
      title: `Unlocked ${item.name}`,
      titleBangla: `${item.nameBangla} আনলক করা হয়েছে`,
      timestamp: Date.now(),
    };
    currentState.history.unshift(tx);

    liquidAudio.playSubtleBubble(480);

    const anim: FeatherAnimationEvent = {
      id: tx.id,
      amount: item.price,
      type: 'spend',
      title: `Unlocked ${item.name}`,
      titleBangla: `${item.nameBangla} আনলকড!`,
    };

    notify(anim);
    return { success: true, message: `Unlocked ${item.name}!` };
  },

  /**
   * Equip an unlocked cosmetic item
   */
  equipItem(itemId: CosmeticId) {
    if (!currentState.unlocked.includes(itemId)) return;

    const item = COSMETIC_CATALOG.find((c) => c.id === itemId);
    if (!item) return;

    // Remove any conflicting item in the same category (e.g. cute cap and crown can't both be on head)
    currentState.equipped = currentState.equipped.filter((id) => {
      const existing = COSMETIC_CATALOG.find((c) => c.id === id);
      return existing?.category !== item.category;
    });

    currentState.equipped.push(itemId);
    liquidAudio.playSubtleBubble(320);
    notify();
  },

  /**
   * Unequip an item
   */
  unequipItem(itemId: CosmeticId) {
    currentState.equipped = currentState.equipped.filter((id) => id !== itemId);
    liquidAudio.playSubtleBubble(220);
    notify();
  },

  /**
   * Toggle equip/unequip
   */
  toggleEquip(itemId: CosmeticId) {
    if (this.isEquipped(itemId)) {
      this.unequipItem(itemId);
    } else {
      this.equipItem(itemId);
    }
  },

  // ==========================================
  // SPECIFIED REWARD TRIGGERS
  // ==========================================

  /**
   * Add XP progression and level up check
   */
  addXp(amount: number, reason: string, reasonBangla?: string): { xp: number; level: number; leveledUp: boolean } {
    const prevLevel = calculateLevelInfo(currentState.xp).level;
    currentState.xp += amount;
    const newInfo = calculateLevelInfo(currentState.xp);
    currentState.level = newInfo.level;
    const leveledUp = newInfo.level > prevLevel;

    if (leveledUp) {
      liquidAudio.playSynchronyChime();
    }

    notify({
      id: `xp-${Date.now()}`,
      amount: 0,
      xpBonus: amount,
      type: 'earn',
      title: leveledUp ? `Level Up! Level ${newInfo.level}` : `+${amount} XP (${reason})`,
      titleBangla: leveledUp ? `লেভেল আপ! লেভেল ${newInfo.level}: ${newInfo.titleBangla}` : `+${amount} XP (${reasonBangla || reason})`,
    });

    return { xp: currentState.xp, level: currentState.level, leveledUp };
  },

  getXp(): number {
    return currentState.xp;
  },

  getLevelInfo(): LevelInfo {
    return calculateLevelInfo(currentState.xp);
  },

  /**
   * Reward completing any 2-person realtime game → +20 🪶 and +35 XP!
   */
  rewardGameCompleted(gameName = 'Game', gameNameBangla = 'মিনি-গেম'): boolean {
    this.addXp(35, `${gameName} Completed`, `${gameNameBangla} সম্পন্ন`);
    return this.earn(20, `${gameName} Completed`, `${gameNameBangla} জয়/সম্পন্ন`);
  },

  /**
   * Reward completing a Kobutor Quest mission → +15 🪶 and +50 XP!
   */
  rewardQuestCompleted(questTitle = 'Kobutor Quest', questTitleBangla = 'কবুতর কোয়েস্ট'): boolean {
    this.addXp(50, `Quest: ${questTitle}`, `মিশন: ${questTitleBangla}`);
    return this.earn(15, `Quest: ${questTitle}`, `মিশন: ${questTitleBangla}`);
  },

  /**
   * First successful connection → +50 🪶 and +40 XP
   */
  rewardFirstConnection(): boolean {
    if (currentState.rewardedFlags.firstConnection) return false;
    currentState.rewardedFlags.firstConnection = true;
    this.addXp(40, 'First Connection', 'প্রথম সফল সংযোগ');
    return this.earn(50, 'First Connection', 'প্রথম সফল সংযোগ', true);
  },

  /**
   * Normal connection completion → +15 🪶 and +25 XP
   */
  rewardCompletedConnection(): boolean {
    this.addXp(25, 'Connection Complete', 'সংযোগ সম্পন্ন');
    return this.earn(15, 'Connection Complete', 'সংযোগ সম্পন্ন');
  },

  /**
   * Completing the first game → +30 🪶
   */
  rewardFirstGame(): boolean {
    if (currentState.rewardedFlags.firstGame) {
      // Repeat game reward (smaller encouragement)
      return this.earn(5, 'Game Completed', 'খেলা সম্পন্ন');
    }
    currentState.rewardedFlags.firstGame = true;
    return this.earn(30, 'First Game Complete', 'প্রথম খেলা সম্পন্ন');
  },

  /**
   * Sending the first reaction → +10 🪶
   */
  rewardFirstReaction(): boolean {
    if (currentState.rewardedFlags.firstReaction) return false;
    currentState.rewardedFlags.firstReaction = true;
    return this.earn(10, 'First Reaction Sent', 'প্রথম প্রতিক্রিয়া পাঠানো');
  },

  /**
   * Answering an icebreaker → +10 🪶
   */
  rewardIcebreaker(): boolean {
    if (currentState.rewardedFlags.firstIcebreaker) {
      return this.earn(5, 'Icebreaker Answered', 'কথোপকথন শেয়ার করা');
    }
    currentState.rewardedFlags.firstIcebreaker = true;
    return this.earn(10, 'Icebreaker Answered', 'প্রথম আইসব্রেকার উত্তর');
  },

  /**
   * Completing a Kobutor Surprise → +20 🪶
   */
  rewardSurpriseCompleted(): boolean {
    const isFirst = !currentState.rewardedFlags.firstSurprise;
    currentState.rewardedFlags.firstSurprise = true;
    return this.earn(20, isFirst ? 'First Kobutor Surprise' : 'Kobutor Surprise', 'কবুতর সারপ্রাইজ সম্পন্ন');
  },

  /**
   * Daily first connection → +25 🪶
   */
  rewardDailyConnection(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    if (currentState.rewardedFlags.lastDailyDate === today) return false;
    currentState.rewardedFlags.lastDailyDate = today;
    return this.earn(25, 'Daily First Connection', 'আজকের প্রথম সংযোগ');
  },

  // ==========================================
  // CORE FEATURED FEATHER UTILITIES
  // ==========================================

  /**
   * 🎁 MYSTERY FEATHER BOX (Cost: 25 🪶)
   * Spend Feathers for random fun rewards (special aura, bonus feathers, rare title)
   */
  openMysteryBox(): {
    success: boolean;
    reward?: {
      type: 'feathers' | 'cosmetic' | 'title' | 'aura';
      amount?: number;
      cosmeticId?: CosmeticId;
      name: string;
      nameBangla: string;
      icon: string;
    };
    message: string;
  } {
    const cost = 25;
    if (currentState.balance < cost) {
      return {
        success: false,
        message: `Need ${cost - currentState.balance} more Feathers to open Mystery Box!`,
      };
    }

    currentState.balance -= cost;

    // Pick a delightful reward
    const roll = Math.random();
    let reward: NonNullable<ReturnType<typeof this.openMysteryBox>['reward']>;

    if (roll < 0.35) {
      // Bonus Feathers (+35 to +50)
      const bonus = Math.random() > 0.5 ? 40 : 50;
      currentState.balance += bonus;
      reward = {
        type: 'feathers',
        amount: bonus,
        name: `Jackpot: +${bonus} Feathers!`,
        nameBangla: `জ্যাকপট: +${bonus} পালক পুরস্কার!`,
        icon: '🪶✨',
      };
    } else if (roll < 0.65) {
      // Find unowned cosmetic or unlock sparkle
      const unowned = COSMETIC_CATALOG.filter((c) => !currentState.unlocked.includes(c.id));
      if (unowned.length > 0) {
        const item = unowned[Math.floor(Math.random() * unowned.length)];
        currentState.unlocked.push(item.id);
        this.equipItem(item.id);
        reward = {
          type: 'cosmetic',
          cosmeticId: item.id,
          name: `Unlocked ${item.name}!`,
          nameBangla: `${item.nameBangla} আনলকড!`,
          icon: item.icon,
        };
      } else {
        const bonus = 45;
        currentState.balance += bonus;
        reward = {
          type: 'feathers',
          amount: bonus,
          name: `Grand Starlight +${bonus} Feathers!`,
          nameBangla: `নক্ষত্র পুরস্কার +${bonus} পালক!`,
          icon: '🌟',
        };
      }
    } else if (roll < 0.85) {
      reward = {
        type: 'aura',
        name: 'Prismatic Starlight Aura',
        nameBangla: 'বর্ণিল তারার আভা',
        icon: '✨🌈',
      };
    } else {
      reward = {
        type: 'title',
        name: 'Title: "Star Dove 🕊️"',
        nameBangla: 'উপাধি: "নক্ষত্র কবুতর 🕊️"',
        icon: '👑',
      };
    }

    const tx: FeatherTransaction = {
      id: `mystery-${Date.now()}`,
      amount: cost,
      type: 'spend',
      title: 'Mystery Feather Box',
      titleBangla: 'রহস্যময় পালক বাক্স',
      timestamp: Date.now(),
    };
    currentState.history.unshift(tx);

    liquidAudio.playSynchronyChime();

    const anim: FeatherAnimationEvent = {
      id: tx.id,
      amount: cost,
      type: 'spend',
      title: 'Opened Mystery Box 🎁',
      titleBangla: reward.nameBangla,
    };
    notify(anim);

    return {
      success: true,
      reward,
      message: `Opened Mystery Box: ${reward.name}!`,
    };
  },

  /**
   * 🌠 KOBUTOR WISH (Cost: 20 🪶)
   * Spend Feathers to trigger a special synchronized shared activity with your partner
   */
  makeWish(wishType: 'starlight' | 'lantern' | 'twin_flight'): {
    success: boolean;
    wish?: { type: string; name: string; nameBangla: string; icon: string };
    message: string;
  } {
    const cost = 20;
    if (currentState.balance < cost) {
      return {
        success: false,
        message: `Need ${cost - currentState.balance} more Feathers to make a Kobutor Wish!`,
      };
    }

    currentState.balance -= cost;

    const wishMap = {
      starlight: {
        type: 'starlight',
        name: 'Starlight Rain Wish',
        nameBangla: 'নক্ষত্রের বৃষ্টি উইশ 🌠',
        icon: '🌠',
      },
      lantern: {
        type: 'lantern',
        name: 'Floating Lantern Wish',
        nameBangla: 'ভাসমান প্রদীপের উইশ 🕯️',
        icon: '🕯️',
      },
      twin_flight: {
        type: 'twin_flight',
        name: 'Twin Dove Dance',
        nameBangla: 'যুগল কবুতরের ছন্দ 🕊️✨',
        icon: '🕊️',
      },
    };

    const selectedWish = wishMap[wishType] || wishMap.starlight;

    const tx: FeatherTransaction = {
      id: `wish-${Date.now()}`,
      amount: cost,
      type: 'spend',
      title: selectedWish.name,
      titleBangla: selectedWish.nameBangla,
      timestamp: Date.now(),
    };
    currentState.history.unshift(tx);

    liquidAudio.playSynchronyChime();
    notify({
      id: tx.id,
      amount: cost,
      type: 'spend',
      title: selectedWish.name,
      titleBangla: selectedWish.nameBangla,
    });

    return {
      success: true,
      wish: selectedWish,
      message: `${selectedWish.name} activated!`,
    };
  },

  /**
   * 🔄 REMATCH PASS (Cost: 15 🪶)
   * Spend Feathers to send a rematch request. Both users must agree.
   */
  requestRematch(): { success: boolean; message: string } {
    const cost = 15;
    if (currentState.balance < cost) {
      return {
        success: false,
        message: `Need ${cost - currentState.balance} more Feathers for a Rematch!`,
      };
    }

    currentState.balance -= cost;
    const tx: FeatherTransaction = {
      id: `rematch-${Date.now()}`,
      amount: cost,
      type: 'spend',
      title: 'Rematch Request',
      titleBangla: 'পুনরায় সংযোগ আবেদন',
      timestamp: Date.now(),
    };
    currentState.history.unshift(tx);

    liquidAudio.playSubtleBubble(400);
    notify({
      id: tx.id,
      amount: cost,
      type: 'spend',
      title: 'Rematch Sent 🔄',
      titleBangla: 'পুনরায় কথা বলার অনুরোধ পাঠানো হয়েছে',
    });

    return { success: true, message: 'Rematch request sent!' };
  },

  /**
   * 🎮 KOBUTOR CHALLENGE EVENT (Cost: 15 🪶)
   * Feather-based entry into special 2-person synchronized mini-game events with mutual reward
   */
  enterChallengeEvent(challengeName: string, challengeBangla: string): { success: boolean; message: string } {
    const cost = 15;
    if (currentState.balance < cost) {
      return {
        success: false,
        message: `Need ${cost - currentState.balance} more Feathers to enter Challenge Event!`,
      };
    }

    currentState.balance -= cost;
    const tx: FeatherTransaction = {
      id: `event-${Date.now()}`,
      amount: cost,
      type: 'spend',
      title: `Challenge: ${challengeName}`,
      titleBangla: `চ্যালেঞ্জ: ${challengeBangla}`,
      timestamp: Date.now(),
    };
    currentState.history.unshift(tx);

    liquidAudio.playSynchronyChime();
    notify({
      id: tx.id,
      amount: cost,
      type: 'spend',
      title: challengeName,
      titleBangla: challengeBangla,
    });

    return { success: true, message: `Entered ${challengeName}!` };
  },
};
