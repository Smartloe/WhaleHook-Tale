import Phaser from 'phaser';
import { FONT_FAMILY } from '../systems/LevelConfig';
import { loadAssetBytes } from '../platform/assets';
import { showFatalError } from '../platform/shell';

/** 全部图片资源：键名 → 包内路径（同时用于 Web 与微应用） */
export const ASSETS: ReadonlyArray<readonly [string, string]> = [
  ['whale-full', 'assets/whale/whale-full.webp'],
  ['whale-small', 'assets/whale/whale-small.webp'],
  ['whale-face', 'assets/whale/whale-face.webp'],
  ['fish-small', 'assets/items/fish-small.webp'],
  ['fish-big', 'assets/items/fish-big.webp'],
  ['fish-golden', 'assets/items/fish-golden.webp'],
  ['treasure', 'assets/items/treasure.webp'],
  ['pearl', 'assets/items/pearl.webp'],
  ['boot', 'assets/items/boot.webp'],
  ['jellyfish', 'assets/items/jellyfish.webp'],
  ['rock', 'assets/items/rock.webp'],
  ['hook', 'assets/items/hook.webp'],
  ['boat', 'assets/scene/boat.webp'],
  ['kelp-1', 'assets/scene/kelp-1.webp'],
  ['kelp-2', 'assets/scene/kelp-2.webp'],
  ['kelp-3', 'assets/scene/kelp-3.webp'],
  ['ui-vignette-landscape', 'assets/ui/vignette-landscape.webp'],
  ['ui-vignette-portrait', 'assets/ui/vignette-portrait.webp'],
  ['bg-zone1-landscape', 'assets/scene/bg-zone1-landscape.webp'],
  ['bg-zone1-portrait', 'assets/scene/bg-zone1-portrait.webp'],
  ['bg-zone2-landscape', 'assets/scene/bg-zone2-landscape.webp'],
  ['bg-zone2-portrait', 'assets/scene/bg-zone2-portrait.webp'],
  ['bg-zone3-landscape', 'assets/scene/bg-zone3-landscape.webp'],
  ['bg-zone3-portrait', 'assets/scene/bg-zone3-portrait.webp'],
  ['bg-zone4-landscape', 'assets/scene/bg-zone4-landscape.webp'],
  ['bg-zone4-portrait', 'assets/scene/bg-zone4-portrait.webp'],
  ['ui-button', 'assets/ui/button.webp'],
  ['ui-button-primary', 'assets/ui/button-primary.webp'],
  ['ui-icon-button', 'assets/ui/icon-button.webp'],
  ['ui-panel', 'assets/ui/panel.webp'],
  ['ui-title', 'assets/ui/title.webp'],
  ['ui-coin', 'assets/ui/icon-coin.webp'],
  ['ui-clock', 'assets/ui/icon-clock.webp'],
  ['ui-trophy', 'assets/ui/icon-trophy.webp'],
  ['ui-back', 'assets/ui/icon-back.webp'],
  ['ui-lock', 'assets/ui/icon-lock.webp'],
  ['ui-sound', 'assets/ui/icon-sound.webp'],
  ['ui-mute', 'assets/ui/icon-mute.webp'],
  ['ui-star', 'assets/ui/star.webp'],
  ['ui-star-empty', 'assets/ui/star-empty.webp'],
];

function mimeOf(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

/**
 * 启动场景：读取包内素材字节 → `createImageBitmap` 解码 → 直接注册纹理。
 *
 * 不走 Phaser Loader 的图片请求路径：微应用沙箱的 CSP 只允许 blob:，
 * 且 sandbox 帧里对 blob: 的 <img> 加载并不可靠。`createImageBitmap(blob)`
 * 不经过 img-src 请求，因此在沙箱与普通网页里行为一致。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#08121d');
    const width = this.scale.width;
    const height = this.scale.height;

    const title = this.add
      .text(width / 2, height * 0.44, '鲸钩物语', {
        fontFamily: FONT_FAMILY,
        fontSize: '40px',
        color: '#eaf7ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const progress = this.add.graphics();
    const barWidth = Math.min(280, width * 0.6);
    const barX = (width - barWidth) / 2;
    const barY = height * 0.54;

    const drawBar = (ratio: number) => {
      progress.clear();
      progress.fillStyle(0x10354d, 1);
      progress.fillRoundedRect(barX, barY, barWidth, 10, 5);
      progress.fillStyle(0xffd166, 1);
      progress.fillRoundedRect(barX, barY, Math.max(8, barWidth * ratio), 10, 5);
    };
    drawBar(0);

    const hint = this.add
      .text(width / 2, barY + 30, '正在准备鱼竿…', {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#7fb3d1',
      })
      .setOrigin(0.5);

    void (async () => {
      const failed: string[] = [];
      for (let index = 0; index < ASSETS.length; index += 1) {
        const [key, path] = ASSETS[index];
        if (this.textures.exists(key)) {
          drawBar((index + 1) / ASSETS.length);
          continue;
        }
        try {
          const buffer = await loadAssetBytes(path);
          const blob = new Blob([buffer], { type: mimeOf(path) });
          const bitmap = await createImageBitmap(blob);
          // Phaser 3.60+ 的 WebGL 纹理解码支持 ImageBitmap，类型声明仍是 HTMLImageElement
          this.textures.addImage(key, bitmap as unknown as HTMLImageElement);
        } catch (error) {
          failed.push(key);
          console.warn('[whalehook] 素材解码失败', key, error);
        }
        drawBar((index + 1) / ASSETS.length);
      }

      if (failed.length) {
        (window as unknown as { __assetError?: string }).__assetError =
          `failed(${failed.length}): ${failed.join(',')}`;
      }

      drawBar(1);
      title.destroy();
      hint.destroy();
      progress.destroy();
      this.scene.start('Menu');
    })();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (!this.scene.isActive()) {
        return;
      }
      try {
        this.scene.start('Menu');
      } catch (error) {
        showFatalError(error);
      }
    });
  }
}
