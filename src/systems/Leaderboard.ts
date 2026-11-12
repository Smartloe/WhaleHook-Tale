import { getSave, type LevelProgress, type RunRecord } from '../platform/save';
import { getLevel, LEVELS } from './LevelConfig';

/**
 * 排行榜数据源。
 *
 * 当前实现只读本机存档；UI 只依赖这一层，将来接入全服后端时
 * 只需要替换这里的实现（保持函数签名为 Promise 或同步均可）。
 */
export interface LevelScoreRow {
  levelId: number;
  levelName: string;
  best: number;
  stars: number;
}

export function getLevelRuns(levelId: number): RunRecord[] {
  return getSave().runs[String(levelId)] ?? [];
}

export function getLevelProgress(levelId: number): LevelProgress {
  return getSave().levels[String(levelId)] ?? { best: 0, stars: 0 };
}

/** 单关最好成绩排名（按关卡最佳分排序） */
export function getTotalRanking(): LevelScoreRow[] {
  const save = getSave();
  return LEVELS.map((level) => {
    const progress = save.levels[String(level.id)] ?? { best: 0, stars: 0 };
    return {
      levelId: level.id,
      levelName: level.name,
      best: progress.best,
      stars: progress.stars,
    };
  })
    .filter((row) => row.best > 0)
    .sort((a, b) => b.best - a.best);
}

/** 全部关卡最佳分之和 */
export function getTotalScore(): number {
  return LEVELS.reduce((sum, level) => sum + getLevelProgress(level.id).best, 0);
}

/** 某关的目标分与星级线，供 UI 展示 */
export function getLevelTargets(levelId: number): { target: number; stars: [number, number, number] } {
  const level = getLevel(levelId);
  return { target: level.targetScore, stars: level.starThresholds };
}
