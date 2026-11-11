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

/** 第 1 关：浅湾。后续多关卡直接往数组里加即可。 */
export const LEVELS: LevelConfigData[] = [
  {
    id: 1,
    name: '浅湾',
    tagline: '海风正好，鲸鱼娘今天也想钓点奇怪的东西',
    timeLimitMs: 60_000,
    targetScore: 300,
    catches: [
      {
        type: 'fish_small',
        name: '小鱼',
        value: 20,
        weight: 1,
        rarity: 'common',
        radius: 16,
        color: 0x63c7ff,
        emoji: '🐟',
        count: 8,
      },
      {
        type: 'fish_big',
        name: '大鱼',
        value: 60,
        weight: 3,
        rarity: 'common',
        radius: 26,
        color: 0x2f8fd8,
        emoji: '🐠',
        count: 4,
      },
      {
        type: 'treasure',
        name: '珍珠宝箱',
        value: 150,
        weight: 6.5,
        rarity: 'rare',
        radius: 22,
        color: 0xffd166,
        emoji: '💎',
        count: 2,
      },
      {
        type: 'boot',
        name: '旧靴子',
        value: -15,
        weight: 1.5,
        rarity: 'junk',
        radius: 18,
        color: 0x8a6a4f,
        emoji: '🥾',
        count: 3,
      },
    ],
  },
];

/** 按 id 取关卡，找不到时回落到第一关 */
export function getLevel(levelId: number): LevelConfigData {
  return LEVELS.find((level) => level.id === levelId) ?? LEVELS[0];
}
