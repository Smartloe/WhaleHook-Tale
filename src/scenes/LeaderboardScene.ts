import Phaser from 'phaser';
import { createButton } from '../ui/Button';
import { FONT_FAMILY, LEVELS, getLevel, isLastLevel } from '../systems/LevelConfig';
import { getLevelRuns, getTotalRanking } from '../systems/Leaderboard';
import { getSave } from '../platform/save';

type Tab = 'level' | 'total';

/** 排行榜：单关前 10 名 + 各关最佳成绩，数据来自本机存档 */
export class LeaderboardScene extends Phaser.Scene {
  private tab: Tab = 'level';
  private levelId = 1;
  private listContainer?: Phaser.GameObjects.Container;
  private headerText?: Phaser.GameObjects.Text;
  private arrows: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('Leaderboard');
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const wide = width > height * 1.1;

    this.cameras.main.setBackgroundColor('#08121d');
    if (this.textures.exists('bg-zone2-landscape')) {
      const key = wide ? 'bg-zone2-landscape' : 'bg-zone2-portrait';
      this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(width, height).setDepth(0);
      this.add.rectangle(0, 0, width, height, 0x03101c, 0.62).setOrigin(0, 0).setDepth(1);
    }

    this.add
      .text(width / 2, 16, '排行榜', {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#0a2236',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.tab = 'level';
    this.levelId = Math.max(1, Math.min(LEVELS.length, getSave().maxLevel));
    this.headerText = this.add
      .text(width / 2, 56, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#bfe9ff',
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    createButton(this, width / 2 - 110, 104, '单关榜', () => {
      this.tab = 'level';
      this.render();
    }, { width: 150, height: 40, fontSize: 14 }).setDepth(10);
    createButton(this, width / 2 + 110, 104, '关卡最佳', () => {
      this.tab = 'total';
      this.render();
    }, { width: 150, height: 40, fontSize: 14 }).setDepth(10);

    this.render();

    createButton(this, 84, height - 34, '返回', () => this.scene.start('Menu'), {
      width: 128,
      height: 38,
      fontSize: 14,
    }).setDepth(12);

    this.add
      .text(width - 16, height - 12, '成绩只保存在本设备', {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: '#7c9db5',
      })
      .setOrigin(1, 1)
      .setDepth(12);

    this.cameras.main.fadeIn(200, 8, 18, 29);
  }

  private render(): void {
    this.listContainer?.destroy();
    for (const arrow of this.arrows.splice(0)) {
      arrow.destroy();
    }
    const width = this.scale.width;
    const height = this.scale.height;
    const container = this.add.container(0, 0).setDepth(9);
    this.listContainer = container;

    // 列表底图
    const panelWidth = Math.min(520, width - 40);
    const panelTop = 132;
    const panelHeight = Math.max(120, height - panelTop - 64);
    container.add(
      this.add
        .nineslice(width / 2, panelTop, 'ui-panel', undefined, panelWidth, panelHeight, 30, 30, 30, 30)
        .setOrigin(0.5, 0),
    );

    const level = getLevel(this.levelId);
    if (this.headerText) {
      this.headerText.setText(
        this.tab === 'level' ? `第 ${this.levelId} 关 · ${level.name}` : '各关最佳成绩',
      );
    }

    if (this.tab === 'level') {
      this.renderLevelTab(container, width, height);
    } else {
      this.renderTotalTab(container, width, height);
    }
  }

  private renderLevelTab(
    container: Phaser.GameObjects.Container,
    width: number,
    height: number,
  ): void {
    // 关卡切换
    if (this.levelId > 1) {
      this.arrows.push(
        createButton(this, width / 2 - 190, 60, '←', () => {
          this.levelId -= 1;
          this.render();
        }, { width: 52, height: 40, fontSize: 18 }).setDepth(11),
      );
    }
    if (!isLastLevel(this.levelId)) {
      this.arrows.push(
        createButton(this, width / 2 + 190, 60, '→', () => {
          this.levelId += 1;
          this.render();
        }, { width: 52, height: 40, fontSize: 18 }).setDepth(11),
      );
    }

    const runs = getLevelRuns(this.levelId);
    const top = 168;
    const rowH = Math.min(38, (height - top - 96) / 10);

    if (!runs.length) {
      container.add(
        this.add
          .text(width / 2, top + 60, '这一关还没有成绩，去钓一竿吧！', {
            fontFamily: FONT_FAMILY,
            fontSize: '15px',
            color: '#9fc2d8',
          })
          .setOrigin(0.5),
      );
      return;
    }

    runs.forEach((run, index) => {
      const y = top + index * rowH;
      const isBest = index === 0;
      container.add(
        this.add
          .text(width / 2 - 170, y, `${index + 1}`, {
            fontFamily: FONT_FAMILY,
            fontSize: `${isBest ? 20 : 16}px`,
            color: isBest ? '#ffd166' : '#bfe9ff',
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      );
      container.add(
        this.add
          .text(width / 2 - 90, y, `${run.score}`, {
            fontFamily: FONT_FAMILY,
            fontSize: '17px',
            color: isBest ? '#ffe9a8' : '#eaf7ff',
          })
          .setOrigin(0, 0.5),
      );
      for (let star = 0; star < 3; star += 1) {
        container.add(
          this.add
            .image(width / 2 + 60 + star * 20, y, star < run.stars ? 'ui-star' : 'ui-star-empty')
            .setDisplaySize(16, 16),
        );
      }
      const date = new Date(run.at);
      const stamp = `${date.getMonth() + 1}/${date.getDate()}`;
      container.add(
        this.add
          .text(width / 2 + 170, y, stamp, {
            fontFamily: FONT_FAMILY,
            fontSize: '12px',
            color: '#7c9db5',
          })
          .setOrigin(1, 0.5),
      );
    });
  }

  private renderTotalTab(
    container: Phaser.GameObjects.Container,
    width: number,
    height: number,
  ): void {
    const rows = getTotalRanking();
    const top = 168;
    const rowH = Math.min(36, (height - top - 96) / Math.max(1, rows.length));

    if (!rows.length) {
      container.add(
        this.add
          .text(width / 2, top + 60, '还没有任何成绩', {
            fontFamily: FONT_FAMILY,
            fontSize: '15px',
            color: '#9fc2d8',
          })
          .setOrigin(0.5),
      );
      return;
    }

    rows.forEach((row, index) => {
      const y = top + index * rowH;
      container.add(
        this.add
          .text(width / 2 - 190, y, `${index + 1}`, {
            fontFamily: FONT_FAMILY,
            fontSize: '16px',
            color: index === 0 ? '#ffd166' : '#bfe9ff',
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      );
      container.add(
        this.add
          .text(width / 2 - 130, y, row.levelName, {
            fontFamily: FONT_FAMILY,
            fontSize: '14px',
            color: '#eaf7ff',
          })
          .setOrigin(0, 0.5),
      );
      container.add(
        this.add
          .text(width / 2 + 120, y, `${row.best}`, {
            fontFamily: FONT_FAMILY,
            fontSize: '16px',
            color: '#ffe9a8',
          })
          .setOrigin(1, 0.5),
      );
      for (let star = 0; star < 3; star += 1) {
        container.add(
          this.add
            .image(width / 2 + 150 + star * 18, y, star < row.stars ? 'ui-star' : 'ui-star-empty')
            .setDisplaySize(14, 14),
        );
      }
    });
  }
}
