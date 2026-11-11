/**
 * 平台沙箱的 CSP 是 `img-src blob:`，`data:` 图片会被拦截；
 * 而 Phaser 默认用 data: URI 加载 `__DEFAULT` / `__MISSING` / `__WHITE` 三张内置纹理。
 * 纹理加载失败会让 WebGL 渲染器在 boot 时拿不到默认帧，直接抛
 * `Cannot read properties of undefined (reading 'glTexture')`。
 *
 * 这里把 Phaser 自带的同一批 PNG 字节转成 blob: URL 传回给 Phaser，
 * 既满足 CSP，也不改动纹理内容。普通网页里 blob: 同样可用。
 */
const PNG_PREFIX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAg';
const DEFAULT_PNG =
  PNG_PREFIX +
  'AQMAAABJtOi3AAAAA1BMVEX///+nxBvIAAAAAXRSTlMAQObYZgAAABVJREFUeF7NwIEAAAAAgKD9qdeocAMAoAABm3DkcAAAAABJRU5ErkJggg==';
const MISSING_PNG =
  PNG_PREFIX +
  'CAIAAAD8GO2jAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAJ9JREFUeNq01ssOwyAMRFG46v//Mt1ESmgh+DFmE2GPOBARKb2NVjo+17PXLD8a1+pl5+A+wSgFygymWYHBb0FtsKhJDdZlncG2IzJ4ayoMDv20wTmSMzClEgbWYNTAkQ0Z+OJ+A/eWnAaR9+oxCF4Os0H8htsMUp+pwcgBBiMNnAwF8GqIgL2hAzaGFFgZauDPKABmowZ4GL369/0rwACp2yA/ttmvsQAAAABJRU5ErkJggg==';
const WHITE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABdJREFUeNpi/P//PwMMMDEgAdwcgAADAJZuAwXJYZOzAAAAAElFTkSuQmCC';

export interface PhaserImageUrls {
  default: string;
  missing: string;
  white: string;
}

function toBlobUrl(dataUri: string): string {
  const comma = dataUri.indexOf(',');
  const header = dataUri.slice('data:'.length, comma);
  const mime = header.split(';')[0] || 'image/png';
  const binary = atob(dataUri.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export function createPhaserImageUrls(): PhaserImageUrls {
  return {
    default: toBlobUrl(DEFAULT_PNG),
    missing: toBlobUrl(MISSING_PNG),
    white: toBlobUrl(WHITE_PNG),
  };
}

export function revokePhaserImageUrls(urls: PhaserImageUrls): void {
  for (const url of Object.values(urls)) {
    URL.revokeObjectURL(url);
  }
}
