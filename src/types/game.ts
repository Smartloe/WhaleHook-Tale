/** 可钩取物类型：小鱼 / 大鱼 / 宝箱 / 珍珠 / 黄金鱼 / 旧靴子 */
export type CatchableType =
  | 'fish_small'
  | 'fish_big'
  | 'treasure'
  | 'pearl'
  | 'golden_fish'
  | 'boot';

/** 稀有度，仅用于表现与后续掉落表扩展 */
export type Rarity = 'common' | 'rare' | 'junk';

/**
 * 鱼钩状态机：
 * IDLE_SWING（摆动待机）→ SHOOTING（发射）→ RETRACTING（吸附回收）→ SETTLE（结算停顿）→ IDLE_SWING
 */
export type HookState = 'IDLE_SWING' | 'SHOOTING' | 'RETRACTING' | 'SETTLE';

/** 可钩取物的核心数据模型（与表现层解耦，便于后续换成精灵图） */
export interface CatchableData {
  id: string;
  type: CatchableType;
  name: string;
  value: number;
  /** 重量，越大回收越慢 */
  weight: number;
  rarity: Rarity;
  radius: number;
  x: number;
  y: number;
  collected: boolean;
  /** 钓上来后增加的剩余秒数（黄金鱼） */
  timeBonus?: number;
}

/** 鱼钩可吸附对象的最小契约 */
export interface Hookable {
  x: number;
  y: number;
  readonly radius: number;
  readonly weight: number;
}

/** 鱼钩手感参数（与舞台无关的部分），集中在 LevelConfig 中可调 */
export interface HookMotionTuning {
  /** 从正下方算起的最大摆角（度） */
  swingAmplitudeDeg: number;
  /** 一次完整左右往复的时长（毫秒） */
  swingPeriodMs: number;
  /** 待机时鱼线长度 */
  idleLength: number;
  /** 发射速度（像素/秒） */
  shootSpeed: number;
  /** 空钩回收速度（像素/秒） */
  baseRetractSpeed: number;
  /** 重量对回收速度的衰减系数：speed = base / (1 + weight * factor) */
  weightRetractFactor: number;
  /** 回收速度下限，避免超重物体卡死 */
  minRetractSpeed: number;
  /** 钩头碰撞半径 */
  hookRadius: number;
  /** 回收完成后的结算停顿（毫秒） */
  settleMs: number;
}

/** 完整鱼钩参数：手感 + 当前舞台的竿尖、边界与线长上限 */
export interface HookTuning extends HookMotionTuning {
  /** 鱼线起点（鱼竿竿尖） */
  pivot: { x: number; y: number };
  /** 鱼线最大长度（安全上限，实际还受水面区域边界限制） */
  maxLength: number;
  /** 钩头允许活动的边界，越界即回收 */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** 单种可钩取物的配置（占位美术色与 emoji 也在这里） */
export interface CatchableSpec {
  type: CatchableType;
  name: string;
  value: number;
  weight: number;
  rarity: Rarity;
  radius: number;
  /** 占位/主题色，用于光晕与 UI 强调 */
  color: number;
  /** 本关生成数量 */
  count: number;
  /** 钓上来后增加的剩余秒数（黄金鱼） */
  timeBonus?: number;
}

/** 关卡水体配色，让每一关有不同氛围 */
export interface LevelPalette {
  water: number;
  surface: number;
  seabed: number;
}

/** 关卡配置（不含舞台尺寸；水域范围由 StageLayout 提供） */
export interface LevelConfigData {
  id: number;
  name: string;
  tagline: string;
  timeLimitMs: number;
  targetScore: number;
  palette: LevelPalette;
  catches: CatchableSpec[];
}

/** 场景间传递的结算数据 */
export interface GameResultData {
  levelId: number;
  levelName: string;
  success: boolean;
  score: number;
  targetScore: number;
  timeLeftMs: number;
  /** 历史最高分（含本局） */
  best: number;
  /** 本局是否刷新纪录 */
  isNewBest: boolean;
  /** 成功后要进入的下一关；null 表示已是最后一关 */
  nextLevelId: number | null;
  /** 总关卡数 */
  levelCount: number;
}
