import Phaser from 'phaser';
import { createButton } from '../ui/Button';
import { FONT_FAMILY, LEVELS, ZONES, getLevel, starsForScore } from '../systems/LevelConfig';
import { getSave } from '../platform/save';

interface LevelSelectData {
  highlight?: number;
}

/** 选关：4 个海域 × 3 关的卡片网格，显示星级与解锁状态 */
export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create(data: LevelSelectData): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const wide = width > height * 1.1;
    const save = getSave();

    this.cameras.main.setBackgroundColor('#08121d');
    if (this.textures.exists('bg-zone1-landscape')) {
      const key = wide ? 'bg-zone1-landscape' : 'bg-zone1-portrait';
      this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(width, height).setDepth(0);
      this.add.rectangle(0, 0, width, height, 0x03101c, 0.5).setOrigin(0, 0).setDepth(1);
    }

    this.add
      .text(width / 2, 18, '选择关卡', {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#0a2236',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    const cols = wide ? 4 : 3;
    const rows = wide ? 3 : 4;
    const gapX = wide ? 14 : 10;
    const gapY = wide ? 14 : 10;
    const cardW = Math.min(wide ? 158 : 132, (width - 60 - (cols - 1) * gapX) / cols);
    const cardH = wide ? 96 : 86;
    const gridW = cols * cardW + (cols - 1) * gapX;
    const gridH = rows * cardH + (rows - 1) * gapY;
    const originX = (width - gridW) / 2;
    const originY = (height - gridH) / 2 + 14;

    for (let index = 0; index < LEVELS.length; index += 1) {
      const level = LEVELS[index];
      const zoneIndex = level.zone - 1;
      // 横屏按列分组（每列一个海域），竖屏按行分组
      const slot = index % 3;
      const col = wide ? zoneIndex : slot;
      const row = wide ? slot : zoneIndex;
      const x = originX + col * (cardW + gapX) + cardW / 2;
      const y = originY + row * (cardH + gapY) + cardH / 2;
      this.drawCard(x, y, cardW, cardH, level.id, save);
      if (slot === 0) {
        this.add
          .text(wide ? x : originX - 6, wide ? originY - 20 : y - cardH / 2 - 6, ZONES[zoneIndex].name, {
            fontFamily: FONT_FAMILY,
            fontSize: '11px',
            color: '#8fd4ff',
          })
          .setOrigin(wide ? 0.5 : 1, wide ? 0.5 : 1)
          .setDepth(10);
      }
    }

    createButton(this, 84, height - 34, '返回', () => this.scene.start('Menu'), {
      width: 128,
      height: 38,
      fontSize: 14,
    }).setDepth(12);

    if (data.highlight) {
      const badge = this.add
        .text(width / 2, height - 34, `第 ${data.highlight} 关已解锁`, {
          fontFamily: FONT_FAMILY,
          fontSize: '13px',
          color: '#8ef1b0',
        })
        .setOrigin(0.5)
        .setDepth(12);
      this.tweens.add({ targets: badge, alpha: 0.4, duration: 700, yoyo: true, repeat: 2 });
    }

    this.cameras.main.fadeIn(200, 8, 18, 29);
  }

  private drawCard(
    x: number,
    y: number,
    w: number,
    h: number,
    levelId: number,
    save: ReturnType<typeof getSave>,
  ): void {
    const unlocked = levelId <= save.maxLevel;
    const progress = save.levels[String(levelId)] ?? { best: 0, stars: 0 };
    const card = this.add.container(x, y).setDepth(8);

    const bg = this.add.image(0, 0, 'ui-panel').setDisplaySize(w, h);
    if (!unlocked) {
      bg.setTint(0x6a7d8c);
    }
    card.add(bg);

    const level = getLevel(levelId);
    const stars = progress.best > 0 ? Math.max(progress.stars, starsForScore(level, progress.best)) : 0;

    card.add(
      this.add
        .text(0, -h * 0.22, `${levelId}`, {
          fontFamily: FONT_FAMILY,
          fontSize: `${Math.round(h * 0.3)}px`,
          color: unlocked ? '#ffe9a8' : '#c3d2dc',
          fontStyle: 'bold',
          stroke: '#0a2236',
          strokeThickness: 4,
        })
        .setOrigin(0.5),
    );

    if (unlocked) {
      for (let star = 0; star < 3; star += 1) {
        this.add
          .image(x + (star - 1) * 22, y + h * 0.26, star < stars ? 'ui-star' : 'ui-star-empty')
          .setDisplaySize(18, 18)
          .setDepth(9);
      }
      if (progress.best > 0) {
        card.add(
          this.add
            .text(0, h * 0.02, `${progress.best}`, {
              fontFamily: FONT_FAMILY,
              fontSize: '12px',
              color: '#bfe9ff',
            })
            .setOrigin(0.5),
        );
      }
      card.setSize(w, h);
      card.setInteractive(
        new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
        Phaser.Geom.Rectangle.Contains,
      );
      if (card.input) card.input.cursor = 'pointer';
      card.on('pointerdown', () => {
        this.scene.start('Game', { levelId });
      });
    } else {
      this.add.image(x, y + h * 0.2, 'ui-lock').setDisplaySize(22, 22).setDepth(9);
    }

  }
}
