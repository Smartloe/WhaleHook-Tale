import { getHostSDK, whenHostReady } from './shell';

/**
 * 统一的包内图片加载：返回 blob: URL。
 *
 * - 微应用沙箱：CSP 只允许 `img-src blob:`，且不能直接 fetch 包内文件，
 *   必须用 `sdk.assets.readBytes(path)` 读字节再转 Blob。
 * - 普通网页：用 fetch 取同源静态文件，也转成 blob URL，两条路径行为一致。
 *
 * path 是相对包根的路径，例如 `assets/whale.webp`，必须已在 manifest.assets 中声明。
 */
const created: string[] = [];

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  json: 'application/json',
};

function mimeOf(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

type ByteResult = ArrayBuffer | ArrayBufferView | Blob | null;

/** 把不同运行时返回的字节统一成 ArrayBuffer */
async function toArrayBuffer(result: ByteResult): Promise<ArrayBuffer> {
  if (result === null || result === undefined) {
    return new ArrayBuffer(0);
  }
  if (result instanceof Blob) {
    return result.arrayBuffer();
  }
  if (result instanceof ArrayBuffer) {
    return result;
  }
  if (ArrayBuffer.isView(result)) {
    const view = result as ArrayBufferView;
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
  }
  const bytes = new Uint8Array(result as unknown as number[]);
  return bytes.buffer;
}

async function readBytes(path: string): Promise<ArrayBuffer> {
  const sdk = getHostSDK();
  if (sdk) {
    // 沙箱里必须先等通道握手，否则 readBytes 会失败
    await whenHostReady();
    const raw = (await sdk.assets.readBytes(path)) as unknown as ByteResult;
    const buffer = await toArrayBuffer(raw);
    if (buffer.byteLength === 0) {
      throw new Error(`素材为空：${path}`);
    }
    if (/\.(webp|png|jpe?g)$/i.test(path)) {
      const head = new Uint8Array(buffer.slice(0, 12));
      const isWebp = head[0] === 0x52 && head[1] === 0x49 && head[8] === 0x57;
      const isPng = head[0] === 0x89 && head[1] === 0x50;
      const isJpg = head[0] === 0xff && head[1] === 0xd8;
      if (!isWebp && !isPng && !isJpg) {
        throw new Error(`素材格式异常：${path}（前 4 字节 ${Array.from(head.slice(0, 4)).join(',')}）`);
      }
    }
    return buffer;
  }
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`读取素材失败：${path}（${response.status}）`);
  }
  return response.arrayBuffer();
}

/** 读取素材原始字节（微应用走 SDK，网页走 fetch） */
export async function loadAssetBytes(path: string): Promise<ArrayBuffer> {
  return readBytes(path);
}

export async function loadAssetAsBlobUrl(path: string): Promise<string> {
  const bytes = await readBytes(path);
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeOf(path) }));
  created.push(url);
  return url;
}

export async function loadAssetText(path: string): Promise<string> {
  const sdk = getHostSDK();
  if (sdk) {
    await whenHostReady();
    return sdk.assets.readText(path);
  }
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`读取素材失败：${path}（${response.status}）`);
  }
  return response.text();
}

export function revokeAssetUrls(): void {
  for (const url of created.splice(0)) {
    URL.revokeObjectURL(url);
  }
}
