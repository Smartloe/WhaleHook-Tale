import Phaser from 'phaser';
import { FONT_FAMILY } from '../systems/LevelConfig';

interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
}

/** 带运行时改文案能力的按钮（存档异步加载后需要更新“继续第 N 关”） */
export interface GameButton extends Phaser.GameObjects.Container {
  setLabel(label: string): void;
}

/**
 * 占位风格按钮：圆角矩形 + 文本，鼠标悬停/按下有反馈。
 * 菜单与结算界面共用；后续换 UI 素材时只改这里。
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

  const bg = scene.add.graphics();
  const paint = (fill: number, strokeAlpha: number) => {
    bg.clear();
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
    bg.lineStyle(2, 0x9fe3ff, strokeAlpha);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);
  };
  paint(0x1b4b66, 0.8);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONT_FAMILY,
      fontSize: `${fontSize}px`,
      color: '#eaf7ff',
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]) as GameButton;
  container.setLabel = (next: string) => {
    text.setText(next);
  };
  container.setSize(width, height);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
  if (container.input) {
    container.input.cursor = 'pointer';
  }

  // 只有「在按钮上按下、也在按钮上松开」才算点击，避免拖拽误触
  let pressed = false;
  container.on('pointerover', () => paint(0x266b90, 1));
  container.on('pointerout', () => {
    pressed = false;
    paint(0x1b4b66, 0.8);
    container.setScale(1);
  });
  container.on('pointerdown', () => {
    pressed = true;
    container.setScale(0.97);
  });
  container.on('pointerup', () => {
    if (!pressed) return;
    pressed = false;
    container.setScale(1);
    onClick();
  });

  return container;
}
