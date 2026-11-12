import Phaser from 'phaser';
import { FONT_FAMILY } from '../systems/LevelConfig';

interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  /** 主按钮用珊瑚色皮肤 */
  primary?: boolean;
}

/** 带运行时改文案能力的按钮（存档异步加载后需要更新“继续第 N 关”） */
export interface GameButton extends Phaser.GameObjects.Container {
  setLabel(label: string): void;
}

/**
 * 按钮：使用 build-art.py 生成的九宫格皮肤。
 * 交互规则：按下与松开都发生在按钮上才算点击，避免拖拽误触。
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
    .text(0, 0, label, {
      fontFamily: FONT_FAMILY,
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#0a2236',
      strokeThickness: 4,
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [background, text]) as GameButton;
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

  let pressed = false;
  container.on('pointerover', () => background.setTint(0xd9f2ff));
  container.on('pointerout', () => {
    pressed = false;
    background.clearTint();
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
