import Phaser from 'phaser';
import { createButton } from '../ui/Button';
import { FONT_FAMILY } from '../systems/LevelConfig';

/**
 * 制作与素材致谢。
 *
 * 角色立绘来自社区二创，使用时要满足：
 * - 可见署名（上善无形 / ZipZipPipe / QYQCAMIAO）；
 * - 非商业用途；
 * - 相同方式共享；
 * - 注明对原图做过裁切、缩放与调色。
 */
const CREDITS: ReadonlyArray<readonly [string, string]> = [
  ['角色形象', '上善无形（OC「溟月」）、ZipZipPipe、QYQCAMIAO'],
  ['形象许可', 'CC BY-NC-SA 4.0（署名 · 非商业 · 相同方式共享）'],
  ['立绘素材', 'phoiex/AAAAGENT（非商业署名许可 1.0）'],
  ['立绘修改', '已裁切、缩放、调色与重新排版'],
  ['其他美术', '本项目原创（鱼、宝箱、钩子、背景、UI 皮肤）'],
  ['代码许可', 'MIT（仅覆盖代码，不覆盖角色形象）'],
];

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.cameras.main.setBackgroundColor('#08121d');

    if (this.textures.exists('bg-1-landscape')) {
      const key = width > height ? 'bg-1-landscape' : 'bg-1-portrait';
      this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(width, height).setDepth(0);
      this.add.rectangle(0, 0, width, height, 0x03101c, 0.55).setOrigin(0, 0).setDepth(1);
    }

    const panelWidth = Math.min(560, width - 40);
    const panelHeight = Math.min(460, height - 120);
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2 - 10;

    this.add
      .nineslice(panelX, panelY, 'ui-panel', undefined, panelWidth, panelHeight, 30, 30, 30, 30)
      .setOrigin(0, 0)
      .setDepth(2);

    const left = panelX + 30;
    let cursorY = panelY + 28;

    this.add
      .text(panelX + panelWidth / 2, cursorY, '制作与素材致谢', {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(3);
    cursorY += 48;

    for (const [label, value] of CREDITS) {
      this.add
        .text(left, cursorY, label, {
          fontFamily: FONT_FAMILY,
          fontSize: '13px',
          color: '#8fd4ff',
        })
        .setDepth(3);
      this.add
        .text(left + 82, cursorY, value, {
          fontFamily: FONT_FAMILY,
          fontSize: '13px',
          color: '#eaf7ff',
          wordWrap: { width: panelWidth - 130 },
        })
        .setDepth(3);
      cursorY += 40;
    }

    this.add
      .text(
        panelX + panelWidth / 2,
        panelY + panelHeight - 124,
        '本项目为非官方同人作品，与 DeepSeek 官方无关；免费、非商业、无广告。\n完整许可说明见仓库 public/assets/LICENSE-ASSETS.md',
        {
          fontFamily: FONT_FAMILY,
          fontSize: '12px',
          color: '#9fc2d8',
          align: 'center',
          wordWrap: { width: panelWidth - 60 },
        },
      )
      .setOrigin(0.5, 0)
      .setDepth(3);

    createButton(
      this,
      panelX + panelWidth / 2,
      panelY + panelHeight - 42,
      '返回',
      () => this.scene.start('Menu'),
      { width: 160, height: 48, fontSize: 18 },
    ).setDepth(4);

    this.input.keyboard?.addCapture('SPACE');
    this.input.keyboard?.on('keydown-SPACE', () => this.scene.start('Menu'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'));

    this.cameras.main.fadeIn(180, 8, 18, 29);
  }
}
