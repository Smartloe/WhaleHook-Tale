import Phaser from 'phaser';
import { Hook } from '../objects/Hook';
import { Catchable } from '../objects/Catchable';
import { WhaleGirl } from '../objects/WhaleGirl';
import { Spawner } from '../systems/Spawner';
import { Hud } from '../ui/Hud';
import { FONT_FAMILY, HOOK_MOTION, LEVELS, getLevel, isLastLevel } from '../systems/LevelConfig';
import { createHookTuning, resolveStage, type StageLayout } from '../systems/StageLayout';
import { loadSaveWithTimeout, updateSave } from '../platform/save';
import { playSfx, unlockAudio } from '../platform/sfx';
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

/** 主玩法场景：摆钩、发射、吸附、回收、连击、计分与倒计时 */
export class GameScene extends Phaser.Scene {
  private config!: LevelConfigData;
  private stage!: StageLayout;
  private tuning!: HookTuning;
  private whale!: WhaleGirl;
  private hook!: Hook<Catchable>;
  private hud!: Hud;
  private catches: Catchable[] = [];

  private score = 0;
  private combo = 0;
  private timeLeftMs = 0;
  private finished = false;
  private targetReached = false;
  private firstShot = false;
  private lastTickSecond = -1;

  constructor() {
    super('Game');
  }

  create(data: GameSceneData): void {
    this.config = getLevel(data.levelId ?? 1);
    this.stage = resolveStage(this.scale.width, this.scale.height);
    this.tuning = createHookTuning(this.stage, HOOK_MOTION);

    this.score = 0;
    this.combo = 0;
    this.timeLeftMs = this.config.timeLimitMs;
    this.finished = false;
    this.targetReached = false;
    this.firstShot = false;
    this.lastTickSecond = -1;
    this.catches = [];

    this.cameras.main.setBackgroundColor('#08121d');
    this.drawBackground();

    this.whale = new WhaleGirl(
      this,
      this.stage.whale.x,
      this.stage.whale.y,
      this.stage.rodTip,
      // 竖屏时角色离顶部 HUD 很近，隐藏名牌避免被面板压住
      { showTag: this.stage.kind === 'landscape' },
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
    this.input.on(
      'pointerdown',
      (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
        // 点在 HUD 静音按钮等交互元素上时不要同时发射鱼钩
        if (currentlyOver.length > 0) return;
        this.tryShoot();
      },
    );

    this.showLevelIntro();
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

    const seconds = Math.ceil(this.timeLeftMs / 1000);
    if (seconds > 0 && seconds <= 5 && seconds !== this.lastTickSecond) {
      this.lastTickSecond = seconds;
      playSfx('tick');
    }

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
    unlockAudio();
    if (!this.hook.shoot()) return;
    playSfx('cast');
    this.whale.playCast();
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
    const info = target.info;
    let gained = info.value;
    let suffix = '';

    if (info.value > 0) {
      this.combo += 1;
      const multiplier = Math.min(2, 1 + (this.combo - 1) * 0.1);
      gained = Math.round(info.value * multiplier);
      if (multiplier > 1.01) {
        suffix = ` ×${multiplier.toFixed(1)}`;
      }
      playSfx(info.value >= 150 ? 'treasure' : 'coin');
    } else {
      this.combo = 0;
      playSfx('junk');
      this.cameras.main.shake(120, 0.004);
    }

    this.score += gained;
    this.hud.setScore(this.score);
    this.hud.setCombo(this.combo);
    this.showFloatingValue(target.x, target.y, gained, `${info.name}${suffix}`);

    if (info.timeBonus && info.timeBonus > 0) {
      this.timeLeftMs += info.timeBonus * 1000;
      // 时间变长后允许最后 5 秒的滴答重新触发
      this.lastTickSecond = -1;
      this.hud.setTime(this.timeLeftMs);
      this.showFloatingText(target.x, target.y - 42, `+${info.timeBonus} 秒`, '#aef0ff');
    }

    this.whale.playPull();
    target.playCollected(this);
  }

  private showFloatingValue(x: number, y: number, value: number, name: string): void {
    const color = value > 0 ? '#ffe9a8' : value < 0 ? '#ff8a8a' : '#cfeaff';
    const label = `${value > 0 ? '+' : ''}${value}  ${name}`;
    this.showFloatingText(x, y - 12, label, color);
  }

  private showFloatingText(x: number, y: number, label: string, color: string): void {
    const text = this.add
      .text(x, y, label, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(15);

    this.tweens.add({
      targets: text,
      y: y - 52,
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

  private showLevelIntro(): void {
    const title = this.add
      .text(
        this.scale.width / 2,
        this.stage.waterTop + 46,
        `第 ${this.config.id} 关 · ${this.config.name}`,
        {
          fontFamily: FONT_FAMILY,
          fontSize: '28px',
          color: '#eaf7ff',
          fontStyle: 'bold',
        },
      )
      .setOrigin(0.5)
      .setDepth(22)
      .setAlpha(0);

    const subtitle = this.add
      .text(this.scale.width / 2, this.stage.waterTop + 80, this.config.tagline, {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#9ad8f5',
      })
      .setOrigin(0.5)
      .setDepth(22)
      .setAlpha(0);

    this.tweens.add({
      targets: [title, subtitle],
      alpha: 1,
      duration: 260,
      hold: 1100,
      yoyo: true,
      onComplete: () => {
        title.destroy();
        subtitle.destroy();
      },
    });
  }

  private finish(success: boolean): void {
    if (this.finished) return;
    this.finished = true;
    playSfx(success ? 'win' : 'lose');
    void this.completeLevel(success);
  }

  /** 先等一次存档读取（最多 600ms），避免用默认值覆盖真实最高分/解锁进度 */
  private async completeLevel(success: boolean): Promise<void> {
    const save = await loadSaveWithTimeout(600);
    const isNewBest = this.score > save.best && this.score > 0;
    const best = Math.max(save.best, this.score);
    const maxLevel = success
      ? Math.max(save.maxLevel, Math.min(LEVELS.length, this.config.id + 1))
      : save.maxLevel;
    void updateSave({ best, maxLevel });

    const result: GameResultData = {
      levelId: this.config.id,
      levelName: this.config.name,
      success,
      score: this.score,
      targetScore: this.config.targetScore,
      timeLeftMs: this.timeLeftMs,
      best,
      isNewBest,
      nextLevelId: success && !isLastLevel(this.config.id) ? this.config.id + 1 : null,
      levelCount: LEVELS.length,
    };

    this.cameras.main.fadeOut(260, 8, 18, 29);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Result', result);
    });
  }

  /** 背景：夜空、海面、海底、小船、水草与漂浮气泡（坐标随舞台自适应，配色随关卡变化） */
  private drawBackground(): void {
    const { width, height, waterTop, boat, seabedHeight, moon } = this.stage;
    const { palette } = this.config;
    const g = this.add.graphics().setDepth(0);

    // 夜空
    g.fillStyle(0x0a1826, 1);
    g.fillRect(0, 0, width, waterTop);
    g.fillStyle(0x122c44, 1);
    g.fillRect(0, waterTop * 0.52, width, waterTop * 0.48);

    // 月亮
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

    // 海水（按关卡配色）
    g.fillStyle(palette.water, 1);
    g.fillRect(0, waterTop, width, height - waterTop);
    g.fillStyle(palette.surface, 1);
    g.fillRect(0, waterTop, width, 52);
    g.lineStyle(3, 0x9fe3ff, 0.45);
    g.lineBetween(0, waterTop, width, waterTop);
    g.lineStyle(1, 0x9fe3ff, 0.1);
    for (let y = waterTop + 84; y < height; y += 92) {
      g.lineBetween(0, y, width, y);
    }

    // 水下光斑
    g.fillStyle(0x9fe3ff, 0.05);
    for (let index = 0; index < 5; index += 1) {
      g.fillEllipse(width * (0.16 + index * 0.18), waterTop + 120 + index * 40, 90, 26);
    }

    // 海底与水草
    g.fillStyle(palette.seabed, 1);
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

    // 漂浮气泡
    const bubbleColumns = [0.12, 0.28, 0.45, 0.66, 0.8, 0.92];
    bubbleColumns.forEach((column, index) => {
      const bubble = this.add
        .circle(width * column, height - 80 - index * 46, 3 + (index % 3), 0x9fe3ff, 0.22)
        .setDepth(1);
      this.tweens.add({
        targets: bubble,
        y: bubble.y - 90,
        alpha: { from: 0.22, to: 0 },
        duration: 4200 + index * 700,
        repeat: -1,
        delay: index * 600,
        ease: 'Sine.easeInOut',
      });
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
