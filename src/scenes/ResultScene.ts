import Phaser from 'phaser';
import { createButton } from '../ui/Button';
import { FONT_FAMILY } from '../systems/LevelConfig';
import type { GameResultData } from '../types/game';

/** 结算界面：半身立绘 + 星级 + 得分 + 下一关 */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(result: GameResultData): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.cameras.main.setBackgroundColor('#08121d');

    const key = width > height ? 'bg-1-landscape' : 'bg-1-portrait';
    if (this.textures.exists(key)) {
      this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(width, height).setDepth(0);
      this.add.rectangle(0, 0, width, height, 0x03101c, 0.55).setOrigin(0, 0).setDepth(1);
    }

    const panelWidth = Math.min(520, width - 40);
    const panelHeight = Math.min(470, height - 90);
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2 - 6;

    this.add
      .nineslice(panelX, panelY, 'ui-panel', undefined, panelWidth, panelHeight, 30, 30, 30, 30)
      .setOrigin(0, 0)
      .setDepth(2);

    const centerX = width / 2;
    const cleared = result.success && result.nextLevelId === null;
    const title = result.success ? (cleared ? '全部通关！' : '目标达成！') : '时间到啦…';
    const titleColor = result.success ? '#ffffff' : '#ffd5d5';

    this.add
      .text(centerX, panelY + 26, title, {
        fontFamily: FONT_FAMILY,
        fontSize: '36px',
        color: titleColor,
        fontStyle: 'bold',
        stroke: '#0a2236',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    // 半身立绘
    if (this.textures.exists('whale-face')) {
      const face = this.add
        .image(panelX + 74, panelY + 128, 'whale-face')
        .setOrigin(0.5)
        .setDepth(3);
      face.setScale(Math.min(1, 110 / face.height));
      this.tweens.add({
        targets: face,
        y: face.y - 4,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const infoX = panelX + panelWidth * 0.62;

    if (result.success) {
      const ratio = result.score / Math.max(1, result.targetScore);
      const stars = ratio >= 1.5 ? 3 : ratio >= 1.15 ? 2 : 1;
      for (let index = 0; index < 3; index += 1) {
        const star = this.add
          .text(infoX + (index - 1) * 40, panelY + 86, '★', {
            fontFamily: FONT_FAMILY,
            fontSize: '34px',
            color: index < stars ? '#ffd166' : '#3d5a70',
          })
          .setOrigin(0.5)
          .setDepth(3)
          .setScale(0);
        this.tweens.add({
          targets: star,
          scale: index < stars ? 1 : 0.8,
          duration: 260,
          delay: 160 + index * 150,
          ease: 'Back.easeOut',
        });
      }
    }

    this.add
      .text(infoX, panelY + 132, `${result.score}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '46px',
        color: '#ffe9a8',
        fontStyle: 'bold',
        stroke: '#0a2236',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(infoX, panelY + 172, `目标 ${result.targetScore}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#9fc2d8',
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(
        infoX,
        panelY + 198,
        result.isNewBest ? `新纪录！最高 ${result.best}` : `最高 ${result.best}`,
        {
          fontFamily: FONT_FAMILY,
          fontSize: '13px',
          color: result.isNewBest ? '#8ef1b0' : '#9fc2d8',
        },
      )
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(centerX, panelY + 250, `第 ${result.levelId} / ${result.levelCount} 关 · ${result.levelName}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#bfe9ff',
      })
      .setOrigin(0.5)
      .setDepth(3);

    const secondsLeft = Math.max(0, Math.ceil(result.timeLeftMs / 1000));
    const missing = Math.max(0, result.targetScore - result.score);
    const comment = result.success
      ? cleared
        ? '鲸鱼娘把整片海都钓遍了，谢谢你陪她到这里'
        : secondsLeft > 0
          ? `鲸鱼娘满载而归，还剩 ${secondsLeft} 秒收工`
          : '最后一刻达标，好险！'
      : missing > 0
        ? `还差 ${missing} 金币，海底还有宝箱在等你`
        : '再试一次吧';

    this.add
      .text(centerX, panelY + 282, comment, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#cfeaff',
        align: 'center',
        wordWrap: { width: panelWidth - 48 },
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    const buttonY = panelY + panelHeight - 58;
    if (result.success && result.nextLevelId !== null) {
      createButton(
        this,
        centerX - 104,
        buttonY,
        '下一关',
        () => this.scene.start('Game', { levelId: result.nextLevelId }),
        { width: 176, height: 56, fontSize: 20, primary: true },
      ).setDepth(4);
    } else {
      createButton(
        this,
        centerX - 104,
        buttonY,
        result.success ? '再玩一局' : '再来一次',
        () => this.scene.start('Game', { levelId: result.levelId }),
        { width: 176, height: 56, fontSize: 20, primary: true },
      ).setDepth(4);
    }
    createButton(
      this,
      centerX + 104,
      buttonY,
      '返回标题',
      () => {
        this.scene.start('Menu');
      },
      { width: 176, height: 56, fontSize: 20 },
    ).setDepth(4);

    this.add
      .text(centerX, height - 20, '非官方同人作品 · 免费非商业 · 禁止售卖或广告变现', {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        color: '#6f93ad',
      })
      .setOrigin(0.5, 1)
      .setDepth(3);

    this.cameras.main.fadeIn(200, 8, 18, 29);
  }
}
