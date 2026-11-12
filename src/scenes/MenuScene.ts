import Phaser from 'phaser';
import { createButton, type GameButton } from '../ui/Button';
import { FONT_FAMILY, LEVELS } from '../systems/LevelConfig';
import { markFirstRender } from '../platform/shell';
import { getSave, loadSave, loadSaveWithTimeout, updateSave } from '../platform/save';
import { isMuted, setMuted, unlockAudio } from '../platform/sfx';
import { WhaleGirl } from '../objects/WhaleGirl';

/** 开始界面：立绘 + 标题 + 主按钮 + 纪录 + 致谢入口 */
export class MenuScene extends Phaser.Scene {
  private started = false;
  private active = true;
  private muteTouched = false;
  private mascot?: WhaleGirl;
  private bestText?: Phaser.GameObjects.Text;
  private continueLabel?: Phaser.GameObjects.Text;
  private muteText?: Phaser.GameObjects.Text;
  private startButton?: GameButton;

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

    // 布局：横屏左右分栏，竖屏上下排列
    const artX = wide ? width * 0.26 : width * 0.5;
    const artY = wide ? height * 0.94 : height * 0.9;
    const artHeight = wide ? height * 0.72 : height * 0.36;
    const columnX = wide ? width * 0.64 : width * 0.5;
    const topY = wide ? height * 0.16 : height * 0.12;

    this.mascot = new WhaleGirl(
      this,
      artX,
      artY,
      { x: artX + artHeight * 0.42, y: artY - artHeight * 0.06 },
      { showTag: false, height: artHeight, showRod: false },
    );

    const title = this.add
      .text(columnX, topY, '鲸钩物语', {
        fontFamily: FONT_FAMILY,
        fontSize: wide ? '58px' : '46px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#1b6b93', 10);
    title.setShadow(0, 6, '#03121d', 10, true, true);

    this.add
      .text(columnX, topY + (wide ? 58 : 48), 'WhaleHook Tale', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: '#9ad8f5',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    this.add
      .text(columnX, topY + (wide ? 96 : 82), '钓鱼 · 钩宝 · 和海里的奇怪东西打招呼', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#8fb8d1',
      })
      .setOrigin(0.5);

    this.bestText = this.add
      .text(columnX, topY + (wide ? 132 : 122), '', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#ffe9a8',
      })
      .setOrigin(0.5);

    this.startButton = createButton(
      this,
      columnX,
      topY + (wide ? 200 : 190),
      '开始钓鱼',
      () => {
        void this.startFromSave();
      },
      { width: 240, height: 62, fontSize: 24, primary: true },
    );

    this.continueLabel = this.add
      .text(columnX, topY + (wide ? 246 : 236), '', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#bfe9ff',
      })
      .setOrigin(0.5);
    this.add
      .zone(columnX, topY + (wide ? 246 : 236), 240, 34)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startGame(1));

    this.add
      .text(columnX, topY + (wide ? 288 : 270), '空格 / 点击画面 也能发射鱼钩', {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#6f93ad',
      })
      .setOrigin(0.5);

    createButton(
      this,
      width - 108,
      height - 40,
      '制作与素材致谢',
      () => this.scene.start('Credits'),
      { width: 176, height: 40, fontSize: 14 },
    ).setDepth(22);

    this.muteText = this.add
      .text(width - 26, 26, save.muted ? '🔇' : '🔊', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: '#d8f1ff',
      })
      .setOrigin(0.5)
      .setDepth(22);
    this.add
      .circle(width - 26, 26, 24, 0xffffff, 0.001)
      .setDepth(22)
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

    this.drawDisclaimer(width, height);

    const assetError = (window as unknown as { __assetError?: string }).__assetError;
    if (assetError) {
      this.add
        .text(width / 2, height - 46, `素材错误：${assetError}｜纹理数 ${this.textures.getTextureKeys().length}`.slice(0, 160), {
          fontFamily: FONT_FAMILY,
          fontSize: '12px',
          color: '#ffb3b3',
          wordWrap: { width: width - 40 },
        })
        .setOrigin(0.5)
        .setDepth(30);
    }

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
      this.refreshSave(loadedSave.best, loadedSave.maxLevel);
    });

    this.refreshSave(save.best, save.maxLevel);
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

  private refreshSave(best: number, maxLevel: number): void {
    this.bestText?.setText(best > 0 ? `历史最佳 ${best} 金币` : '还没有纪录，先来一竿？');
    this.startButton?.setLabel(maxLevel > 1 ? `继续第 ${maxLevel} 关` : '开始钓鱼');
    this.continueLabel?.setText(maxLevel > 1 ? '从第 1 关重新开始' : '');
    this.continueLabel?.setAlpha(maxLevel > 1 ? 0.9 : 0);
  }

  private refreshMute(): void {
    this.muteText?.setText(isMuted() ? '🔇' : '🔊');
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
    if (this.textures.exists('bg-1-landscape')) {
      const key = wide ? 'bg-1-landscape' : 'bg-1-portrait';
      this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(width, height).setDepth(0);
      // 压暗一点，让文字更清楚
      this.add.rectangle(0, 0, width, height, 0x03101c, 0.35).setOrigin(0, 0).setDepth(1);
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

  private drawDisclaimer(_width: number, height: number): void {
    this.add
      .text(16, height - 18, '非官方同人作品 · 与 DeepSeek 官方无关 · 免费非商业', {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        color: '#7c9db5',
      })
      .setOrigin(0, 1)
      .setDepth(22);
  }
}
