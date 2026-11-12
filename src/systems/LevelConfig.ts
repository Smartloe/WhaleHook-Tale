import type { HookMotionTuning, LevelConfigData } from '../types/game';

/** 中文优先的字体栈，避免依赖外部字体文件 */
export const FONT_FAMILY =
  '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif';

/**
 * 鱼钩手感参数（与舞台尺寸无关的部分）。
 * 想调手感只改这里：摆动范围、摆动速度、发射/回收速度、重量衰减、结算停顿。
 * 竿尖位置、活动边界、线长上限由 StageLayout 按横屏/竖屏给出。
 */
export const HOOK_MOTION: HookMotionTuning = {
  swingAmplitudeDeg: 70,
  swingPeriodMs: 2400,
  idleLength: 34,
  shootSpeed: 900,
  baseRetractSpeed: 520,
  weightRetractFactor: 0.55,
  minRetractSpeed: 110,
  hookRadius: 10,
  settleMs: 420,
};

/** 关卡数据：越往后目标越高、时间越紧，物件也更值钱 */
export const LEVELS: LevelConfigData[] = [
  {
    id: 1,
    name: '浅湾',
    tagline: '海风正好，先钓点小鱼练练手',
    timeLimitMs: 60_000,
    targetScore: 300,
    palette: { water: 0x0a3550, surface: 0x0f4462, seabed: 0x06202f },
    catches: [
      { type: 'fish_small', name: '小鱼', value: 20, weight: 1, rarity: 'common', radius: 16, color: 0x63c7ff, count: 8 },
      { type: 'fish_big', name: '大鱼', value: 60, weight: 3, rarity: 'common', radius: 26, color: 0x2f8fd8, count: 4 },
      { type: 'treasure', name: '珍珠宝箱', value: 150, weight: 6.5, rarity: 'rare', radius: 22, color: 0xffd166, count: 2 },
      { type: 'boot', name: '旧靴子', value: -15, weight: 1.5, rarity: 'junk', radius: 18, color: 0x8a6a4f, count: 3 },
    ],
  },
  {
    id: 2,
    name: '珊瑚礁',
    tagline: '珊瑚丛里藏着会发光的家伙',
    timeLimitMs: 55_000,
    targetScore: 550,
    palette: { water: 0x0b3a4a, surface: 0x14575f, seabed: 0x0f2b2c },
    catches: [
      { type: 'fish_small', name: '小鱼', value: 20, weight: 1, rarity: 'common', radius: 16, color: 0x63c7ff, count: 6 },
      { type: 'fish_big', name: '大鱼', value: 60, weight: 3, rarity: 'common', radius: 26, color: 0x2f8fd8, count: 6 },
      { type: 'treasure', name: '珍珠宝箱', value: 150, weight: 6.5, rarity: 'rare', radius: 22, color: 0xffd166, count: 2 },
      { type: 'pearl', name: '夜明珠', value: 200, weight: 5, rarity: 'rare', radius: 18, color: 0xbdefff, count: 1 },
      { type: 'golden_fish', name: '黄金鱼', value: 90, weight: 1, rarity: 'rare', radius: 15, color: 0xffd700, count: 1, timeBonus: 3 },
      { type: 'boot', name: '旧靴子', value: -15, weight: 1.5, rarity: 'junk', radius: 18, color: 0x8a6a4f, count: 3 },
    ],
  },
  {
    id: 3,
    name: '深海沟',
    tagline: '最后一关，海底的宝贝都在这里',
    timeLimitMs: 50_000,
    targetScore: 800,
    palette: { water: 0x081c33, surface: 0x0c2a4a, seabed: 0x041424 },
    catches: [
      { type: 'fish_big', name: '大鱼', value: 60, weight: 3, rarity: 'common', radius: 26, color: 0x2f8fd8, count: 8 },
      { type: 'treasure', name: '珍珠宝箱', value: 150, weight: 6.5, rarity: 'rare', radius: 22, color: 0xffd166, count: 3 },
      { type: 'pearl', name: '夜明珠', value: 200, weight: 5, rarity: 'rare', radius: 18, color: 0xbdefff, count: 2 },
      { type: 'golden_fish', name: '黄金鱼', value: 90, weight: 1, rarity: 'rare', radius: 15, color: 0xffd700, count: 2, timeBonus: 3 },
      { type: 'boot', name: '旧靴子', value: -15, weight: 1.5, rarity: 'junk', radius: 18, color: 0x8a6a4f, count: 4 },
    ],
  },
];

/** 按 id 取关卡，找不到时回落到第一关 */
export function getLevel(levelId: number): LevelConfigData {
  return LEVELS.find((level) => level.id === levelId) ?? LEVELS[0];
}

export function isLastLevel(levelId: number): boolean {
  return levelId >= LEVELS.length;
}
