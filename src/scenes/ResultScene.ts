import Phaser from 'phaser';
import { createButton } from '../ui/Button';
import { FONT_FAMILY } from '../systems/LevelConfig';
import type { GameResultData } from '../types/game';

/** 结算界面：成功/失败、星级、得分与纪录、下一关/重开 */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(result: GameResultData): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.cameras.main.setBackgroundColor('#08121d');

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x07121f, 1);
    backdrop.fillRect(0, 0, width, height);
    backdrop.fillStyle(0x0b2237, 1);
    backdrop.fillRect(0, height * 0.55, width, height * 0.45);

    const panelWidth = Math.min(500, width - 48);
    const panelHeight = Math.min(460, height - 80);
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2 - 6;

    const panel = this.add.graphics();
    panel.fillStyle(0x0d2a3f, 1);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 28);
    panel.lineStyle(3, 0x3f86b5, 0.8);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 28);

    const centerX = width / 2;
    const cleared = result.success && result.nextLevelId === null;
    const title = result.success ? (cleared ? '全部通关！' : '目标达成！') : '时间到啦…';
    const titleColor = result.success ? '#aef0ff' : '#ffd5d5';

    this.add
      .text(centerX, panelY + 52, title, {
        fontFamily: FONT_FAMILY,
        fontSize: '40px',
        color: titleColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 星级：按完成度给出 1-3 星
    if (result.success) {
      const ratio = result.score / Math.max(1, result.targetScore);
      const stars = ratio >= 1.5 ? 3 : ratio >= 1.15 ? 2 : 1;
      this.add
        .text(centerX, panelY + 98, '★'.repeat(stars) + '☆'.repeat(3 - stars), {
          fontFamily: FONT_FAMILY,
          fontSize: '28px',
          color: '#ffd166',
        })
        .setOrigin(0.5);
    }

    this.add
      .text(centerX, panelY + 130, `第 ${result.levelId} / ${result.levelCount} 关 · ${result.levelName}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#8fc7e8',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, panelY + 182, `${result.score}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '60px',
        color: '#ffe9a8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, panelY + 226, `金币 · 目标 ${result.targetScore}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#7fb3d1',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, panelY + 254, result.isNewBest ? `新纪录！历史最佳 ${result.best}` : `历史最佳 ${result.best}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: result.isNewBest ? '#8ef1b0' : '#7fb3d1',
      })
      .setOrigin(0.5);

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
      .text(centerX, panelY + 292, comment, {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#cfeaff',
      })
      .setOrigin(0.5);

    const buttonY = panelY + panelHeight - 88;
    if (result.success && result.nextLevelId !== null) {
      createButton(this, centerX - 110, buttonY, '下一关', () => {
        this.scene.start('Game', { levelId: result.nextLevelId });
      });
    } else {
      createButton(this, centerX - 110, buttonY, result.success ? '再玩一局' : '再来一次', () => {
        this.scene.start('Game', { levelId: result.levelId });
      });
    }
    createButton(this, centerX + 110, buttonY, '返回标题', () => {
      this.scene.start('Menu');
    });

    this.add
      .text(centerX, height - 70, '非官方同人作品 · 免费非商业 · 禁止售卖或广告变现', {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        color: '#6f93ad',
      })
      .setOrigin(0.5);

    this.cameras.main.fadeIn(200, 8, 18, 29);
  }
}
