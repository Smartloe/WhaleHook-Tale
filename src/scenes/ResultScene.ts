import Phaser from 'phaser';
import { createButton } from '../ui/Button';
import { FONT_FAMILY } from '../systems/LevelConfig';
import type { GameResultData } from '../types/game';

/** 结算界面：半身立绘 + 星级 + 得分 + 本机排名 + 三个按钮 */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(result: GameResultData): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.cameras.main.setBackgroundColor('#08121d');

    const key = width > height ? 'bg-zone1-landscape' : 'bg-zone1-portrait';
    if (this.textures.exists(key)) {
      this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(width, height).setDepth(0);
      this.add.rectangle(0, 0, width, height, 0x03101c, 0.58).setOrigin(0, 0).setDepth(1);
    }

    const panelWidth = Math.min(520, width - 40);
    const panelHeight = Math.min(480, height - 80);
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2 - 4;

    this.add
      .nineslice(panelX, panelY, 'ui-panel', undefined, panelWidth, panelHeight, 30, 30, 30, 30)
      .setOrigin(0, 0)
      .setDepth(2);

    const centerX = width / 2;
    const cleared = result.success && result.nextLevelId === null;
    const title = result.success ? (cleared ? '全部通关！' : '目标达成！') : '时间到啦…';
    const titleColor = result.success ? '#ffffff' : '#ffd5d5';

    this.add
      .text(centerX, panelY + 24, title, {
        fontFamily: FONT_FAMILY,
        fontSize: '34px',
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
        .image(panelX + 74, panelY + 140, 'whale-face')
        .setOrigin(0.5)
        .setDepth(3);
      face.setScale(Math.min(1, 108 / face.height));
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

    // 星级图标依次弹出
    for (let index = 0; index < 3; index += 1) {
      const star = this.add
        .image(infoX + (index - 1) * 40, panelY + 96, index < result.stars ? 'ui-star' : 'ui-star-empty')
        .setDisplaySize(34, 34)
        .setDepth(3)
        .setScale(0);
      this.tweens.add({
        targets: star,
        scale: 1,
        duration: 260,
        delay: 160 + index * 150,
        ease: 'Back.easeOut',
      });
    }

    this.add
      .text(infoX, panelY + 138, `${result.score}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '44px',
        color: '#ffe9a8',
        fontStyle: 'bold',
        stroke: '#0a2236',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(infoX, panelY + 176, `目标 ${result.targetScore}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#9fc2d8',
      })
      .setOrigin(0.5)
      .setDepth(3);

    const rankText = result.rank ? `本关第 ${result.rank} 名` : '未进前十';
    this.add
      .text(infoX, panelY + 200, rankText, {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: result.rank === 1 ? '#ffd166' : '#bfe9ff',
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(
        infoX,
        panelY + 222,
        result.isNewBest ? `新纪录！最高 ${result.best}` : `最高 ${result.best}`,
        {
          fontFamily: FONT_FAMILY,
          fontSize: '12px',
          color: result.isNewBest ? '#8ef1b0' : '#9fc2d8',
        },
      )
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
      .text(centerX, panelY + 262, comment, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#cfeaff',
        align: 'center',
        wordWrap: { width: panelWidth - 48 },
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    const buttonY = panelY + panelHeight - 96;
    const primaryLabel =
      result.success && result.nextLevelId !== null
        ? '下一关'
        : result.success
          ? '再玩一局'
          : '再来一次';
    const primaryTarget = result.success && result.nextLevelId !== null ? result.nextLevelId : result.levelId;

    createButton(
      this,
      centerX,
      buttonY,
      primaryLabel,
      () => this.scene.start('Game', { levelId: primaryTarget }),
      { width: 260, height: 54, fontSize: 20, primary: true },
    ).setDepth(4);

    createButton(
      this,
      centerX - 92,
      buttonY + 66,
      '选关',
      () => this.scene.start('LevelSelect'),
      { width: 168, height: 44, fontSize: 16 },
    ).setDepth(4);
    createButton(
      this,
      centerX + 92,
      buttonY + 66,
      '排行榜',
      () => this.scene.start('Leaderboard'),
      { width: 168, height: 44, fontSize: 16 },
    ).setDepth(4);

    this.add
      .text(centerX, height - 16, '非官方同人作品 · 免费非商业 · 禁止售卖或广告变现', {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: '#6f93ad',
      })
      .setOrigin(0.5, 1)
      .setDepth(3);

    this.cameras.main.fadeIn(200, 8, 18, 29);
  }
}
