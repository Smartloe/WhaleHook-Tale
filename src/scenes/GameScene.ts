import Phaser from 'phaser';
import { Hook } from '../objects/Hook';
import { Catchable } from '../objects/Catchable';
import { WhaleGirl } from '../objects/WhaleGirl';
import { Spawner } from '../systems/Spawner';
import { Hud } from '../ui/Hud';
import { FONT_FAMILY, HOOK_MOTION, getLevel } from '../systems/LevelConfig';
import { createHookTuning, resolveStage, type StageLayout } from '../systems/StageLayout';
import type {
  CatchableSpec,
  CatchableType,
  GameResultData,
  HookTuning,
  LevelConfigData,
} from '../types/game';

interface GameSceneData {
  levelId?: number;
}

/** 主玩法场景：摆钩、发射、吸附、回收、计分与倒计时 */
export class GameScene extends Phaser.Scene {
  private config!: LevelConfigData;
  private stage!: StageLayout;
  private tuning!: HookTuning;
  private whale!: WhaleGirl;
  private hook!: Hook<Catchable>;
  private hud!: Hud;
  private catches: Catchable[] = [];

  private score = 0;
  private timeLeftMs = 0;
  private finished = false;
  private targetReached = false;
  private firstShot = false;

  constructor() {
    super('Game');
  }

  create(data: GameSceneData): void {
    this.config = getLevel(data.levelId ?? 1);
    this.stage = resolveStage(this.scale.width, this.scale.height);
    this.tuning = createHookTuning(this.stage, HOOK_MOTION);

    this.score = 0;
    this.timeLeftMs = this.config.timeLimitMs;
    this.finished = false;
    this.targetReached = false;
    this.firstShot = false;
    this.catches = [];

    this.cameras.main.setBackgroundColor('#08121d');
    this.drawBackground();

    this.whale = new WhaleGirl(
      this,
      this.stage.whale.x,
      this.stage.whale.y,
      this.stage.rodTip,
    );

    const specByType = new Map<CatchableType, CatchableSpec>();
    for (const spec of this.config.catches) {
      specByType.set(spec.type, spec);
    }
    const spawner = new Spawner();
    for (const info of spawner.spawn(this.config, this.stage.spawnArea, this.tuning)) {
      const spec = specByType.get(info.type);
      if (!spec) continue;
      this.catches.push(new Catchable(this, info, spec));
    }

    this.hook = new Hook<Catchable>(this, this.tuning);
    this.hook.onSettle = (target) => this.onCaught(target);

    this.hud = new Hud(this, this.config, this.timeLeftMs);

    this.input.keyboard?.addCapture('SPACE');
    // 忽略长按产生的重复 keydown：一次按键只发射一次
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
      if (event.repeat) return;
      this.tryShoot();
    });
    this.input.on('pointerdown', () => this.tryShoot());

    this.cameras.main.fadeIn(220, 8, 18, 29);
  }

  override update(_time: number, delta: number): void {
    // 结算后冻结玩法：避免淡出期间再钓到东西，导致 HUD 分数与结算数据不一致
    if (this.finished) return;

    this.whale.update(delta);
    this.hook.update(delta);

    if (this.hook.state === 'SHOOTING') {
      this.checkCollision();
    }

    this.timeLeftMs = Math.max(0, this.timeLeftMs - delta);
    this.hud.setTime(this.timeLeftMs);

    if (this.timeLeftMs <= 0) {
      this.finish(this.score >= this.config.targetScore);
      return;
    }

    if (!this.targetReached && this.score >= this.config.targetScore) {
      this.targetReached = true;
      this.showToast('目标达成！');
      // 延迟期间仍可能钓到旧靴子扣分，结算时重新判定
      this.time.delayedCall(900, () => this.finish(this.score >= this.config.targetScore));
    }
  }

  private tryShoot(): void {
    if (this.finished) return;
    if (!this.hook.shoot()) return;
    if (!this.firstShot) {
      this.firstShot = true;
      this.hud.hideHint();
    }
  }

  /** 圆形碰撞：钩头与可钩取物中心距离小于两者半径之和即视为钩中 */
  private checkCollision(): void {
    for (const target of this.catches) {
      if (target.info.collected) continue;
      const distance = Phaser.Math.Distance.Between(
        this.hook.headX,
        this.hook.headY,
        target.x,
        target.y,
      );
      if (distance <= target.radius + this.tuning.hookRadius) {
        target.markCollected();
        target.setDepth(6);
        this.hook.attach(target);
        return;
      }
    }
  }

  private onCaught(target: Catchable): void {
    this.score += target.info.value;
    this.hud.setScore(this.score);
    this.showFloatingValue(target.x, target.y, target.info.value, target.info.name);

    if (target.info.rarity === 'junk') {
      this.cameras.main.shake(120, 0.004);
    }

    target.playCollected(this);
  }

  private showFloatingValue(x: number, y: number, value: number, name: string): void {
    const color = value > 0 ? '#ffe9a8' : value < 0 ? '#ff8a8a' : '#cfeaff';
    const label = `${value > 0 ? '+' : ''}${value}  ${name}`;
    const text = this.add
      .text(x, y - 12, label, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(15);

    this.tweens.add({
      targets: text,
      y: y - 64,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private showToast(message: string): void {
    const text = this.add
      .text(this.scale.width / 2, this.stage.waterTop + 90, message, {
        fontFamily: FONT_FAMILY,
        fontSize: '32px',
        color: '#aef0ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(21)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: this.stage.waterTop + 68,
      duration: 240,
      hold: 520,
      yoyo: true,
    });
  }

  private finish(success: boolean): void {
    if (this.finished) return;
    this.finished = true;

    const result: GameResultData = {
      levelId: this.config.id,
      levelName: this.config.name,
      success,
      score: this.score,
      targetScore: this.config.targetScore,
      timeLeftMs: this.timeLeftMs,
    };

    this.cameras.main.fadeOut(260, 8, 18, 29);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Result', result);
    });
  }

  /** 全部占位背景：夜空、海面、海底、小船与水草（不依赖任何图片，坐标随舞台自适应） */
  private drawBackground(): void {
    const { width, height, waterTop, boat, seabedHeight, moon } = this.stage;
    const g = this.add.graphics().setDepth(0);

    // 夜空
    g.fillStyle(0x0a1826, 1);
    g.fillRect(0, 0, width, waterTop);
    g.fillStyle(0x122c44, 1);
    g.fillRect(0, waterTop * 0.52, width, waterTop * 0.48);

    // 月亮（避开顶部 HUD）
    g.fillStyle(0xf2f6d9, 0.9);
    g.fillCircle(moon.x, moon.y, moon.radius);
    g.fillStyle(0x0a1826, 1);
    g.fillCircle(moon.x + moon.radius * 0.46, moon.y - moon.radius * 0.3, moon.radius * 0.85);

    // 星星
    const starColumns = [0.12, 0.23, 0.34, 0.44, 0.62, 0.73, 0.94];
    const starRows = [0.22, 0.39, 0.19, 0.35, 0.28, 0.47, 0.58];
    g.fillStyle(0xffffff, 0.7);
    starColumns.forEach((column, index) => {
      g.fillCircle(width * column, waterTop * starRows[index], 2);
    });

    // 海水
    g.fillStyle(0x0a3550, 1);
    g.fillRect(0, waterTop, width, height - waterTop);
    g.fillStyle(0x0f4462, 1);
    g.fillRect(0, waterTop, width, 48);
    g.lineStyle(3, 0x9fe3ff, 0.45);
    g.lineBetween(0, waterTop, width, waterTop);
    g.lineStyle(1, 0x9fe3ff, 0.12);
    for (let y = waterTop + 80; y < height; y += 90) {
      g.lineBetween(0, y, width, y);
    }

    // 海底与水草
    g.fillStyle(0x06202f, 1);
    g.fillRect(0, height - seabedHeight, width, seabedHeight);
    g.lineStyle(6, 0x1c6b58, 0.85);
    const weedColumns = [0.09, 0.16, 0.82, 0.91];
    const weedHeights = [70, 42, 58, 92];
    weedColumns.forEach((column, index) => {
      const weedX = width * column;
      const floor = height - seabedHeight + 2;
      g.beginPath();
      g.moveTo(weedX, floor);
      g.lineTo(weedX - 6, floor - weedHeights[index]);
      g.strokePath();
    });

    // 小船（鲸鱼娘站立处）
    const cx = boat.centerX;
    const deck = boat.deckY;
    const half = boat.width / 2;
    g.fillStyle(0x6b4226, 1);
    g.beginPath();
    g.moveTo(cx - half, deck + 8);
    g.lineTo(cx + half, deck + 8);
    g.lineTo(cx + half - 22, deck + boat.height);
    g.lineTo(cx - half + 22, deck + boat.height);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x8a5a36, 1);
    g.fillRect(cx - half, deck, boat.width, 10);
    g.lineStyle(3, 0x3f2a1c, 0.8);
    g.lineBetween(cx - half, deck, cx - half, deck + 8);
    g.lineBetween(cx + half, deck, cx + half, deck + 8);

    // 甲板上的小桶
    const barrelX = cx + boat.width * 0.33;
    g.fillStyle(0x9c6b3f, 1);
    g.fillRect(barrelX, deck - 26, 22, 26);
    g.fillStyle(0xc98c55, 1);
    g.fillRect(barrelX - 3, deck - 31, 28, 7);
  }
}
