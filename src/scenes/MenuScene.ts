import Phaser from 'phaser';
import { createButton, type GameButton } from '../ui/Button';
import { FONT_FAMILY, LEVELS } from '../systems/LevelConfig';
import { markFirstRender } from '../platform/shell';
import { getSave, loadSave, loadSaveWithTimeout, updateSave } from '../platform/save';
import { isMuted, setMuted, unlockAudio } from '../platform/sfx';
import { WhaleGirl } from '../objects/WhaleGirl';

/** 开始界面：标题、继续/新游戏、最佳纪录、鲸鱼娘立绘与同人声明 */
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
    this.cameras.main.setBackgroundColor('#08121d');

    this.drawBackdrop(width, height);

    const title = this.add
      .text(width / 2, height * 0.17, '鲸钩物语', {
        fontFamily: FONT_FAMILY,
        fontSize: '68px',
        color: '#eaf7ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#1b6b93', 9);
    title.setShadow(0, 6, '#03121d', 10, true, true);

    this.add
      .text(width / 2, height * 0.26, 'WhaleHook Tale', {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: '#9ad8f5',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.32, '钓鱼 · 钩宝 · 和海里的奇怪东西打招呼', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: '#7fb3d1',
      })
      .setOrigin(0.5);

    this.bestText = this.add
      .text(width / 2, height * 0.375, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#ffe9a8',
      })
      .setOrigin(0.5);

    this.startButton = createButton(
      this,
      width / 2,
      height * 0.47,
      '开始钓鱼',
      () => {
        void this.startFromSave();
      },
      { width: 240, height: 62, fontSize: 24 },
    );

    this.continueLabel = this.add
      .text(width / 2, height * 0.545, save.maxLevel > 1 ? '从第 1 关重新开始' : '', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#9ad8f5',
      })
      .setOrigin(0.5);
    this.add
      .zone(width / 2, height * 0.545, 240, 34)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startGame(1));

    this.add
      .text(width / 2, height * 0.61, '空格 / 点击画面 也能发射鱼钩', {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#6f93ad',
      })
      .setOrigin(0.5);

    this.mascot = new WhaleGirl(
      this,
      width / 2,
      height * 0.85,
      { x: width / 2 + 62, y: height * 0.85 + 24 },
      { showTag: false },
    );
    this.mascot.setScale(1.12);

    this.drawDisclaimer(width, height);

    this.muteText = this.add
      .text(width - 28, 28, save.muted ? '🔇' : '🔊', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: '#d8f1ff',
      })
      .setOrigin(0.5)
      .setDepth(22);
    this.add
      .circle(width - 28, 28, 24, 0xffffff, 0.001)
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
    this.cameras.main.fadeIn(240, 8, 18, 29);
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
    this.continueLabel?.setText(maxLevel > 1 ? `从第 1 关重新开始` : '');
    this.continueLabel?.setAlpha(maxLevel > 1 ? 0.85 : 0);
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

  private drawBackdrop(width: number, height: number): void {
    const g = this.add.graphics();
    const bands = [0x07121f, 0x0a1c2d, 0x0c263c, 0x0e3049, 0x0d3d58];
    const bandHeight = height / bands.length;
    bands.forEach((color, index) => {
      g.fillStyle(color, 1);
      g.fillRect(0, index * bandHeight, width, bandHeight + 1);
    });

    const scale = Math.min(width, height) / 640;
    g.fillStyle(0x9fe3ff, 0.14);
    const bubbles: Array<[number, number, number]> = [
      [0.1, 0.73, 18],
      [0.2, 0.83, 10],
      [0.88, 0.68, 24],
      [0.8, 0.85, 12],
      [0.06, 0.88, 8],
      [0.3, 0.93, 14],
    ];
    for (const [x, y, radius] of bubbles) {
      g.fillCircle(width * x, height * y, radius * scale);
    }

    g.lineStyle(2, 0x9fe3ff, 0.2);
    g.lineBetween(0, height * 0.76, width, height * 0.76);
    g.lineStyle(1, 0x9fe3ff, 0.12);
    g.lineBetween(width * 0.12, height * 0.8, width * 0.31, height * 0.8);
    g.lineBetween(width * 0.68, height * 0.79, width * 0.9, height * 0.79);
  }

  private drawDisclaimer(width: number, height: number): void {
    this.add
      .text(width / 2, height * 0.945, '非官方同人作品 · 与 DeepSeek 官方无关', {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#7c9db5',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.975, '免费、非商业用途，禁止售卖、广告变现或捐赠解锁', {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#7c9db5',
      })
      .setOrigin(0.5);
  }
}
