import Phaser from 'phaser';
import { createButton } from '../ui/Button';
import { FONT_FAMILY } from '../systems/LevelConfig';
import { markFirstRender } from '../platform/shell';

/** 开始界面：标题、开始按钮、同人声明（坐标按画布尺寸自适应） */
export class MenuScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.started = false;
    const width = this.scale.width;
    const height = this.scale.height;
    this.cameras.main.setBackgroundColor('#08121d');

    this.drawBackdrop(width, height);

    const title = this.add
      .text(width / 2, height * 0.25, '鲸钩物语', {
        fontFamily: FONT_FAMILY,
        fontSize: '68px',
        color: '#eaf7ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#1b6b93', 8);
    title.setShadow(0, 6, '#03121d', 8, true, true);

    this.add
      .text(width / 2, height * 0.35, 'WhaleHook Tale', {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: '#9ad8f5',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.41, '钓鱼 · 钩宝 · 和海里的奇怪东西打招呼', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: '#7fb3d1',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.47, '🐟    🐠    💎    🥾', {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    createButton(this, width / 2, height * 0.6, '开始钓鱼', () => this.startGame(), {
      width: 220,
      height: 60,
      fontSize: 24,
    });

    this.add
      .text(width / 2, height * 0.67, '空格 / 点击画面 也能发射鱼钩', {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#6f93ad',
      })
      .setOrigin(0.5);

    this.drawDisclaimer(width, height);

    this.input.keyboard?.addCapture('SPACE');
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.on('keydown-ENTER', () => this.startGame());

    this.cameras.main.fadeIn(240, 8, 18, 29);
    // 首屏已准备就绪：移除 HTML 加载提示，并通知微应用平台
    markFirstRender();
  }

  private startGame(): void {
    if (this.started) return;
    this.started = true;
    this.cameras.main.fadeOut(220, 8, 18, 29);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Game', { levelId: 1 });
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

    // 气泡占位装饰（相对坐标）
    g.fillStyle(0x9fe3ff, 0.14);
    const scale = Math.min(width, height) / 640;
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

    // 水面高光
    g.lineStyle(2, 0x9fe3ff, 0.2);
    g.lineBetween(0, height * 0.76, width, height * 0.76);
    g.lineStyle(1, 0x9fe3ff, 0.12);
    g.lineBetween(width * 0.12, height * 0.8, width * 0.31, height * 0.8);
    g.lineBetween(width * 0.68, height * 0.79, width * 0.9, height * 0.79);
  }

  private drawDisclaimer(width: number, height: number): void {
    this.add
      .text(width / 2, height * 0.87, '非官方同人作品 · 与 DeepSeek 官方无关', {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#7c9db5',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.905, '免费、非商业用途，禁止售卖、广告变现或捐赠解锁', {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#7c9db5',
      })
      .setOrigin(0.5);
  }
}
