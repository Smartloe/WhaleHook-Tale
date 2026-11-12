import { getHostSDK } from './shell';
import { LEVELS } from '../systems/LevelConfig';

/** 个人存档：最高分、已解锁关卡、静音偏好 */
export interface SaveData {
  best: number;
  maxLevel: number;
  muted: boolean;
}

const KEY = 'whalehook.save.v1';
const DEFAULTS: SaveData = { best: 0, maxLevel: 1, muted: false };

let cache: SaveData = { ...DEFAULTS };
let loading: Promise<void> | null = null;
let loaded = false;
let writeQueue: Promise<void> = Promise.resolve();

function sanitize(raw: unknown): Partial<SaveData> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const value = raw as Record<string, unknown>;
  const result: Partial<SaveData> = {};
  if (typeof value.best === 'number' && Number.isFinite(value.best) && value.best >= 0) {
    result.best = Math.floor(value.best);
  }
  if (typeof value.maxLevel === 'number' && Number.isFinite(value.maxLevel) && value.maxLevel >= 1) {
    result.maxLevel = Math.min(LEVELS.length, Math.floor(value.maxLevel));
  }
  if (typeof value.muted === 'boolean') {
    result.muted = value.muted;
  }
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
        // 读取失败：允许下次重试，且本次会话不写盘
        loaded = false;
        loading = null;
        return;
      }
      if (raw) {
        try {
          cache = { ...cache, ...sanitize(JSON.parse(raw)) };
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
 * 避免把 {best:0, maxLevel:1} 覆盖到玩家真实存档上。
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
