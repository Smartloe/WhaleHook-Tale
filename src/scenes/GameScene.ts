import Phaser from 'phaser';
import { Hook } from '../objects/Hook';
import { Catchable } from '../objects/Catchable';
import { WhaleGirl } from '../objects/WhaleGirl';
import { Spawner } from '../systems/Spawner';
import { Hud } from '../ui/Hud';
import { FONT_FAMILY, HOOK_MOTION, LEVELS, getLevel, isLastLevel, starsForScore } from '../systems/LevelConfig';
import { createHookTuning, resolveStage, type StageLayout } from '../systems/StageLayout';
import { getSave, recordRun } from '../platform/save';
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
    this.drawBackdrop();

    this.whale = new WhaleGirl(
      this,
      this.stage.whale.x,
      this.stage.whale.y,
      this.stage.rodTip,
      {
        // 竖屏时角色离顶部 HUD 很近，隐藏名牌避免被面板压住
        showTag: false,
        height: this.stage.kind === 'landscape' ? 128 : 150,
      },
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
    this.hook.onMiss = () => this.breakCombo();

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
    for (const item of this.catches) {
      item.update(delta);
    }

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
        this.hook.tipX,
        this.hook.tipY,
        target.x,
        target.y,
      );
      if (distance > target.radius + this.tuning.hookRadius) continue;

      // 礁石：钩子被弹回，不吸附
      if (target.info.type === 'rock') {
        this.hook.bounceBack();
        playSfx('hit');
        this.showFloatingText(target.x, target.y - 20, '礁石！', '#9fc2d8');
        return;
      }
      // 闪现中的宝箱在暗下去时不可钩
      if (!target.isHookable()) continue;

      target.markCollected();
      target.setDepth(6);
      this.hook.attach(target);
      return;
    }
  }

  /** 空钩或钓到扣分物：立即中断连击 */
  private breakCombo(): void {
    if (this.combo === 0) return;
    this.combo = 0;
    this.hud.setCombo(0);
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
      this.breakCombo();
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

    if (info.timePenalty && info.timePenalty > 0) {
      this.timeLeftMs = Math.max(0, this.timeLeftMs - info.timePenalty * 1000);
      this.lastTickSecond = -1;
      this.hud.setTime(this.timeLeftMs);
      this.showFloatingText(target.x, target.y - 42, `−${info.timePenalty} 秒`, '#c9a7ff');
    }

    if (this.combo >= 3) {
      this.flashComboGlow();
    }

    this.whale.playPull();
    if (gained > 0) {
      this.flyCoins(target.x, target.y, Math.min(6, 2 + Math.round(gained / 40)));
    }
    target.playCollected(this);
  }

  /** 连击 3 次以上：屏幕边缘泛起的柔和金光 */
  private flashComboGlow(): void {
    const glow = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0xffd166, 0.1)
      .setOrigin(0, 0)
      .setDepth(18)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: glow,
      alpha: 0,
      duration: 380,
      ease: 'Quad.easeOut',
      onComplete: () => glow.destroy(),
    });
  }

  /** 金币飞向 HUD 的反馈 */
  private flyCoins(x: number, y: number, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const coin = this.add.circle(x, y, 4, 0xffd166, 1).setDepth(16);
      const targetX = 60 + Math.random() * 40;
      const targetY = 56;
      this.tweens.add({
        targets: coin,
        x: targetX,
        y: targetY,
        scale: { from: 1.2, to: 0.4 },
        alpha: { from: 1, to: 0.2 },
        duration: 520 + index * 60,
        delay: index * 40,
        ease: 'Cubic.easeIn',
        onComplete: () => coin.destroy(),
      });
    }
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
    const introY = this.stage.waterTop + (this.stage.kind === 'portrait' ? 132 : 46);
    const title = this.add
      .text(
        this.scale.width / 2,
        introY,
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
      .text(this.scale.width / 2, introY + 34, this.config.tagline, {
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
    const stars = success ? starsForScore(this.config, this.score) : 0;
    let best: number;
    let bestStars: number;
    let rank: number | null = null;
    if (this.score > 0) {
      const record = await recordRun(this.config.id, this.score, stars, success);
      best = record.best;
      bestStars = record.stars;
      rank = record.rank;
    } else {
      const progress = getSave().levels[String(this.config.id)] ?? { best: 0, stars: 0 };
      best = progress.best;
      bestStars = progress.stars;
    }
    const isNewBest = this.score > 0 && rank === 1;

    const result: GameResultData = {
      levelId: this.config.id,
      levelName: this.config.name,
      success,
      score: this.score,
      targetScore: this.config.targetScore,
      timeLeftMs: this.timeLeftMs,
      best,
      isNewBest,
      stars,
      rank,
      bestStars,
      nextLevelId: success && !isLastLevel(this.config.id) ? this.config.id + 1 : null,
      levelCount: LEVELS.length,
    };

    this.cameras.main.fadeOut(260, 8, 18, 29);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Result', result);
    });
  }

  /** 背景：预生成的关卡背景图 + 小船精灵 + 漂浮气泡 */
  private drawBackdrop(): void {
    const { width, height, boat, waterTop } = this.stage;
    const kind = this.stage.kind === 'portrait' ? 'portrait' : 'landscape';
    const key = `bg-zone${this.config.zone}-${kind}`;

    if (this.textures.exists(key)) {
      this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(width, height).setDepth(0);
    } else {
      // 素材缺失时的兜底底色
      this.add.rectangle(0, 0, width, height, this.config.palette.water).setOrigin(0, 0).setDepth(0);
    }

    // 小船：顶边对齐甲板高度
    if (this.textures.exists('boat')) {
      const boatImage = this.add.image(boat.centerX, boat.deckY, 'boat').setOrigin(0.5, 0).setDepth(3);
      boatImage.setScale(boat.width / boatImage.width);
    }

    // 前景海草：固定几丛，轻微摇摆
    const kelpKeys = ['kelp-1', 'kelp-2', 'kelp-3'];
    const kelpSpots: Array<[number, number]> = [
      [0.05, 1],
      [0.12, 0.78],
      [0.87, 0.95],
      [0.94, 0.8],
      [0.2, 0.6],
      [0.79, 0.55],
    ];
    kelpSpots.forEach(([fx, factor], index) => {
      const key = kelpKeys[index % kelpKeys.length];
      if (!this.textures.exists(key)) return;
      const kelp = this.add
        .image(width * fx, height - this.stage.seabedHeight + 8, key)
        .setOrigin(0.5, 1)
        .setDepth(8)
        .setAlpha(0.9);
      kelp.setScale(0.95 * factor);
      this.tweens.add({
        targets: kelp,
        angle: { from: -3.2, to: 3.2 },
        duration: 2400 + index * 260,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // 暗角，让画面更聚焦
    const vignetteKey = this.stage.kind === 'portrait' ? 'ui-vignette-portrait' : 'ui-vignette-landscape';
    if (this.textures.exists(vignetteKey)) {
      this.add
        .image(0, 0, vignetteKey)
        .setOrigin(0, 0)
        .setDisplaySize(width, height)
        .setDepth(17)
        .setAlpha(0.85);
    }

    // 水面波纹
    const wave = this.add.graphics().setDepth(1);
    wave.lineStyle(2, 0xd6f4ff, 0.35);
    for (let x = 0; x < width; x += 64) {
      wave.beginPath();
      wave.arc(x, waterTop, 32, Math.PI, Math.PI * 2, true);
      wave.strokePath();
    }
    this.tweens.add({
      targets: wave,
      x: { from: 0, to: 16 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 漂浮气泡
    const bubbleColumns = [0.12, 0.28, 0.45, 0.66, 0.8, 0.92];
    bubbleColumns.forEach((column, index) => {
      const bubble = this.add
        .circle(width * column, height - 80 - index * 46, 3 + (index % 3), 0xd6f4ff, 0.28)
        .setDepth(2);
      this.tweens.add({
        targets: bubble,
        y: bubble.y - 90,
        alpha: { from: 0.28, to: 0 },
        duration: 4200 + index * 700,
        repeat: -1,
        delay: index * 600,
        ease: 'Sine.easeInOut',
      });
    });
  }
}
