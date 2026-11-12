import type {
  CatchableSpec,
  CatchableType,
  HookMotionTuning,
  LevelConfigData,
  LevelMechanic,
  LevelPalette,
} from '../types/game';

/** 中文优先的字体栈，避免依赖外部字体文件 */
export const FONT_FAMILY =
  '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif';

/**
 * 鱼钩手感参数（与舞台尺寸无关的部分）。
 * 想调手感只改这里：摆动范围、摆动速度、发射/回收速度、重量衰减、结算停顿。
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

/** 四个海域：名称、配色与介绍，选关页按海域分组 */
export const ZONES: ReadonlyArray<{ id: number; name: string; palette: LevelPalette }> = [
  { id: 1, name: '浅湾', palette: { water: 0x0a3550, surface: 0x0f4462, seabed: 0x06202f } },
  { id: 2, name: '珊瑚礁', palette: { water: 0x0b3a4a, surface: 0x14575f, seabed: 0x0f2b2c } },
  { id: 3, name: '沉船', palette: { water: 0x0a2438, surface: 0x133a52, seabed: 0x061826 } },
  { id: 4, name: '深海沟', palette: { water: 0x081c33, surface: 0x0c2a4a, seabed: 0x041424 } },
];

/** 物件模板：统一数值来源，避免每关手写重复字段 */
const SPECS: Record<CatchableType, Omit<CatchableSpec, 'count'>> = {
  fish_small: { type: 'fish_small', name: '小鱼', value: 20, weight: 1, rarity: 'common', radius: 16, color: 0x63c7ff },
  fish_big: { type: 'fish_big', name: '大鱼', value: 60, weight: 3, rarity: 'common', radius: 26, color: 0x2f8fd8 },
  treasure: { type: 'treasure', name: '珍珠宝箱', value: 150, weight: 6.5, rarity: 'rare', radius: 22, color: 0xffd166 },
  pearl: { type: 'pearl', name: '夜明珠', value: 200, weight: 5, rarity: 'rare', radius: 18, color: 0xbdefff },
  golden_fish: {
    type: 'golden_fish',
    name: '黄金鱼',
    value: 90,
    weight: 1,
    rarity: 'rare',
    radius: 15,
    color: 0xffd700,
    timeBonus: 3,
  },
  boot: { type: 'boot', name: '旧靴子', value: -15, weight: 1.5, rarity: 'junk', radius: 18, color: 0x8a6a4f },
  jellyfish: {
    type: 'jellyfish',
    name: '水母',
    value: 0,
    weight: 1.2,
    rarity: 'junk',
    radius: 19,
    color: 0xc9a7ff,
    timePenalty: 3,
  },
  rock: { type: 'rock', name: '礁石', value: 0, weight: 99, rarity: 'junk', radius: 24, color: 0x3f5a6e },
};

function spec(type: CatchableType, count: number): CatchableSpec {
  return { ...SPECS[type], count };
}

interface LevelSeed {
  name: string;
  tagline: string;
  zone: number;
  timeSeconds: number;
  target: number;
  mechanics: LevelMechanic[];
  catches: CatchableSpec[];
}

function buildLevels(seeds: LevelSeed[]): LevelConfigData[] {
  return seeds.map((seed, index) => ({
    id: index + 1,
    name: seed.name,
    tagline: seed.tagline,
    timeLimitMs: seed.timeSeconds * 1000,
    targetScore: seed.target,
    palette: ZONES[seed.zone - 1].palette,
    zone: seed.zone,
    mechanics: seed.mechanics,
    starThresholds: [
      seed.target,
      Math.round(seed.target * 1.15),
      Math.round(seed.target * 1.5),
    ],
    catches: seed.catches,
  }));
}

/** 12 关：4 个海域 × 3 关，每个海域引入一种新机制 */
export const LEVELS: LevelConfigData[] = buildLevels([
  // —— 浅湾：基础 ——
  {
    name: '浅湾 · 初钓',
    tagline: '海风正好，先钓点小鱼练练手',
    zone: 1,
    timeSeconds: 60,
    target: 300,
    mechanics: [],
    catches: [spec('fish_small', 8), spec('fish_big', 4), spec('treasure', 2), spec('boot', 3)],
  },
  {
    name: '浅湾 · 潮汐',
    tagline: '潮水涨起来了，宝箱也多了',
    zone: 1,
    timeSeconds: 58,
    target: 450,
    mechanics: [],
    catches: [spec('fish_small', 7), spec('fish_big', 5), spec('treasure', 3), spec('boot', 3)],
  },
  {
    name: '浅湾 · 归航',
    tagline: '返航前再捞一网',
    zone: 1,
    timeSeconds: 56,
    target: 600,
    mechanics: [],
    catches: [spec('fish_small', 6), spec('fish_big', 6), spec('treasure', 3), spec('golden_fish', 1), spec('boot', 4)],
  },
  // —— 珊瑚礁：游动鱼群 ——
  {
    name: '珊瑚礁 · 鱼群',
    tagline: '鱼群游得很快，要算准提前量',
    zone: 2,
    timeSeconds: 55,
    target: 650,
    mechanics: ['swim'],
    catches: [spec('fish_small', 6), spec('fish_big', 6), spec('treasure', 3), spec('boot', 3)],
  },
  {
    name: '珊瑚礁 · 明珠',
    tagline: '珊瑚丛深处有会发光的夜明珠',
    zone: 2,
    timeSeconds: 55,
    target: 800,
    mechanics: ['swim'],
    catches: [
      spec('fish_small', 5),
      spec('fish_big', 6),
      spec('treasure', 2),
      spec('pearl', 2),
      spec('golden_fish', 1),
      spec('boot', 3),
    ],
  },
  {
    name: '珊瑚礁 · 深处',
    tagline: '越深的珊瑚，越值钱',
    zone: 2,
    timeSeconds: 54,
    target: 950,
    mechanics: ['swim'],
    catches: [
      spec('fish_big', 7),
      spec('treasure', 3),
      spec('pearl', 2),
      spec('golden_fish', 2),
      spec('boot', 3),
    ],
  },
  // —— 沉船：礁石障碍 ——
  {
    name: '沉船 · 残骸',
    tagline: '小心礁石，钩到会被弹回来',
    zone: 3,
    timeSeconds: 52,
    target: 1000,
    mechanics: ['rocks'],
    catches: [
      spec('fish_big', 6),
      spec('treasure', 3),
      spec('pearl', 2),
      spec('golden_fish', 1),
      spec('rock', 3),
      spec('boot', 3),
    ],
  },
  {
    name: '沉船 · 货舱',
    tagline: '沉船的货舱里全是宝贝',
    zone: 3,
    timeSeconds: 52,
    target: 1150,
    mechanics: ['rocks', 'swim'],
    catches: [
      spec('fish_big', 6),
      spec('treasure', 4),
      spec('pearl', 2),
      spec('golden_fish', 2),
      spec('rock', 4),
      spec('boot', 2),
    ],
  },
  {
    name: '沉船 · 暗流',
    tagline: '暗流涌动，礁石更多了',
    zone: 3,
    timeSeconds: 50,
    target: 1300,
    mechanics: ['rocks', 'swim'],
    catches: [
      spec('fish_big', 7),
      spec('treasure', 4),
      spec('pearl', 3),
      spec('golden_fish', 2),
      spec('rock', 5),
      spec('boot', 2),
    ],
  },
  // —— 深海沟：水母 + 限时宝箱 ——
  {
    name: '深海沟 · 幽光',
    tagline: '水母会扣时间，绕开它',
    zone: 4,
    timeSeconds: 50,
    target: 1350,
    mechanics: ['jelly', 'swim'],
    catches: [
      spec('fish_big', 7),
      spec('treasure', 3),
      spec('pearl', 3),
      spec('golden_fish', 2),
      spec('jellyfish', 3),
      spec('boot', 2),
    ],
  },
  {
    name: '深海沟 · 闪烁',
    tagline: '宝箱会闪现，抓紧时机',
    zone: 4,
    timeSeconds: 48,
    target: 1500,
    mechanics: ['jelly', 'flash', 'swim'],
    catches: [
      spec('fish_big', 6),
      spec('treasure', 4),
      spec('pearl', 3),
      spec('golden_fish', 3),
      spec('jellyfish', 4),
      spec('boot', 2),
    ],
  },
  {
    name: '深海沟 · 鲸落',
    tagline: '最后一关，海底的宝贝都在这里',
    zone: 4,
    timeSeconds: 48,
    target: 1700,
    mechanics: ['jelly', 'flash', 'swim', 'rocks'],
    catches: [
      spec('fish_big', 7),
      spec('treasure', 4),
      spec('pearl', 4),
      spec('golden_fish', 3),
      spec('jellyfish', 4),
      spec('rock', 3),
      spec('boot', 2),
    ],
  },
]);

/** 按 id 取关卡，找不到时回落到第一关 */
export function getLevel(levelId: number): LevelConfigData {
  return LEVELS.find((level) => level.id === levelId) ?? LEVELS[0];
}

export function isLastLevel(levelId: number): boolean {
  return levelId >= LEVELS.length;
}

/** 按分数计算星级（0-3） */
export function starsForScore(level: LevelConfigData, score: number): number {
  if (score >= level.starThresholds[2]) return 3;
  if (score >= level.starThresholds[1]) return 2;
  if (score >= level.starThresholds[0]) return 1;
  return 0;
}

/** 关卡所属海域名称 */
export function zoneName(zoneId: number): string {
  return ZONES.find((zone) => zone.id === zoneId)?.name ?? '';
}
