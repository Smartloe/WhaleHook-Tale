import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import {
  isViewportReliable,
  readViewport,
  resolveStage,
  type StageLayout,
} from './systems/StageLayout';
import { disposeShell, initShell, notifyShellReady, showFatalError } from './platform/shell';
import { createPhaserImageUrls, revokePhaserImageUrls } from './platform/phaserTextures';

// 微应用沙箱的 CSP 只允许 blob: 图片，Phaser 内置纹理改用 blob URL（详见模块注释）
const imageUrls = createPhaserImageUrls();

let game: Phaser.Game | null = null;
let booted = false;

function buildConfig(stage: StageLayout): Phaser.Types.Core.GameConfig {
  return {
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
    // 本作没有 Phaser 音频；音效由 platform/sfx 自己合成，
    // 沙箱默认拒绝 AudioContext 时它会静默降级。
    audio: {
      noAudio: true,
    },
    scene: [BootScene, MenuScene, GameScene, ResultScene],
  };
}

function startGame(stage: StageLayout): Phaser.Game {
  return new Phaser.Game(buildConfig(stage));
}

/**
 * 平台的 frame 在 app-rendered 之前是 hidden/inert，此时读到的视口可能是 0×0。
 * 先按桌面横屏启动，等揭示后再按真实尺寸纠正一次。
 */
function correctStageWhenVisible(current: StageLayout): void {
  let done = false;
  let settleTimer = 0;

  const cleanup = () => {
    done = true;
    window.removeEventListener('resize', apply);
    document.removeEventListener('visibilitychange', apply);
    window.clearTimeout(settleTimer);
  };

  const apply = () => {
    if (done || !game) return;
    const viewport = readViewport();
    if (!isViewportReliable(viewport)) return;
    const next = resolveStage(viewport.width, viewport.height);
    if (next.kind === current.kind) {
      cleanup();
      return;
    }
    // 玩家已经开始游戏时不再重建立即纠正，避免把当前一局丢掉
    if (!game.scene.isActive('Menu')) {
      cleanup();
      return;
    }
    // 等视口稳定一会，避免把揭示过程中的中间尺寸当成最终布局
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      if (done || !game) return;
      const settled = readViewport();
      if (!isViewportReliable(settled)) return;
      const finalStage = resolveStage(settled.width, settled.height);
      cleanup();
      if (finalStage.kind === current.kind) return;
      if (!game.scene.isActive('Menu')) return;
      game.destroy(true);
      try {
        game = startGame(finalStage);
      } catch (error) {
        showFatalError(error);
      }
    }, 600);
  };

  window.addEventListener('resize', apply);
  document.addEventListener('visibilitychange', apply);
  // frame 可能已经揭示，先试一次
  window.setTimeout(apply, 0);
}

function boot(): void {
  if (booted) return;
  booted = true;
  initShell();

  const viewport = readViewport();
  const reliable = isViewportReliable(viewport);
  // 隐藏 frame 读不到视口时，先用屏幕尺寸猜一个舞台，等揭示后再纠正
  const fallbackWidth = window.screen?.availWidth || 1280;
  const fallbackHeight = window.screen?.availHeight || 800;
  const stage = reliable
    ? resolveStage(viewport.width, viewport.height)
    : resolveStage(fallbackWidth, fallbackHeight);

  try {
    game = startGame(stage);
    // 先通知平台揭开 frame，Phaser 的渲染循环才会在隐藏状态下恢复调度
    notifyShellReady();
    if (!reliable) {
      correctStageWhenVisible(stage);
    }
    window.addEventListener(
      'pagehide',
      () => {
        game?.destroy(true);
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
// 平台沙箱用 document.write 挂载，DOMContentLoaded 未必会触发，因此优先直接启动。
if (document.getElementById('game') || document.readyState !== 'loading') {
  boot();
} else {
  // DOMContentLoaded 在部分沙箱挂载方式下可能不触发，加一个兜底定时器；
  // boot() 内部有重入保护，两条路径都只会创建一次游戏。
  const fallback = window.setTimeout(boot, 1000);
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      window.clearTimeout(fallback);
      boot();
    },
    { once: true },
  );
}
