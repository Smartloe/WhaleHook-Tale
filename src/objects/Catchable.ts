import Phaser from 'phaser';
import type { CatchableData, CatchableSpec } from '../types/game';

/**
 * 可钩取物的表现层占位实现：一个圆形色块 + emoji。
 * 数据全部放在 `info`（CatchableData）里，后续替换为精灵图时只需改这里的绘制部分，
 * 位置、半径、价值、重量等玩法数据无需改动。
 */
export class Catchable extends Phaser.GameObjects.Container {
  readonly info: CatchableData;

  constructor(scene: Phaser.Scene, info: CatchableData, spec: CatchableSpec) {
    super(scene, info.x, info.y);
    this.info = info;

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.22);
    shadow.fillEllipse(0, info.radius * 0.75, info.radius * 1.6, info.radius * 0.5);

    const body = scene.add.graphics();
    body.fillStyle(spec.color, 1);
    body.fillCircle(0, 0, info.radius);
    body.lineStyle(2, 0xffffff, 0.35);
    body.strokeCircle(0, 0, info.radius);

    const label = scene.add
      .text(0, 0, spec.emoji, {
        fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        fontSize: `${Math.round(info.radius * 1.6)}px`,
      })
      .setOrigin(0.5);

    this.add([shadow, body, label]);
    this.setSize(info.radius * 2, info.radius * 2);
    this.setDepth(4);
    scene.add.existing(this);
  }

  get radius(): number {
    return this.info.radius;
  }

  get weight(): number {
    return this.info.weight;
  }

  get collected(): boolean {
    return this.info.collected;
  }

  /** 被钩中时标记，避免重复吸附与重复计分 */
  markCollected(): void {
    this.info.collected = true;
  }

  /** 回收到位后的离场动画（占位用缩放淡出，替换精灵后改为对应动画） */
  playCollected(scene: Phaser.Scene): void {
    scene.tweens.add({
      targets: this,
      scale: 0,
      alpha: 0,
      duration: 220,
      ease: 'Back.easeIn',
      onComplete: () => this.setVisible(false),
    });
  }
}
