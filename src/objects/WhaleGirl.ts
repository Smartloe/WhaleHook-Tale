import Phaser from 'phaser';
import { FONT_FAMILY } from '../systems/LevelConfig';

/**
 * 鲸鱼娘占位角色：全部用 Graphics 绘制（身体、尾鳍、水手帽、鱼竿），
 * 只做轻微上下浮动。后续替换正式立绘时，把 figure 内的 Graphics 换成 Sprite 即可，
 * 容器原点保持在角色脚下中心，鱼竿竿尖与 HOOK_TUNING.pivot 对齐。
 */
export class WhaleGirl extends Phaser.GameObjects.Container {
  private readonly figure: Phaser.GameObjects.Container;
  private elapsedMs = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rodTip: { x: number; y: number },
  ) {
    super(scene, x, y);

    this.figure = scene.add.container(0, 0);
    const art = scene.add.graphics();

    // 尾鳍
    art.fillStyle(0x3f9fd6, 1);
    art.fillTriangle(-18, 10, -40, -2, -36, 20);
    art.fillTriangle(-18, 10, -34, 22, -26, 28);

    // 身体与肚皮
    art.fillStyle(0x5ab8e8, 1);
    art.fillEllipse(0, 10, 56, 44);
    art.fillStyle(0xd6f2ff, 1);
    art.fillEllipse(0, 17, 38, 26);

    // 头
    art.fillStyle(0x7fd2f0, 1);
    art.fillCircle(0, -18, 22);

    // 眼睛与腮红
    art.fillStyle(0x10263d, 1);
    art.fillCircle(-8, -22, 2.6);
    art.fillCircle(7, -22, 2.6);
    art.fillStyle(0xffb3c2, 0.7);
    art.fillCircle(-14, -14, 3.4);
    art.fillCircle(13, -14, 3.4);

    // 水手帽
    art.fillStyle(0xf2f8ff, 1);
    art.fillEllipse(0, -36, 42, 16);
    art.fillStyle(0x2f6ea8, 1);
    art.fillRect(-16, -47, 32, 11);

    // 手
    art.fillStyle(0x5ab8e8, 1);
    art.fillCircle(24, -2, 6);

    // 鱼竿：从右手连到竿尖
    const tipX = rodTip.x - x;
    const tipY = rodTip.y - y;
    art.lineStyle(5, 0xd9b382, 1);
    art.lineBetween(24, -2, tipX, tipY);
    art.lineStyle(2, 0xbfe9ff, 0.9);
    art.lineBetween(tipX, tipY - 4, tipX, tipY + 4);

    this.figure.add(art);

    const tag = scene.add
      .text(0, -66, '鲸鱼娘', {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#cfeaff',
      })
      .setOrigin(0.5, 1);

    this.add([this.figure, tag]);
    this.setDepth(7);
    scene.add.existing(this);
  }

  override update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    this.figure.y = Math.sin(this.elapsedMs / 380) * 1.5;
  }
}
