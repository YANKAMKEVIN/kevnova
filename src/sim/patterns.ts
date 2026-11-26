import { TAU } from '../core/math';
import type { Rng } from '../core/rng';
import type { BulletField } from './bullets';
import type { Difficulty, FireSpec } from './types';

export interface DifficultyScale {
  speed: number;
  density: number;
  rate: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyScale> = {
  doux: { speed: 0.8, density: 0.8, rate: 0.85 },
  normal: { speed: 1, density: 1.3, rate: 1.3 },
  infernal: { speed: 1.15, density: 1.75, rate: 1.75 },
};

export interface PatternContext {
  bullets: BulletField;
  rng: Rng;
  scale: DifficultyScale;
  targetX: number;
  targetY: number;
}

const scaledCount = (n: number, density: number, min = 1): number => Math.max(min, Math.round(n * density));

/**
 * Tire une salve `spec` depuis (x, y) à l'image `t` (compteur propre au tireur, utilisé pour les spirales).
 * Renvoie le nombre de balles créées.
 */
export function firePattern(ctx: PatternContext, spec: FireSpec, x: number, y: number, t: number): number {
  const sx = x + (spec.offsetX ?? 0);
  const sy = y + (spec.offsetY ?? 0);
  const speed = spec.speed * ctx.scale.speed;
  const acc = (spec.accel ?? 0) * ctx.scale.speed;
  const maxSpd = (spec.maxSpeed ?? 8) * ctx.scale.speed;
  const angVel = spec.angVel ?? 0;
  const base = spec.angle ?? Math.PI / 2;
  const aim = Math.atan2(ctx.targetY - sy, ctx.targetX - sx);
  const spin = (spec.spin ?? 0) * t;
  let made = 0;
  const shoot = (a: number, s = speed, av = angVel): void => {
    if (ctx.bullets.spawn(sx, sy, a, s, spec.kind, spec.color, acc, av, maxSpd)) made++;
  };

  switch (spec.pattern) {
    case 'aimed':
    case 'fan': {
      const n = scaledCount(spec.n ?? 1, ctx.scale.density);
      const spread = spec.spread ?? 0;
      const center = spec.pattern === 'aimed' ? aim : base + spin;
      for (let i = 0; i < n; i++) {
        const k = n === 1 ? 0 : i / (n - 1) - 0.5;
        shoot(center + k * spread);
      }
      break;
    }
    case 'ring':
    case 'spiral': {
      const n = scaledCount(spec.n ?? 12, ctx.scale.density, 3);
      const off = base + spin + (spec.pattern === 'ring' && spec.spin === undefined ? aim : 0);
      for (let i = 0; i < n; i++) shoot(off + (i / n) * TAU);
      break;
    }
    case 'flower': {
      const n = scaledCount(spec.n ?? 10, ctx.scale.density, 3);
      const av = spec.angVel ?? 0.01;
      for (let i = 0; i < n; i++) {
        const a = base + spin + (i / n) * TAU;
        shoot(a, speed, av);
        shoot(a, speed, -av);
      }
      break;
    }
    case 'random': {
      const n = scaledCount(spec.n ?? 6, ctx.scale.density);
      const spread = spec.spread ?? Math.PI / 2;
      for (let i = 0; i < n; i++) {
        shoot(base + (ctx.rng.next() - 0.5) * spread, speed * ctx.rng.range(0.7, 1.3));
      }
      break;
    }
    case 'wall': {
      const n = scaledCount(spec.n ?? 8, ctx.scale.density, 2);
      const width = spec.spread ?? 200;
      const gapSlot = ctx.rng.int(1, n - 2);
      for (let i = 0; i < n; i++) {
        if (i === gapSlot) continue;
        const k = i / (n - 1) - 0.5;
        if (ctx.bullets.spawn(sx + k * width, sy, base, speed, spec.kind, spec.color, acc, angVel, maxSpd)) made++;
      }
      break;
    }
    case 'stack': {
      const n = scaledCount(spec.n ?? 4, ctx.scale.density);
      for (let i = 0; i < n; i++) shoot(aim, speed * (1 + i * 0.22));
      break;
    }
  }
  return made;
}

/** État d'une salve récurrente : décide quand elle tire. */
export function shouldFire(spec: FireSpec, age: number, rate: number): boolean {
  const delay = spec.delay ?? 0;
  if (age < delay) return false;
  const every = Math.max(2, Math.round(spec.every / rate));
  return (age - delay) % every === 0;
}
