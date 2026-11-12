import Phaser from 'phaser';
import { FONT_FAMILY } from '../systems/LevelConfig';
import { playSfx, unlockAudio } from '../platform/sfx';

interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  /** 主按钮用珊瑚色皮肤 */
  primary?: boolean;
  /** 关闭点击音效（例如静音开关本身） */
  silent?: boolean;
}

/** 带运行时改文案能力的按钮（存档异步加载后需要更新“继续第 N 关”） */
export interface GameButton extends Phaser.GameObjects.Container {
  setLabel(label: string): void;
}

/** 命中区外扩，方便手指点按 */
const HIT_PADDING = 10;
/** 防抖：同一按钮 250ms 内只响应一次 */
const DEBOUNCE_MS = 250;

/**
 * 按钮：使用 build-art.py 生成的药丸形皮肤。
 *
 * 命中区注意：Phaser 的命检测试会先给坐标加上 `displayOrigin`（Container 为 width/2），
 * 所以这里必须传 `(0, 0, w, h)`，而不是以中心为原点的矩形，否则实际可点区域会偏到左上角。
 *
 * 交互规则：按下即触发（不等松开），避免手机上手指轻微滑动导致点不中。
 */
export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: ButtonOptions = {},
): GameButton {
  const width = options.width ?? 190;
  const height = options.height ?? 56;
  const fontSize = options.fontSize ?? 22;
  const texture = options.primary ? 'ui-button-primary' : 'ui-button';

  const background = scene.add.image(0, 0, texture).setDisplaySize(width, height);

  const text = scene.add
    .text(0, -2, label, {
      fontFamily: FONT_FAMILY,
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#0a2236',
      strokeThickness: Math.max(3, Math.round(fontSize * 0.16)),
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [background, text]) as GameButton;
  container.setLabel = (next: string) => {
    text.setText(next);
  };
  container.setSize(width, height);
  container.setInteractive(
    new Phaser.Geom.Rectangle(
      -HIT_PADDING,
      -HIT_PADDING,
      width + HIT_PADDING * 2,
      height + HIT_PADDING * 2,
    ),
    Phaser.Geom.Rectangle.Contains,
  );
  if (container.input) {
    container.input.cursor = 'pointer';
  }

  let lastFired = 0;
  const press = () => {
    container.setScale(0.94);
    scene.time.delayedCall(90, () => container.setScale(1));
    unlockAudio();
    if (!options.silent) {
      playSfx('click');
    }
    const now = scene.time.now;
    if (now - lastFired < DEBOUNCE_MS) {
      return;
    }
    lastFired = now;
    onClick();
  };

  container.on('pointerover', () => background.setTint(0xd9f2ff));
  container.on('pointerout', () => {
    background.clearTint();
    container.setScale(1);
  });
  container.on('pointerdown', press);

  return container;
}
