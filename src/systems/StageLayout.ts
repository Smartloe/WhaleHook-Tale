import type { HookMotionTuning, HookTuning } from '../types/game';

/**
 * 舞台布局：同一套玩法，两种画布尺寸。
 * - landscape（960×640）：桌面 / 横屏
 * - portrait（640×960）：手机竖屏 / 窄窗口
 *
 * 启动时根据窗口宽高比二选一；所有场景坐标都从这里取，不再散落硬编码。
 */
export interface StageLayout {
  kind: 'landscape' | 'portrait';
  width: number;
  height: number;
  waterTop: number;
  whale: { x: number; y: number };
  boat: { centerX: number; deckY: number; width: number; height: number };
  rodTip: { x: number; y: number };
  spawnArea: { minX: number; minY: number; maxX: number; maxY: number };
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  maxLength: number;
  seabedHeight: number;
  moon: { x: number; y: number; radius: number };
}

const LANDSCAPE: StageLayout = {
  kind: 'landscape',
  width: 960,
  height: 640,
  waterTop: 185,
  whale: { x: 480, y: 112 },
  boat: { centerX: 480, deckY: 140, width: 176, height: 56 },
  rodTip: { x: 480, y: 178 },
  spawnArea: { minX: 90, minY: 250, maxX: 870, maxY: 600 },
  bounds: { minX: 12, minY: 186, maxX: 948, maxY: 628 },
  maxLength: 700,
  seabedHeight: 46,
  moon: { x: 700, y: 58, radius: 26 },
};

const PORTRAIT: StageLayout = {
  kind: 'portrait',
  width: 640,
  height: 960,
  waterTop: 230,
  whale: { x: 320, y: 185 },
  boat: { centerX: 320, deckY: 215, width: 176, height: 56 },
  rodTip: { x: 320, y: 278 },
  spawnArea: { minX: 70, minY: 340, maxX: 570, maxY: 880 },
  bounds: { minX: 12, minY: 286, maxX: 628, maxY: 948 },
  maxLength: 780,
  seabedHeight: 46,
  moon: { x: 400, y: 62, radius: 22 },
};

/** 竖屏判定：宽高比小于 0.95 时使用竖屏布局 */
export function resolveStage(viewportWidth: number, viewportHeight: number): StageLayout {
  return viewportWidth / Math.max(1, viewportHeight) < 0.95 ? PORTRAIT : LANDSCAPE;
}

/** 把舞台参数与手感参数合并成完整的鱼钩参数 */
export function createHookTuning(stage: StageLayout, motion: HookMotionTuning): HookTuning {
  return {
    ...motion,
    pivot: { ...stage.rodTip },
    bounds: { ...stage.bounds },
    maxLength: stage.maxLength,
  };
}
