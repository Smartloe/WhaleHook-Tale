import Phaser from 'phaser';
import { FONT_FAMILY } from '../systems/LevelConfig';
import { getSave, loadSave, updateSave } from '../platform/save';
import { isMuted, setMuted, unlockAudio } from '../platform/sfx';
import type { LevelConfigData } from '../types/game';

/** 顶部 HUD：关卡、金币进度条、倒计时、连击与静音开关 */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;
  private readonly comboText: Phaser.GameObjects.Text;
  private readonly progress: Phaser.GameObjects.Graphics;
  private readonly progressWidth: number;
  private readonly muteText: Phaser.GameObjects.Text;
  private readonly targetScore: number;
  private lastSeconds = -1;
  private muteTouched = false;

  constructor(scene: Phaser.Scene, level: LevelConfigData, initialTimeMs: number) {
    this.scene = scene;
    this.targetScore = level.targetScore;
    const width = scene.scale.width;
    const height = scene.scale.height;
    this.progressWidth = 300;

    scene.add
      .image(16, 14, 'ui-panel')
      .setOrigin(0, 0)
      .setDisplaySize(344, 78)
      .setDepth(19);
    scene.add
      .image(width - 176, 14, 'ui-panel')
      .setOrigin(0, 0)
      .setDisplaySize(160, 78)
      .setDepth(19);

    scene.add
      .text(34, 24, `第 ${level.id} 关 · ${level.name}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#bfe9ff',
      })
      .setDepth(20);

    this.scoreText = scene.add
      .text(34, 44, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '21px',
        color: '#ffe9a8',
      })
      .setDepth(20);

    this.progress = scene.add.graphics().setDepth(20);

    this.comboText = scene.add
      .text(34, 98, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setDepth(20)
      .setAlpha(0);

    scene.add
      .text(width - 34, 24, '剩余时间', {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        color: '#8fc7e8',
      })
      .setOrigin(1, 0)
      .setDepth(20);

    this.timeText = scene.add
      .text(width - 34, 40, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '32px',
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

    this.muteText = scene.add
      .text(width - 28, height - 30, isMuted() ? '🔇' : '🔊', {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: '#d8f1ff',
      })
      .setOrigin(0.5)
      .setDepth(21);
    scene.add
      .circle(width - 28, height - 30, 24, 0xffffff, 0.001)
      .setDepth(21)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.muteTouched = true;
        const next = !isMuted();
        setMuted(next);
        unlockAudio();
        void updateSave({ muted: next });
        this.refreshMute();
      });
    setMuted(getSave().muted);
    this.refreshMute();
    void loadSave().then((save) => {
      if (this.muteTouched) return;
      setMuted(save.muted);
      this.refreshMute();
    });

    this.setScore(0);
    this.setTime(initialTimeMs);
  }

  setScore(score: number): void {
    this.scoreText.setText(`金币 ${score} / ${this.targetScore}`);
    const ratio = Phaser.Math.Clamp(score / Math.max(1, this.targetScore), 0, 1);
    const width = this.progressWidth;
    this.progress.clear();
    this.progress.fillStyle(0x10354d, 1);
    this.progress.fillRoundedRect(34, 70, width, 8, 4);
    this.progress.fillStyle(ratio >= 1 ? 0x8ef1b0 : 0xffd166, 1);
    this.progress.fillRoundedRect(34, 70, Math.max(6, width * ratio), 8, 4);
    this.progress.lineStyle(1, 0x9fe3ff, 0.35);
    this.progress.strokeRoundedRect(34, 70, width, 8, 4);
  }

  setTime(ms: number): void {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    if (seconds === this.lastSeconds) return;
    this.lastSeconds = seconds;
    this.timeText.setText(String(seconds));
    this.timeText.setColor(seconds <= 10 ? '#ff8a8a' : '#ffffff');
  }

  setCombo(combo: number): void {
    if (combo >= 2) {
      this.comboText.setText(`连击 ×${combo}`).setAlpha(1);
      this.scene.tweens.add({
        targets: this.comboText,
        scale: { from: 1.12, to: 1 },
        duration: 180,
        ease: 'Quad.easeOut',
      });
    } else {
      this.comboText.setAlpha(0);
    }
  }

  hideHint(): void {
    if (!this.hintText.visible) return;
    this.scene.tweens.add({
      targets: this.hintText,
      alpha: 0,
      duration: 400,
      onComplete: () => this.hintText.setVisible(false),
    });
  }

  private refreshMute(): void {
    this.muteText.setText(isMuted() ? '🔇' : '🔊');
  }
}
