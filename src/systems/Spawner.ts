import Phaser from 'phaser';
import type { CatchableData, HookTuning, LevelConfigData } from '../types/game';

interface SpawnArea {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * 按关卡配置在水域内随机布点。
 * - 拒绝采样：避免彼此重叠、避免离鱼竿太近。
 * - 只接受在鱼钩摆动扇区内的点，否则物件永远钓不到。
 * - 失败 160 次后接受最后一次坐标，保证一定生成成功。
 */
export class Spawner {
  spawn(level: LevelConfigData, area: SpawnArea, tuning: HookTuning): CatchableData[] {
    const placed: CatchableData[] = [];

    level.catches.forEach((spec, specIndex) => {
      for (let i = 0; i < spec.count; i += 1) {
        const spot = this.pickSpot(area, placed, spec.radius, tuning);
        placed.push({
          id: `${level.id}-${spec.type}-${specIndex}-${i}`,
          type: spec.type,
          name: spec.name,
          value: spec.value,
          weight: spec.weight,
          rarity: spec.rarity,
          radius: spec.radius,
          x: Phaser.Math.Clamp(spot.x, area.minX + spec.radius, area.maxX - spec.radius),
          y: Phaser.Math.Clamp(spot.y, area.minY + spec.radius, area.maxY - spec.radius),
          collected: false,
        });
      }
    });

    return placed;
  }

  private pickSpot(
    area: SpawnArea,
    placed: CatchableData[],
    radius: number,
    tuning: HookTuning,
  ): { x: number; y: number } {
    const minX = area.minX + radius;
    const maxX = area.maxX - radius;
    const minY = area.minY + radius;
    const maxY = area.maxY - radius;
    const maxReach = tuning.maxLength * 0.85;
    // 鱼钩只能沿 ±swingAmplitudeDeg 的摆角射出：超出摆角扇区的点永远钓不到
    const maxAngle = Phaser.Math.DegToRad(tuning.swingAmplitudeDeg - 3);

    let fallback = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

    for (let attempt = 0; attempt < 160; attempt += 1) {
      const x = Phaser.Math.Between(minX, maxX);
      const y = Phaser.Math.Between(minY, maxY);
      fallback = { x, y };

      const dx = x - tuning.pivot.x;
      const dy = y - tuning.pivot.y;
      if (dy <= 0) continue;

      const angle = Math.atan2(Math.abs(dx), dy);
      if (angle > maxAngle) continue;

      const reach = Math.hypot(dx, dy);
      if (reach > maxReach || reach < 110) continue;

      const overlapped = placed.some(
        (other) => Phaser.Math.Distance.Between(other.x, other.y, x, y) < other.radius + radius + 14,
      );
      if (!overlapped) return { x, y };
    }

    return fallback;
  }
}
