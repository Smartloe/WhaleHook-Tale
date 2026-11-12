import Phaser from 'phaser';
import { createButton, type GameButton } from '../ui/Button';
import { FONT_FAMILY, LEVELS } from '../systems/LevelConfig';
import { markFirstRender } from '../platform/shell';
import { getSave, loadSave, loadSaveWithTimeout, totalStars, updateSave } from '../platform/save';
import { isMuted, setMuted, unlockAudio } from '../platform/sfx';
import { WhaleGirl } from '../objects/WhaleGirl';

const LINES = [
  '今天也要钓到宝箱哦～',
  '听说深海里有一颗夜明珠…',
  '旧靴子也要好好收起来呢。',
  '手稳一点，鱼群要游过来啦！',
  '钓不到也没关系，海风很舒服。',
];

/** 开始界面：立绘 + 标题艺术字 + 三个主按钮 */
export class MenuScene extends Phaser.Scene {
  private started = false;
  private active = true;
  private muteTouched = false;
  private mascot?: WhaleGirl;
  private bestText?: Phaser.GameObjects.Text;
  private starsText?: Phaser.GameObjects.Text;
  private startButton?: GameButton;
  private muteIcon?: Phaser.GameObjects.Image;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.started = false;
    this.active = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.active = false;
    });

    const width = this.scale.width;
    const height = this.scale.height;
    const save = getSave();
    const wide = width > height * 1.1;

    this.cameras.main.setBackgroundColor('#08121d');
    this.drawBackdrop(width, height, wide);

    const artX = wide ? width * 0.25 : width * 0.5;
    const artY = wide ? height * 0.94 : height * 0.9;
    const artHeight = wide ? height * 0.76 : height * 0.36;
    const columnX = wide ? width * 0.64 : width * 0.5;
    const topY = wide ? height * 0.1 : height * 0.08;

    this.mascot = new WhaleGirl(
      this,
      artX,
      artY,
      { x: artX + artHeight * 0.42, y: artY - artHeight * 0.06 },
      { showTag: false, height: artHeight, showRod: false },
    );

    // 标题艺术字（缺失时退回文本）
    let titleBottom = topY + 60;
    if (this.textures.exists('ui-title')) {
      const title = this.add.image(columnX, topY + 54, 'ui-title').setOrigin(0.5);
      const maxWidth = wide ? width * 0.46 : width * 0.66;
      title.setScale(Math.min(1, maxWidth / title.width));
      titleBottom = title.y + title.displayHeight / 2;
      this.tweens.add({
        targets: title,
        y: title.y - 4,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      const title = this.add
        .text(columnX, topY + 42, '鲸钩物语', {
          fontFamily: FONT_FAMILY,
          fontSize: wide ? '52px' : '40px',
          color: '#ffe9a8',
          fontStyle: 'bold',
          stroke: '#0a2236',
          strokeThickness: 8,
        })
        .setOrigin(0.5);
      titleBottom = title.y + title.height / 2;
    }

    const subtitleY = titleBottom + 14;
    this.add
      .text(columnX, subtitleY, '钓鱼 · 钩宝 · 和海里的奇怪东西打招呼', {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#9fc2d8',
      })
      .setOrigin(0.5, 0);

    this.bestText = this.add
      .text(columnX, subtitleY + 22, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#ffe9a8',
      })
      .setOrigin(0.5, 0);

    this.starsText = this.add
      .text(columnX, subtitleY + 40, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        color: '#9fc2d8',
      })
      .setOrigin(0.5, 0);

    const buttonWidth = wide ? 240 : Math.min(240, width - 96);
    const firstButtonY = subtitleY + (wide ? 96 : 104);
    const step = wide ? 66 : 60;
    this.startButton = createButton(
      this,
      columnX,
      firstButtonY,
      '开始钓鱼',
      () => {
        void this.startFromSave();
      },
      { width: buttonWidth, height: 58, fontSize: 22, primary: true },
    );
    createButton(
      this,
      columnX,
      firstButtonY + step,
      '选择关卡',
      () => this.scene.start('LevelSelect'),
      { width: buttonWidth, height: 50, fontSize: 19 },
    );
    createButton(
      this,
      columnX,
      firstButtonY + step * 2,
      '排行榜',
      () => this.scene.start('Leaderboard'),
      { width: buttonWidth, height: 50, fontSize: 19 },
    );

    createButton(
      this,
      width - 96,
      height - 34,
      '制作与致谢',
      () => this.scene.start('Credits'),
      { width: 152, height: 38, fontSize: 13 },
    ).setDepth(22);

    this.add
      .text(16, height - 14, '非官方同人作品 · 与 DeepSeek 官方无关 · 免费非商业', {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: '#7c9db5',
      })
      .setOrigin(0, 1)
      .setDepth(22);

    // 台词气泡
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    const bubbleY = artY - artHeight * 0.62;
    const bubble = this.add
      .text(artX + artHeight * 0.06, bubbleY, line, {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#0a2236',
        backgroundColor: '#eaf7ff',
        padding: { x: 10, y: 6 },
        align: 'center',
        wordWrap: { width: 190 },
      })
      .setOrigin(0, 0.5)
      .setDepth(21)
      .setAlpha(0);
    this.tweens.add({ targets: bubble, alpha: 0.95, duration: 500, delay: 400 });

    // 静音按钮
    this.add.image(width - 30, 30, 'ui-icon-button').setDisplaySize(48, 48).setDepth(22);
    this.muteIcon = this.add
      .image(width - 30, 30, save.muted ? 'ui-mute' : 'ui-sound')
      .setDisplaySize(24, 24)
      .setDepth(23);
    this.add
      .zone(width - 30, 30, 56, 56)
      .setDepth(24)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.muteTouched = true;
        const next = !isMuted();
        setMuted(next);
        unlockAudio();
        void updateSave({ muted: next });
        this.refreshMute();
      });
    setMuted(save.muted);
    this.refreshMute();

    this.input.keyboard?.addCapture('SPACE');
    this.input.keyboard?.on('keydown-SPACE', () => {
      void this.startFromSave();
    });
    this.input.keyboard?.on('keydown-ENTER', () => {
      void this.startFromSave();
    });

    void loadSave().then((loadedSave) => {
      if (!this.active) return;
      if (!this.muteTouched) {
        setMuted(loadedSave.muted);
        this.refreshMute();
      }
      this.refreshSave();
    });

    this.refreshSave();
    this.cameras.main.fadeIn(260, 8, 18, 29);
    markFirstRender();
  }

  private async startFromSave(): Promise<void> {
    const loadedSave = await loadSaveWithTimeout(600);
    if (!this.active) return;
    this.startGame(loadedSave.maxLevel);
  }

  override update(_time: number, delta: number): void {
    this.mascot?.update(delta);
  }

  private refreshSave(): void {
    const save = getSave();
    this.startButton?.setLabel(save.maxLevel > 1 ? `继续第 ${save.maxLevel} 关` : '开始钓鱼');
    this.bestText?.setText(save.best > 0 ? `历史最佳 ${save.best} 金币` : '还没有纪录，先来一竿？');
    this.starsText?.setText(`已收集 ${totalStars(save)} / ${LEVELS.length * 3} 星`);
  }

  private refreshMute(): void {
    this.muteIcon?.setTexture(isMuted() ? 'ui-mute' : 'ui-sound');
  }

  private startGame(levelId: number): void {
    if (this.started) return;
    this.started = true;
    unlockAudio();
    this.cameras.main.fadeOut(220, 8, 18, 29);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Game', { levelId: Math.min(LEVELS.length, Math.max(1, levelId)) });
    });
  }

  private drawBackdrop(width: number, height: number, wide: boolean): void {
    if (this.textures.exists('bg-zone1-landscape')) {
      const key = wide ? 'bg-zone1-landscape' : 'bg-zone1-portrait';
      this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(width, height).setDepth(0);
      this.add.rectangle(0, 0, width, height, 0x03101c, 0.32).setOrigin(0, 0).setDepth(1);
    } else {
      this.add.rectangle(0, 0, width, height, 0x0a1c2d).setOrigin(0, 0).setDepth(0);
    }

    const bubbles: Array<[number, number, number]> = [
      [0.08, 0.72, 16],
      [0.18, 0.86, 9],
      [0.9, 0.62, 20],
      [0.82, 0.88, 11],
      [0.42, 0.94, 7],
    ];
    for (const [x, y, radius] of bubbles) {
      const bubble = this.add
        .circle(width * x, height * y, radius, 0xd6f4ff, 0.14)
        .setDepth(2);
      this.tweens.add({
        targets: bubble,
        y: bubble.y - 70,
        alpha: { from: 0.14, to: 0 },
        duration: 4200 + radius * 90,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
