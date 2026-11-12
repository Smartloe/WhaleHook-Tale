import Phaser from 'phaser';
import type { CatchableData, CatchableSpec, CatchableType } from '../types/game';

const EYE_DARK = 0x0d2233;

/**
 * 可钩取物：用矢量图形绘制的原创占位美术（小鱼、大鱼、黄金鱼、宝箱、夜明珠、旧靴子）。
 * 玩法数据全部放在 `info`，以后换成正式精灵图时只需要替换 `buildArt()`。
 */
export class Catchable extends Phaser.GameObjects.Container {
  readonly info: CatchableData;
  private readonly art: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, info: CatchableData, spec: CatchableSpec) {
    super(scene, info.x, info.y);
    this.info = info;
    this.art = scene.add.container(0, 0);

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.2);
    shadow.fillEllipse(0, info.radius * 0.95, info.radius * 1.9, info.radius * 0.55);

    const body = scene.add.graphics();
    this.buildArt(body, info.type, info.radius, spec.color);

    this.art.add([shadow, body]);
    this.add(this.art);
    this.setSize(info.radius * 2, info.radius * 2);
    this.setDepth(4);
    scene.add.existing(this);

    this.addIdleAnimation(scene, info.type);
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

  markCollected(): void {
    this.info.collected = true;
  }

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

  private addIdleAnimation(scene: Phaser.Scene, type: CatchableType): void {
    if (type === 'fish_small' || type === 'fish_big' || type === 'golden_fish') {
      scene.tweens.add({
        targets: this.art,
        y: { from: -2, to: 2 },
        angle: { from: -2, to: 2 },
        duration: 1400 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (type === 'treasure' || type === 'pearl') {
      scene.tweens.add({
        targets: this.art,
        alpha: { from: 0.92, to: 1 },
        scale: { from: 0.98, to: 1.02 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private buildArt(g: Phaser.GameObjects.Graphics, type: CatchableType, r: number, color: number): void {
    switch (type) {
      case 'fish_small':
      case 'fish_big':
      case 'golden_fish':
        this.drawFish(g, r, color, type);
        break;
      case 'treasure':
        this.drawTreasure(g, r);
        break;
      case 'pearl':
        this.drawPearl(g, r);
        break;
      case 'boot':
        this.drawBoot(g, r, color);
        break;
    }
  }

  private drawFish(
    g: Phaser.GameObjects.Graphics,
    r: number,
    color: number,
    type: CatchableType,
  ): void {
    const golden = type === 'golden_fish';
    const big = type === 'fish_big';

    if (golden) {
      g.fillStyle(0xffe680, 0.18);
      g.fillCircle(0, 0, r * 1.75);
    }

    // 尾鳍
    g.fillStyle(Phaser.Display.Color.IntegerToColor(color).darken(18).color, 1);
    g.fillTriangle(-r * 0.75, 0, -r * 1.65, -r * 0.62, -r * 1.65, r * 0.62);
    // 背鳍
    g.fillTriangle(r * 0.05, -r * 0.5, r * 0.45, -r * 1.12, r * 0.6, -r * 0.4);
    // 身体
    g.fillStyle(color, 1);
    g.fillEllipse(0, 0, r * 1.95, r * 1.2);
    // 肚皮
    g.fillStyle(0xffffff, 0.32);
    g.fillEllipse(r * 0.08, r * 0.26, r * 1.35, r * 0.55);
    // 条纹（大鱼）
    if (big) {
      g.lineStyle(2, 0xffffff, 0.28);
      g.lineBetween(-r * 0.35, -r * 0.5, -r * 0.35, r * 0.5);
      g.lineBetween(0, -r * 0.56, 0, r * 0.56);
    }
    // 眼睛
    g.fillStyle(0xffffff, 1);
    g.fillCircle(r * 0.58, -r * 0.16, r * 0.2);
    g.fillStyle(EYE_DARK, 1);
    g.fillCircle(r * 0.62, -r * 0.16, r * 0.1);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(r * 0.58, -r * 0.21, r * 0.04);

    if (golden) {
      // 小皇冠与闪光
      g.fillStyle(0xfff1a8, 1);
      g.fillTriangle(-r * 0.42, -r * 0.72, -r * 0.2, -r * 1.08, 0, -r * 0.72);
      g.fillTriangle(0, -r * 0.72, r * 0.2, -r * 1.08, r * 0.42, -r * 0.72);
      g.lineStyle(2, 0xffffff, 0.9);
      g.lineBetween(r * 1.1, -r * 0.9, r * 1.4, -r * 0.9);
      g.lineBetween(r * 1.25, -r * 1.05, r * 1.25, -r * 0.75);
    }
  }

  private drawTreasure(g: Phaser.GameObjects.Graphics, r: number): void {
    g.fillStyle(0xffd166, 0.16);
    g.fillCircle(0, 0, r * 1.5);
    g.fillStyle(0x7a4a24, 1);
    g.fillRoundedRect(-r, -r * 0.25, r * 2, r * 1.15, 5);
    g.fillStyle(0x5c341a, 1);
    g.fillRoundedRect(-r, -r * 0.85, r * 2, r * 0.72, 6);
    g.fillStyle(0xffd166, 1);
    g.fillRect(-r, -r * 0.2, r * 2, r * 0.16);
    g.fillRect(-r * 0.16, -r * 0.85, r * 0.32, r * 1.75);
    g.fillStyle(0xffe9a8, 1);
    g.fillRoundedRect(-r * 0.22, -r * 0.02, r * 0.44, r * 0.38, 3);
    g.fillStyle(EYE_DARK, 1);
    g.fillCircle(0, r * 0.12, r * 0.06);
    // 宝石装饰
    g.fillStyle(0x9fe3ff, 1);
    g.fillCircle(-r * 0.6, -r * 0.48, r * 0.12);
    g.fillStyle(0xff8fb1, 1);
    g.fillCircle(r * 0.6, -r * 0.48, r * 0.12);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(-r * 0.64, -r * 0.52, r * 0.04);
  }

  private drawPearl(g: Phaser.GameObjects.Graphics, r: number): void {
    g.fillStyle(0xcdf4ff, 0.16);
    g.fillCircle(0, 0, r * 1.6);
    g.fillStyle(0x9fe3ff, 0.35);
    g.fillCircle(0, 0, r * 1.15);
    g.fillStyle(0xeafcff, 1);
    g.fillCircle(0, 0, r);
    g.fillStyle(0xffffff, 0.75);
    g.fillCircle(-r * 0.3, -r * 0.3, r * 0.32);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(-r * 0.36, -r * 0.36, r * 0.12);
    g.lineStyle(2, 0xffffff, 0.45);
    g.strokeCircle(r * 0.15, r * 0.1, r * 0.62);
  }

  private drawBoot(g: Phaser.GameObjects.Graphics, r: number, color: number): void {
    const dark = Phaser.Display.Color.IntegerToColor(color).darken(22).color;
    g.fillStyle(color, 1);
    g.fillRoundedRect(-r * 0.52, -r * 0.9, r * 1.04, r * 1.15, 5);
    g.fillRoundedRect(-r * 0.52, r * 0.18, r * 1.65, r * 0.62, 6);
    g.fillStyle(dark, 1);
    g.fillRoundedRect(-r * 0.6, r * 0.62, r * 1.8, r * 0.22, 4);
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(-r * 0.4, -r * 0.75, r * 0.12, r * 0.9);
    g.fillStyle(EYE_DARK, 0.55);
    g.fillCircle(0, -r * 0.5, r * 0.07);
    g.fillCircle(0, -r * 0.2, r * 0.07);
    g.lineStyle(2, 0xffffff, 0.35);
    g.lineBetween(-r * 0.5, r * 0.12, r * 0.5, r * 0.12);
  }
}
