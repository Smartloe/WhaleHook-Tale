import Phaser from 'phaser';
import { FONT_FAMILY } from '../systems/LevelConfig';

const SKIN = 0xffe3cc;
const HAIR = 0x3f7fd0;
const HAIR_DARK = 0x2c5fa8;
const FIN = 0x5ab8e8;
const DRESS = 0x2f6ea8;
const WHITE = 0xf7fbff;
/** 立绘整体缩放：保证站在船上时不越过画布顶部 */
const FIGURE_SCALE = 0.72;

/**
 * 鲸鱼娘（原创同人占位立绘）：Q 版比例、蓝色长发、鳍耳、水手帽与鲸尾。
 * 全部矢量绘制，含待机浮动、眨眼、发丝摆动，以及抛竿/收竿的小动作。
 * 替换正式立绘时保持容器原点在脚下、竿尖对齐 `rodTip` 即可。
 */
export class WhaleGirl extends Phaser.GameObjects.Container {
  private readonly figure: Phaser.GameObjects.Container;
  private readonly head: Phaser.GameObjects.Container;
  private readonly eyes: Phaser.GameObjects.Container;
  private readonly hair: Phaser.GameObjects.Container;
  private elapsedMs = 0;
  private blinkTimer = 2200;
  private blinking = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rodTip: { x: number; y: number },
    options: { showTag?: boolean } = {},
  ) {
    super(scene, x, y);

    this.figure = scene.add.container(0, 0);

    // —— 鲸尾（身后） ——
    const back = scene.add.graphics();
    back.fillStyle(FIN, 1);
    back.fillEllipse(-16, 4, 30, 22);
    back.fillTriangle(-28, 0, -50, -12, -46, 10);
    back.fillTriangle(-28, 0, -48, 14, -38, 24);
    back.lineStyle(2, 0x9fe3ff, 0.55);
    back.lineBetween(-22, 2, -40, 2);

    // —— 水手连衣裙 ——
    const body = scene.add.graphics();
    body.fillStyle(DRESS, 1);
    body.beginPath();
    body.moveTo(-16, -72);
    body.lineTo(16, -72);
    body.lineTo(28, -4);
    body.lineTo(-28, -4);
    body.closePath();
    body.fillPath();
    body.fillStyle(WHITE, 1);
    body.fillRect(-28, -11, 56, 7);
    body.fillStyle(0x1f4f7a, 0.5);
    body.fillRect(-2, -70, 4, 58);

    // —— 上衣与领巾 ——
    body.fillStyle(WHITE, 1);
    body.fillRoundedRect(-16, -88, 32, 22, 7);
    body.fillStyle(0x2f6ea8, 1);
    body.fillTriangle(-16, -88, 0, -74, 16, -88);
    body.fillStyle(0xe85d7a, 1);
    body.fillTriangle(-5, -78, 5, -78, 0, -70);

    // —— 手臂 ——
    body.fillStyle(SKIN, 1);
    body.fillEllipse(-20, -74, 9, 19);
    body.fillEllipse(21, -71, 9, 21);
    body.fillCircle(24, -59, 5);

    // —— 后发 ——
    this.hair = scene.add.container(0, 0);
    const hairBack = scene.add.graphics();
    hairBack.fillStyle(HAIR, 1);
    hairBack.fillEllipse(0, -112, 60, 54);
    hairBack.fillRoundedRect(-31, -110, 12, 44, 6);
    hairBack.fillRoundedRect(19, -110, 12, 44, 6);
    hairBack.fillStyle(HAIR_DARK, 1);
    hairBack.fillEllipse(0, -128, 48, 22);
    this.hair.add(hairBack);

    // —— 脸 ——
    const faceSkin = scene.add.graphics();
    faceSkin.fillStyle(SKIN, 1);
    faceSkin.fillCircle(0, -108, 27);

    // —— 鳍耳 ——
    const ears = scene.add.graphics();
    ears.fillStyle(FIN, 1);
    ears.fillTriangle(-26, -112, -47, -126, -41, -96);
    ears.fillTriangle(26, -112, 47, -126, 41, -96);
    ears.lineStyle(2, 0x2f8fd8, 0.65);
    ears.lineBetween(-28, -110, -41, -105);
    ears.lineBetween(28, -110, 41, -105);

    // —— 眼睛（可眨眼） ——
    this.eyes = scene.add.container(0, -106);
    const eyeArt = scene.add.graphics();
    eyeArt.fillStyle(0x10263d, 1);
    eyeArt.fillEllipse(-9, 0, 10, 14);
    eyeArt.fillEllipse(9, 0, 10, 14);
    eyeArt.fillStyle(0xffffff, 0.95);
    eyeArt.fillCircle(-10.5, -3.5, 2.8);
    eyeArt.fillCircle(7.5, -3.5, 2.8);
    eyeArt.fillStyle(0x7fd2f0, 0.6);
    eyeArt.fillCircle(-8, 3.5, 1.8);
    eyeArt.fillCircle(10, 3.5, 1.8);
    this.eyes.add(eyeArt);

    // —— 腮红与嘴 ——
    const face = scene.add.graphics();
    face.fillStyle(0xffb3c2, 0.62);
    face.fillCircle(-17, -99, 6);
    face.fillCircle(17, -99, 6);
    face.lineStyle(2, 0xd06a7f, 0.9);
    face.beginPath();
    face.arc(0, -98, 5, Math.PI * 0.15, Math.PI * 0.85);
    face.strokePath();

    // —— 刘海 ——
    const bangs = scene.add.graphics();
    bangs.fillStyle(HAIR, 1);
    bangs.fillEllipse(0, -126, 54, 30);
    bangs.fillTriangle(-27, -118, -12, -104, -20, -132);
    bangs.fillTriangle(-8, -118, 6, -106, 2, -134);
    bangs.fillTriangle(10, -118, 24, -104, 18, -132);
    bangs.fillStyle(HAIR_DARK, 0.5);
    bangs.fillTriangle(-14, -122, 0, -110, 2, -128);

    // —— 水手帽 ——
    const hat = scene.add.graphics();
    hat.fillStyle(WHITE, 1);
    hat.fillEllipse(0, -136, 48, 16);
    hat.fillStyle(0x2f6ea8, 1);
    hat.fillRoundedRect(-18, -145, 36, 11, 4);
    hat.fillStyle(0xffe9a8, 1);
    hat.fillCircle(0, -140, 2.6);

    this.head = scene.add.container(0, 0, [
      this.hair,
      faceSkin,
      ears,
      face,
      this.eyes,
      bangs,
      hat,
    ]);

    this.figure.add([back, body, this.head]);
    this.figure.setScale(FIGURE_SCALE);
    this.add(this.figure);

    // —— 鱼竿 ——（不随立绘缩放，竿尖必须精确对准鱼钩支点）
    const rod = scene.add.graphics();
    const handX = 24 * FIGURE_SCALE;
    const handY = -59 * FIGURE_SCALE;
    const tipX = rodTip.x - x;
    const tipY = rodTip.y - y;
    rod.lineStyle(4, 0xc99a5b, 1);
    rod.lineBetween(handX, handY, tipX, tipY);
    rod.lineStyle(2, 0xfff3d6, 0.9);
    rod.lineBetween(tipX - 3, tipY - 4, tipX + 3, tipY + 4);
    rod.fillStyle(0x8a6a4f, 1);
    rod.fillCircle(handX, handY, 4);
    rod.lineStyle(1, 0x9fe3ff, 0.7);
    rod.lineBetween(handX, handY, tipX, tipY - 2);
    this.add(rod);

    if (options.showTag !== false) {
      const tag = scene.add
        .text(0, -116, '鲸鱼娘', {
          fontFamily: FONT_FAMILY,
          fontSize: '13px',
          color: '#d8f1ff',
          backgroundColor: 'rgba(6, 24, 38, 0.45)',
          padding: { x: 7, y: 2 },
        })
        .setOrigin(0.5, 1);
      this.add(tag);
    }
    this.setDepth(7);
    scene.add.existing(this);

    scene.tweens.add({
      targets: this.hair,
      angle: { from: -1.6, to: 1.6 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  playCast(): void {
    this.scene.tweens.add({
      targets: this.figure,
      angle: { from: 0, to: -4 },
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  playPull(): void {
    this.scene.tweens.add({
      targets: this.figure,
      scaleX: { from: FIGURE_SCALE, to: FIGURE_SCALE * 1.06 },
      scaleY: { from: FIGURE_SCALE, to: FIGURE_SCALE * 0.96 },
      duration: 120,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  override update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    this.figure.y = Math.sin(this.elapsedMs / 420) * 1.6;
    this.head.angle = Math.sin(this.elapsedMs / 900) * 0.8;

    this.blinkTimer -= deltaMs;
    if (!this.blinking && this.blinkTimer <= 0) {
      this.blinking = true;
      this.blinkTimer = 2400 + Math.random() * 2400;
      this.scene.tweens.add({
        targets: this.eyes,
        scaleY: 0.12,
        duration: 90,
        yoyo: true,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          this.blinking = false;
          this.eyes.scaleY = 1;
        },
      });
    }
  }
}
