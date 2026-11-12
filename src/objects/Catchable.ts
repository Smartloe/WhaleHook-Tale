import Phaser from 'phaser';
import type { CatchableData, CatchableSpec, CatchableType } from '../types/game';

const TEXTURE_BY_TYPE: Record<CatchableType, string> = {
  fish_small: 'fish-small',
  fish_big: 'fish-big',
  golden_fish: 'fish-golden',
  treasure: 'treasure',
  pearl: 'pearl',
  boot: 'boot',
  jellyfish: 'jellyfish',
  rock: 'rock',
};

/**
 * 可钩取物：使用 build-art.py 生成的原创精灵图。
 * 玩法数据放在 `info`，碰撞半径决定显示尺寸。
 * 支持三种关卡机制：游动（swim）、闪现（flash）、礁石障碍（rock 不吸附）。
 */
export class Catchable extends Phaser.GameObjects.Container {
  readonly info: CatchableData;
  private readonly art: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private swimDirection = 1;
  private hookable = true;

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
    this.art.y = -this.art.displayHeight * 0.1;

    this.add([this.shadow, this.art]);
    this.setSize(info.radius * 2, info.radius * 2);
    this.setDepth(4);
    scene.add.existing(this);

    this.addIdleAnimation(scene, spec.type);
    if (info.flashing) {
      this.startFlashing(scene);
    }
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

  /** 是否可以钩取（闪现物件在暗下去时不可钩，礁石永远不可钩） */
  isHookable(): boolean {
    return this.hookable && !this.info.collected;
  }

  /** 关卡机制：游动 */
  override update(deltaMs: number): void {
    const swim = this.info.swim;
    if (!swim || this.info.collected) {
      return;
    }
    const step = (swim.speed * deltaMs) / 1000 * this.swimDirection;
    this.x += step;
    if (this.x <= swim.minX) {
      this.x = swim.minX;
      this.swimDirection = 1;
    } else if (this.x >= swim.maxX) {
      this.x = swim.maxX;
      this.swimDirection = -1;
    }
    this.info.x = this.x;
    this.art.scaleX = Math.abs(this.art.scaleX) * (this.swimDirection > 0 ? 1 : -1);
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

  private startFlashing(scene: Phaser.Scene): void {
    scene.time.addEvent({
      delay: 2400,
      loop: true,
      callback: () => {
        if (this.info.collected) {
          return;
        }
        this.hookable = !this.hookable;
        scene.tweens.add({
          targets: this,
          alpha: this.hookable ? 1 : 0.35,
          duration: 220,
        });
      },
    });
  }

  private addIdleAnimation(scene: Phaser.Scene, type: CatchableType): void {
    if (type === 'rock') {
      return;
    }
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
