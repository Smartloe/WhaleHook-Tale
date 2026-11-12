import Phaser from 'phaser';
import { FONT_FAMILY } from '../systems/LevelConfig';
import { getSave, loadSave, updateSave } from '../platform/save';
import { isMuted, setMuted, unlockAudio } from '../platform/sfx';
import type { LevelConfigData } from '../types/game';

/** 顶部 HUD：金币胶囊、倒计时、关卡名、连击与静音开关 */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;
  private readonly comboText: Phaser.GameObjects.Text;
  private readonly progress: Phaser.GameObjects.Graphics;
  private readonly progressWidth: number;
  private readonly muteIcon: Phaser.GameObjects.Image;
  private readonly targetScore: number;
  private lastSeconds = -1;
  private muteTouched = false;

  constructor(scene: Phaser.Scene, level: LevelConfigData, initialTimeMs: number) {
    this.scene = scene;
    this.targetScore = level.targetScore;
    const width = scene.scale.width;
    const height = scene.scale.height;
    const compact = width < 760;
    const leftWidth = compact ? 300 : 344;
    this.progressWidth = leftWidth - 64;

    scene.add.image(16, 14, 'ui-panel').setOrigin(0, 0).setDisplaySize(leftWidth, 78).setDepth(19);
    scene.add.image(width - 152, 14, 'ui-panel').setOrigin(0, 0).setDisplaySize(136, 78).setDepth(19);

    scene.add.image(44, 42, 'ui-coin').setDisplaySize(26, 26).setDepth(20);
    this.scoreText = scene.add
      .text(62, 24, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '21px',
        color: '#ffe9a8',
        fontStyle: 'bold',
        stroke: '#0a2236',
        strokeThickness: 4,
      })
      .setDepth(20);

    scene.add
      .text(62, 50, `${level.name} · 目标 ${level.targetScore}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        color: '#9fc2d8',
      })
      .setDepth(20);

    this.progress = scene.add.graphics().setDepth(20);

    scene.add.image(width - 130, 50, 'ui-clock').setDisplaySize(30, 30).setDepth(20);
    this.timeText = scene.add
      .text(width - 30, 30, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#0a2236',
        strokeThickness: 5,
      })
      .setOrigin(1, 0)
      .setDepth(20);

    this.comboText = scene.add
      .text(width / 2, 40, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: '#ffd166',
        fontStyle: 'bold',
        stroke: '#0a2236',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(20)
      .setAlpha(0);

    this.hintText = scene.add
      .text(width / 2, height - 28, '按 空格 或 点击画面 发射鱼钩', {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#9ad8f5',
        stroke: '#0a2236',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0.92);

    // 静音图标按钮
    scene.add.image(width - 30, height - 30, 'ui-icon-button').setDisplaySize(48, 48).setDepth(21);
    this.muteIcon = scene.add
      .image(width - 30, height - 30, isMuted() ? 'ui-mute' : 'ui-sound')
      .setDisplaySize(24, 24)
      .setDepth(22);
    scene.add
      .zone(width - 30, height - 30, 56, 56)
      .setDepth(23)
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
    this.scoreText.setText(String(score));
    const ratio = Phaser.Math.Clamp(score / Math.max(1, this.targetScore), 0, 1);
    const width = this.progressWidth;
    this.progress.clear();
    this.progress.fillStyle(0x0b2740, 1);
    this.progress.fillRoundedRect(62, 70, width, 9, 4);
    this.progress.fillStyle(ratio >= 1 ? 0x8ef1b0 : 0xffd166, 1);
    this.progress.fillRoundedRect(62, 70, Math.max(8, width * ratio), 9, 4);
    this.progress.lineStyle(1, 0xbfe9ff, 0.35);
    this.progress.strokeRoundedRect(62, 70, width, 9, 4);
  }

  setTime(ms: number): void {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    if (seconds === this.lastSeconds) return;
    this.lastSeconds = seconds;
    this.timeText.setText(String(seconds));
    const urgent = seconds <= 10;
    this.timeText.setColor(urgent ? '#ff8a8a' : '#ffffff');
    if (urgent) {
      this.scene.tweens.add({
        targets: this.timeText,
        scale: { from: 1.18, to: 1 },
        duration: 220,
        ease: 'Quad.easeOut',
      });
    }
  }

  setCombo(combo: number): void {
    if (combo >= 2) {
      this.comboText.setText(`连击 ×${combo}`).setAlpha(1);
      this.scene.tweens.add({
        targets: this.comboText,
        scale: { from: 1.18, to: 1 },
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
    this.muteIcon.setTexture(isMuted() ? 'ui-mute' : 'ui-sound');
  }
}
