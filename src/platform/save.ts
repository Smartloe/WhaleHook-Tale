import { getHostSDK } from './shell';
import { LEVELS } from '../systems/LevelConfig';

/** 单次成绩 */
export interface RunRecord {
  score: number;
  stars: number;
  at: number;
}

/** 单关最好成绩 */
export interface LevelProgress {
  best: number;
  stars: number;
}

/** 个人存档：最高分、解锁关卡、静音偏好、逐关记录与排行榜 */
export interface SaveData {
  best: number;
  maxLevel: number;
  muted: boolean;
  levels: Record<string, LevelProgress>;
  runs: Record<string, RunRecord[]>;
}

/** 每关保留的成绩条数 */
export const RUNS_PER_LEVEL = 10;

const KEY = 'whalehook.save.v1';

function defaults(): SaveData {
  return { best: 0, maxLevel: 1, muted: false, levels: {}, runs: {} };
}

let cache: SaveData = defaults();
let loading: Promise<void> | null = null;
let loaded = false;
let writeQueue: Promise<void> = Promise.resolve();

function clampScore(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function clampStars(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 3
    ? Math.floor(value)
    : null;
}

function sanitizeRuns(raw: unknown): Record<string, RunRecord[]> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, RunRecord[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const list: RunRecord[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const score = clampScore(record.score);
      const stars = clampStars(record.stars) ?? 0;
      const at = typeof record.at === 'number' && Number.isFinite(record.at) ? record.at : 0;
      if (score === null) continue;
      list.push({ score, stars, at });
    }
    if (list.length) {
      result[key] = list.sort((a, b) => b.score - a.score || a.at - b.at).slice(0, RUNS_PER_LEVEL);
    }
  }
  return result;
}

function sanitizeLevels(raw: unknown): Record<string, LevelProgress> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, LevelProgress> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const record = value as Record<string, unknown>;
    const best = clampScore(record.best);
    if (best === null) continue;
    result[key] = { best, stars: clampStars(record.stars) ?? 0 };
  }
  return result;
}

function sanitize(raw: unknown): Partial<SaveData> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const value = raw as Record<string, unknown>;
  const result: Partial<SaveData> = {};
  const best = clampScore(value.best);
  if (best !== null) result.best = best;
  if (typeof value.maxLevel === 'number' && Number.isFinite(value.maxLevel) && value.maxLevel >= 1) {
    result.maxLevel = Math.min(LEVELS.length, Math.floor(value.maxLevel));
  }
  if (typeof value.muted === 'boolean') {
    result.muted = value.muted;
  }
  result.levels = sanitizeLevels(value.levels);
  result.runs = sanitizeRuns(value.runs);
  return result;
}

async function readRaw(): Promise<string | null> {
  const sdk = getHostSDK();
  if (sdk?.permissions.has('storage.read')) {
    return sdk.localStorage.getItem(KEY);
  }
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

async function writeRaw(raw: string): Promise<void> {
  const sdk = getHostSDK();
  if (sdk?.permissions.has('storage.write')) {
    await sdk.localStorage.setItem(KEY, raw);
    return;
  }
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    // 浏览器禁用存储时静默放弃
  }
}

/** 首次读取成功后才允许写入，避免用默认值覆盖真实存档 */
function startLoad(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      let raw: string | null = null;
      try {
        raw = await readRaw();
      } catch {
        loaded = false;
        loading = null;
        return;
      }
      if (raw) {
        try {
          cache = { ...defaults(), ...sanitize(JSON.parse(raw)) };
        } catch {
          // 存档内容损坏：当作空存档，后续写入会覆盖它
        }
      }
      loaded = true;
    })();
  }
  return loading;
}

export function getSave(): SaveData {
  return cache;
}

/** 读取存档；失败时下次调用会重试，成功时总是返回最新数据 */
export async function loadSave(): Promise<SaveData> {
  await startLoad();
  return cache;
}

/** 带超时的读取：宿主存储卡住时不要让 UI 无限等待 */
export function loadSaveWithTimeout(timeoutMs: number): Promise<SaveData> {
  return Promise.race([
    loadSave(),
    new Promise<SaveData>((resolve) => {
      window.setTimeout(() => resolve(cache), timeoutMs);
    }),
  ]);
}

/**
 * 合并并保存。写入会先等待初次读取完成；读取从未成功时不写盘，
 * 避免把默认值覆盖到玩家真实存档上。
 */
export async function updateSave(patch: Partial<SaveData>): Promise<void> {
  await startLoad();
  cache = { ...cache, ...patch };
  if (!loaded) {
    return;
  }
  const snapshot = JSON.stringify(cache);
  writeQueue = writeQueue.then(async () => {
    try {
      await writeRaw(snapshot);
    } catch {
      // 保存失败不影响本地游戏
    }
  });
  await writeQueue;
}

export interface RecordResult {
  /** 本局在单关榜上的名次（1 起）；未进前 10 为 null */
  rank: number | null;
  /** 本关历史最佳 */
  best: number;
  /** 本关历史最高星级 */
  stars: number;
}

/** 记录一局成绩：更新单关榜、最高分与解锁进度 */
export async function recordRun(
  levelId: number,
  score: number,
  stars: number,
  success: boolean,
): Promise<RecordResult> {
  const save = await loadSaveWithTimeout(600);
  const key = String(levelId);
  const at = Date.now();
  const list = [...(save.runs[key] ?? []), { score: Math.max(0, Math.floor(score)), stars, at }]
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, RUNS_PER_LEVEL);

  const prev = save.levels[key] ?? { best: 0, stars: 0 };
  const nextProgress: LevelProgress = {
    best: Math.max(prev.best, Math.max(0, Math.floor(score))),
    stars: Math.max(prev.stars, stars),
  };

  const maxLevel = success
    ? Math.max(save.maxLevel, Math.min(LEVELS.length, levelId + 1))
    : save.maxLevel;

  await updateSave({
    best: Math.max(save.best, Math.max(0, Math.floor(score))),
    maxLevel,
    levels: { ...save.levels, [key]: nextProgress },
    runs: { ...save.runs, [key]: list },
  });

  const index = list.findIndex((item) => item.at === at && item.score === Math.max(0, Math.floor(score)));
  return { rank: index >= 0 ? index + 1 : null, best: nextProgress.best, stars: nextProgress.stars };
}

/** 累计星数 */
export function totalStars(save: SaveData): number {
  return Object.values(save.levels).reduce((sum, item) => sum + item.stars, 0);
}
