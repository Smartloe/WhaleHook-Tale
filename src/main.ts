import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { resolveStage } from './systems/StageLayout';
import { disposeShell, initShell, showFatalError } from './platform/shell';
import { createPhaserImageUrls, revokePhaserImageUrls } from './platform/phaserTextures';

// 根据窗口宽高比选择横屏 / 竖屏舞台（微应用容器内取的是 iframe 尺寸）
const stage = resolveStage(window.innerWidth, window.innerHeight);

// 微应用沙箱的 CSP 只允许 blob: 图片，Phaser 内置纹理改用 blob URL（详见模块注释）
const imageUrls = createPhaserImageUrls();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: stage.width,
  height: stage.height,
  backgroundColor: '#08121d',
  images: {
    default: imageUrls.default,
    missing: imageUrls.missing,
    white: imageUrls.white,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  scene: [BootScene, MenuScene, GameScene, ResultScene],
};

function boot(): void {
  initShell();

  try {
    const game = new Phaser.Game(config);
    window.addEventListener(
      'pagehide',
      () => {
        game.destroy(true);
        disposeShell();
        revokePhaserImageUrls(imageUrls);
      },
      { once: true },
    );
  } catch (error) {
    showFatalError(error);
  }
}

// 微应用容器可能把 app.js 注入到片段之前，等 DOM 就绪再取节点
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
