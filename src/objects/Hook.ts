import Phaser from 'phaser';
import type { Hookable, HookState, HookTuning } from '../types/game';

/**
 * 鱼钩：负责摆动、发射、吸附、回收的状态机与鱼线绘制。
 *
 * 状态流转：
 *   IDLE_SWING --shoot()--> SHOOTING
 *   SHOOTING --attach(target)/越界/达到最大长度--> RETRACTING
 *   RETRACTING --回到竿尖--> SETTLE --停顿结束--> IDLE_SWING
 *
 * 表现层只有 Graphics + Container，替换正式美术时改构造函数里的钩子图形即可，
 * 状态机与数值完全不依赖图片。
 */
export class Hook<T extends Hookable> {
  private readonly tuning: HookTuning;
  private readonly rope: Phaser.GameObjects.Graphics;
  private readonly head: Phaser.GameObjects.Container;
  private hookArt!: Phaser.GameObjects.Image;

  private _state: HookState = 'IDLE_SWING';
  private phase = 0;
  private angleRad = 0;
  private length: number;
  private settleRemainingMs = 0;

  /** 吸附中的目标，回收到位后置空并回调 onSettle */
  attached: T | null = null;
  onSettle?: (target: T) => void;

  constructor(scene: Phaser.Scene, tuning: HookTuning) {
    this.tuning = tuning;
    this.length = tuning.idleLength;

    this.rope = scene.add.graphics().setDepth(5);
    this.head = scene.add.container(tuning.pivot.x, tuning.pivot.y).setDepth(6);

    // 钩头精灵：锚点在弯钩处，随摆角旋转，浮漂朝上
    const hookArt = scene.add.image(0, 0, 'hook').setOrigin(0.5, 0.86);
    this.head.add(hookArt);
    this.hookArt = hookArt;

    this.syncTransform();
    this.drawRope();
  }

  get state(): HookState {
    return this._state;
  }

  get headX(): number {
    return this.head.x;
  }

  get headY(): number {
    return this.head.y;
  }

  /** 是否允许发射（仅摆动待机时） */
  shoot(): boolean {
    if (this._state !== 'IDLE_SWING' || this.attached) return false;
    this._state = 'SHOOTING';
    return true;
  }

  /** 撞到礁石等障碍：立即转为回收（不吸附） */
  bounceBack(): void {
    if (this._state !== 'SHOOTING') return;
    this._state = 'RETRACTING';
  }

  /** 钩中目标：立即转为回收 */
  attach(target: T): void {
    if (this._state !== 'SHOOTING') return;
    this.attached = target;
    this._state = 'RETRACTING';
  }

  update(deltaMs: number): void {
    switch (this._state) {
      case 'IDLE_SWING': {
        this.phase += (Math.PI * 2 * deltaMs) / this.tuning.swingPeriodMs;
        const amplitude = Phaser.Math.DegToRad(this.tuning.swingAmplitudeDeg);
        this.angleRad = Math.sin(this.phase) * amplitude;
        this.length = this.tuning.idleLength;
        break;
      }

      case 'SHOOTING': {
        this.length += (this.tuning.shootSpeed * deltaMs) / 1000;
        const head = this.computeHead();
        if (this.length >= this.tuning.maxLength || this.isOutOfBounds(head)) {
          this._state = 'RETRACTING';
        }
        break;
      }

      case 'RETRACTING': {
        const speed = this.retractSpeed();
        this.length = Math.max(
          this.tuning.idleLength,
          this.length - (speed * deltaMs) / 1000,
        );
        if (this.length <= this.tuning.idleLength + 0.5) {
          this.finishRetract();
        }
        break;
      }

      case 'SETTLE': {
        this.settleRemainingMs -= deltaMs;
        // 摆角平滑回到正下方，避免下一轮摆动出现跳变
        this.angleRad = Phaser.Math.Linear(this.angleRad, 0, Math.min(1, deltaMs / 90));
        if (this.settleRemainingMs <= 0) {
          const amplitude = Phaser.Math.DegToRad(this.tuning.swingAmplitudeDeg);
          this.phase = Math.asin(Phaser.Math.Clamp(this.angleRad / amplitude, -1, 1));
          this._state = 'IDLE_SWING';
        }
        break;
      }
    }

    this.syncTransform();
    this.drawRope();
  }

  /** 当前回收速度（像素/秒）：越重越慢 */
  private retractSpeed(): number {
    const weight = this.attached?.weight ?? 0;
    const speed =
      this.tuning.baseRetractSpeed / (1 + weight * this.tuning.weightRetractFactor);
    return Math.max(this.tuning.minRetractSpeed, speed);
  }

  private finishRetract(): void {
    const target = this.attached;
    this.attached = null;
    this.length = this.tuning.idleLength;
    this._state = 'SETTLE';
    this.settleRemainingMs = this.tuning.settleMs;
    if (target) {
      this.onSettle?.(target);
    }
  }

  private computeHead(): { x: number; y: number } {
    const { pivot } = this.tuning;
    return {
      x: pivot.x + Math.sin(this.angleRad) * this.length,
      y: pivot.y + Math.cos(this.angleRad) * this.length,
    };
  }

  private isOutOfBounds(head: { x: number; y: number }): boolean {
    const { bounds } = this.tuning;
    return (
      head.x < bounds.minX ||
      head.x > bounds.maxX ||
      head.y < bounds.minY ||
      head.y > bounds.maxY
    );
  }

  /** 同步钩头与吸附物位置 */
  private syncTransform(): void {
    const head = this.computeHead();
    this.head.setPosition(head.x, head.y);
    // 钩头朝向与鱼线一致：角度为 0 时浮漂朝上
    if (this.hookArt) {
      this.hookArt.setRotation(-this.angleRad * 0.35);
    }
    if (this.attached) {
      this.attached.x = head.x;
      this.attached.y = head.y + this.attached.radius + 10;
    }
  }

  private drawRope(): void {
    const { pivot } = this.tuning;
    const head = { x: this.head.x, y: this.head.y };
    this.rope.clear();
    // 鱼线带一点点下垂，比直线更像真的
    const midX = (pivot.x + head.x) / 2;
    const midY = (pivot.y + head.y) / 2 + Math.min(28, Math.hypot(head.x - pivot.x, head.y - pivot.y) * 0.06);
    this.rope.lineStyle(4, 0x05121f, 0.25);
    this.rope.beginPath();
    this.rope.moveTo(pivot.x, pivot.y + 2);
    this.rope.lineTo(midX, midY + 2);
    this.rope.lineTo(head.x, head.y + 2);
    this.rope.strokePath();
    this.rope.lineStyle(2.5, 0xe8f5ff, 0.85);
    this.rope.beginPath();
    this.rope.moveTo(pivot.x, pivot.y);
    this.rope.lineTo(midX, midY);
    this.rope.lineTo(head.x, head.y);
    this.rope.strokePath();
  }
}
