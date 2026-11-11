import Phaser from 'phaser';
import { FONT_FAMILY } from '../systems/LevelConfig';
import type { LevelConfigData } from '../types/game';

/** 顶部 HUD：关卡、金币/目标、倒计时，以及底部操作提示（坐标随画布尺寸自适应） */
export class Hud {
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;
  private readonly targetScore: number;
  private lastSeconds = -1;

  constructor(scene: Phaser.Scene, level: LevelConfigData, initialTimeMs: number) {
    this.targetScore = level.targetScore;
    const width = scene.scale.width;
    const height = scene.scale.height;

    const panel = scene.add.graphics().setDepth(19);
    panel.fillStyle(0x061320, 0.55);
    panel.fillRoundedRect(16, 14, 330, 58, 16);
    panel.lineStyle(2, 0x3f86b5, 0.7);
    panel.strokeRoundedRect(16, 14, 330, 58, 16);

    panel.fillStyle(0x061320, 0.55);
    panel.fillRoundedRect(width - 176, 14, 160, 58, 16);
    panel.lineStyle(2, 0x3f86b5, 0.7);
    panel.strokeRoundedRect(width - 176, 14, 160, 58, 16);

    scene.add
      .text(34, 24, `第 ${level.id} 关 · ${level.name}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#8fc7e8',
      })
      .setDepth(20);

    this.scoreText = scene.add
      .text(34, 43, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: '#ffe9a8',
      })
      .setDepth(20);

    scene.add
      .text(width - 34, 24, '剩余时间', {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        color: '#8fc7e8',
      })
      .setOrigin(1, 0)
      .setDepth(20);

    this.timeText = scene.add
      .text(width - 34, 38, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(20);

    this.hintText = scene.add
      .text(width / 2, height - 30, '按 空格 或 点击画面 发射鱼钩', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#9ad8f5',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0.9);

    this.setScore(0);
    this.setTime(initialTimeMs);
  }

  setScore(score: number): void {
    this.scoreText.setText(`金币 ${score} / ${this.targetScore}`);
  }

  setTime(ms: number): void {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    if (seconds === this.lastSeconds) return;
    this.lastSeconds = seconds;
    this.timeText.setText(String(seconds));
    this.timeText.setColor(seconds <= 10 ? '#ff8a8a' : '#ffffff');
  }

  hideHint(): void {
    if (!this.hintText.visible) return;
    this.hintText.scene.tweens.add({
      targets: this.hintText,
      alpha: 0,
      duration: 400,
      onComplete: () => this.hintText.setVisible(false),
    });
  }
}
