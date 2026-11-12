import Phaser from 'phaser';
import { FONT_FAMILY } from '../systems/LevelConfig';

/**
 * 鲸鱼娘立绘（phoiex/AAAAGENT 女仆设计稿，非商业署名，见致谢页）。
 *
 * 容器原点在角色脚下中心；鱼竿单独绘制，竿尖精确对齐 `rodTip`（鱼钩支点）。
 * 待机时轻微上下浮动与呼吸，抛竿/收竿有倾斜与挤压反馈。
 */
export class WhaleGirl extends Phaser.GameObjects.Container {
  private readonly figure: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private elapsedMs = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rodTip: { x: number; y: number },
    options: { showTag?: boolean; height?: number; showRod?: boolean } = {},
  ) {
    super(scene, x, y);

    const targetHeight = options.height ?? 130;
    const texture = scene.textures.get('whale-full').getSourceImage() as HTMLImageElement;
    const ratio = texture.width / Math.max(1, texture.height);
    const scale = targetHeight / Math.max(1, texture.height);

    this.shadow = scene.add
      .ellipse(0, -2, targetHeight * 0.42, targetHeight * 0.1, 0x04121f, 0.45)
      .setOrigin(0.5);

    this.figure = scene.add
      .image(0, 0, 'whale-full')
      .setOrigin(0.5, 1)
      .setScale(scale);

    // 鱼竿：从右手连到竿尖，不随角色缩放
    const handX = ratio * targetHeight * 0.13;
    const handY = -targetHeight * 0.58;
    const tipX = rodTip.x - x;
    const tipY = rodTip.y - y;
    this.add([this.shadow, this.figure]);

    if (options.showRod !== false) {
      const rod = scene.add.graphics();
      rod.lineStyle(4, 0xc99a5b, 1);
      rod.lineBetween(handX, handY, tipX, tipY);
      rod.lineStyle(2, 0xfff3d6, 0.85);
      rod.lineBetween(tipX - 3, tipY - 4, tipX + 3, tipY + 4);
      rod.fillStyle(0x8a6a4f, 1);
      rod.fillCircle(handX, handY, 3.5);
      this.add(rod);
    }

    if (options.showTag !== false) {
      const tag = scene.add
        .text(0, -targetHeight - 12, '鲸鱼娘', {
          fontFamily: FONT_FAMILY,
          fontSize: '13px',
          color: '#d8f1ff',
          backgroundColor: 'rgba(6, 24, 38, 0.5)',
          padding: { x: 7, y: 2 },
        })
        .setOrigin(0.5, 1);
      this.add(tag);
    }

    this.setDepth(7);
    scene.add.existing(this);
    this.setScale(1);
  }

  /** 抛竿时的小前倾 */
  playCast(): void {
    this.scene.tweens.add({
      targets: this.figure,
      angle: { from: 0, to: -4 },
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /** 收竿时的小弹跳 */
  playPull(): void {
    this.scene.tweens.add({
      targets: this.figure,
      scaleX: { from: this.figure.scaleX, to: this.figure.scaleX * 1.05 },
      scaleY: { from: this.figure.scaleY, to: this.figure.scaleY * 0.95 },
      duration: 120,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  override update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    const bob = Math.sin(this.elapsedMs / 520) * 1.8;
    this.figure.y = bob;
    this.shadow.scaleX = 1 - Math.abs(bob) * 0.02;
    this.figure.angle = Math.sin(this.elapsedMs / 1400) * 0.7;
  }
}
