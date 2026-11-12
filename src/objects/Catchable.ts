import Phaser from 'phaser';
import type { CatchableData, CatchableSpec, CatchableType } from '../types/game';

const TEXTURE_BY_TYPE: Record<CatchableType, string> = {
  fish_small: 'fish-small',
  fish_big: 'fish-big',
  golden_fish: 'fish-golden',
  treasure: 'treasure',
  pearl: 'pearl',
  boot: 'boot',
};

/**
 * 可钩取物：使用 build-art.py 生成的原创精灵图。
 * 玩法数据全部放在 `info`，碰撞半径决定显示尺寸；换美术只需替换素材文件。
 */
export class Catchable extends Phaser.GameObjects.Container {
  readonly info: CatchableData;
  private readonly art: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, info: CatchableData, spec: CatchableSpec) {
    super(scene, info.x, info.y);
    this.info = info;

    const key = TEXTURE_BY_TYPE[spec.type];
    const texture = scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const width = Math.max(1, texture.width);
    const targetWidth = info.radius * 2.35;
    const scale = targetWidth / width;

    this.shadow = scene.add
      .ellipse(0, info.radius * 0.92, info.radius * 1.7, info.radius * 0.42, 0x03101c, 0.32)
      .setOrigin(0.5);

    this.art = scene.add.image(0, 0, key).setOrigin(0.5).setScale(scale);
    // 让视觉中心大致落在碰撞圆心
    this.art.y = -this.art.displayHeight * 0.1;

    this.add([this.shadow, this.art]);
    this.setSize(info.radius * 2, info.radius * 2);
    this.setDepth(4);
    scene.add.existing(this);

    this.addIdleAnimation(scene, spec.type);
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
        y: { from: this.art.y - 2, to: this.art.y + 2 },
        angle: { from: -2, to: 2 },
        duration: 1400 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      return;
    }
    if (type === 'treasure' || type === 'pearl') {
      scene.tweens.add({
        targets: this.art,
        scale: { from: this.art.scale * 0.97, to: this.art.scale * 1.02 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      return;
    }
    scene.tweens.add({
      targets: this.art,
      angle: { from: -5, to: 5 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
