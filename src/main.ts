import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { resolveStage } from './systems/StageLayout';
import { disposeShell, initShell, notifyShellReady, showFatalError } from './platform/shell';
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
  // 本作没有声音；微应用沙箱默认拒绝 AudioContext，
  // 禁用 Phaser 音频系统可避免启动时被权限隔离打断。
  audio: {
    noAudio: true,
  },
  scene: [BootScene, MenuScene, GameScene, ResultScene],
};

function boot(): void {
  initShell();

  try {
    const game = new Phaser.Game(config);
    // 外壳已就绪：先通知平台揭开 frame，Phaser 的 rAF 才会开始调度场景
    notifyShellReady();
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

// 微应用容器把 app.js 内联在片段之后，此时 DOM 已可用；
// 平台沙箱用 document.write 挂载，DOMContentLoaded 未必会触发，因此不要依赖它。
if (document.getElementById('game') || document.readyState !== 'loading') {
  boot();
} else {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
}
