import { ENEMIES, type EnemyDef } from '../data/enemies';
import { stepPath, spawnPoint, type Mover } from './paths';
import { firePattern, shouldFire, type PatternContext } from './patterns';
import { FIELD_H, FIELD_W, type EnemyId, type PathSpec } from './types';

export interface Enemy extends Mover {
  def: EnemyDef;
  path: PathSpec;
  hp: number;
  alive: boolean;
  /** Images restantes de clignotement blanc après un impact. */
  flash: number;
  /** Rotation visuelle (toupies). */
  rot: number;
}

export function createEnemy(id: EnemyId, xFrac: number, path: PathSpec, hpScale = 1): Enemy {
  const def = ENEMIES[id];
  const p = spawnPoint(path, xFrac);
  return {
    def,
    path,
    x: p.x,
    y: p.y,
    x0: p.x,
    y0: p.y,
    t: 0,
    arrivedAt: -1,
    hp: Math.ceil(def.hp * hpScale),
    alive: true,
    flash: 0,
    rot: 0,
  };
}

/** Un ennemi ne tire que s'il est bien visible (jamais de balle surprise depuis le bord). */
const canFire = (e: Enemy): boolean => e.y > 10 && e.y < FIELD_H * 0.72 && e.x > 4 && e.x < FIELD_W - 4;

export function stepEnemy(e: Enemy, ctx: PatternContext): void {
  stepPath(e, e.path);
  if (e.flash > 0) e.flash--;
  if (e.def.spin) e.rot += 0.08;
  if (canFire(e)) {
    for (const spec of e.def.fire) {
      if (shouldFire(spec, e.t, ctx.scale.rate)) firePattern(ctx, spec, e.x, e.y, e.t);
    }
  }
  const m = 80;
  if (e.t > 30 && (e.y > FIELD_H + m || e.x < -m || e.x > FIELD_W + m || e.y < -m * 2)) e.alive = false;
}
