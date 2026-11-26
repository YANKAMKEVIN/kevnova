import { dist2 } from '../core/math';
import { damageBoss, type Boss } from './boss';
import type { Enemy } from './enemy';
import { GRAZE_RADIUS, HITBOX_RADIUS, type PlayerState } from './player';
import { SHOT_SPEED, ShotKind, type Shot, type ShotPool } from './shots';
import type { BulletField } from './bullets';

/** Le boss est une ellipse plus large que haute. */
export function hitsBoss(b: Boss, x: number, y: number, pad = 0): boolean {
  const rx = b.def.radius * 1.6 + pad;
  const ry = b.def.radius + pad;
  const dx = (x - b.x) / rx;
  const dy = (y - b.y) / ry;
  return dx * dx + dy * dy < 1;
}

export interface ShotHit {
  enemy: Enemy | null;
  x: number;
  y: number;
}

/** Oriente les missiles vers la cible la plus proche. */
function steerMissile(s: Shot, enemies: Enemy[], boss: Boss | null): void {
  let tx = 0;
  let ty = 0;
  let best = Infinity;
  for (const e of enemies) {
    if (!e.alive || e.y < 0) continue;
    const d = dist2(s.x, s.y, e.x, e.y);
    if (d < best) {
      best = d;
      tx = e.x;
      ty = e.y;
    }
  }
  if (boss && boss.stage === 'fighting') {
    const d = dist2(s.x, s.y, boss.x, boss.y);
    if (d < best) {
      best = d;
      tx = boss.x;
      ty = boss.y;
    }
  }
  if (best === Infinity) return;
  const cur = Math.atan2(s.vy, s.vx);
  const want = Math.atan2(ty - s.y, tx - s.x);
  let diff = want - cur;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = Math.max(-0.14, Math.min(0.14, diff));
  const sp = 7;
  s.vx = Math.cos(cur + turn) * sp;
  s.vy = Math.sin(cur + turn) * sp;
}

/**
 * Avance les tirs du joueur et applique les dégâts.
 * `onKill` est appelé une fois par ennemi détruit.
 */
export function resolveShots(
  shots: ShotPool,
  enemies: Enemy[],
  boss: Boss | null,
  onHit: (h: ShotHit) => void,
  onKill: (e: Enemy) => void,
): number {
  let bossDamage = 0;
  for (const s of shots.items) {
    if (!s.alive) continue;
    s.age++;
    if (s.kind === ShotKind.Missile && s.age % 4 === 0) steerMissile(s, enemies, boss);
    s.x += s.vx;
    s.y += s.vy;
    if (s.y < -20 || s.x < -20 || s.x > 380 || s.y > 660 || s.age > 140) {
      s.alive = false;
      continue;
    }
    for (const e of enemies) {
      if (!e.alive || e.y < -10) continue;
      const r = e.def.radius + 4;
      if (dist2(s.x, s.y, e.x, e.y) < r * r) {
        e.hp -= s.dmg;
        e.flash = 3;
        s.alive = false;
        onHit({ enemy: e, x: s.x, y: s.y });
        if (e.hp <= 0) {
          e.alive = false;
          onKill(e);
        }
        break;
      }
    }
    if (s.alive && boss && hitsBoss(boss, s.x, s.y, 4) && damageBoss(boss, s.dmg)) {
      bossDamage += s.dmg;
      s.alive = false;
      onHit({ enemy: null, x: s.x, y: s.y - SHOT_SPEED * 0.5 });
    }
  }
  shots.compact();
  return bossDamage;
}

export interface BulletContact {
  hit: boolean;
  grazes: number;
}

/** Collisions balles ennemies / joueur et frôlements (une seule passe sur toutes les balles). */
export function resolveBullets(
  bullets: BulletField,
  p: PlayerState,
  onGraze: (x: number, y: number) => void,
): BulletContact {
  const res: BulletContact = { hit: false, grazes: 0 };
  const px = p.x;
  const py = p.y;
  const vulnerable = p.invuln <= 0;
  const gr = GRAZE_RADIUS;
  for (let i = 0; i < bullets.count; i++) {
    const dx = bullets.x[i]! - px;
    const dy = bullets.y[i]! - py;
    if (dx > 30 || dx < -30 || dy > 30 || dy < -30) continue;
    const d2 = dx * dx + dy * dy;
    const r = bullets.r[i]!;
    if (vulnerable && d2 < (r + HITBOX_RADIUS) * (r + HITBOX_RADIUS)) {
      res.hit = true;
      return res;
    }
    if (vulnerable && bullets.grazed[i] === 0 && d2 < (r + gr) * (r + gr)) {
      bullets.grazed[i] = 1;
      res.grazes++;
      onGraze(bullets.x[i]!, bullets.y[i]!);
    }
  }
  return res;
}

/** Contact direct avec un ennemi (on est indulgent : 55 % du rayon). */
export function touchesEnemy(enemies: Enemy[], boss: Boss | null, p: PlayerState): boolean {
  if (p.invuln > 0) return false;
  for (const e of enemies) {
    if (!e.alive) continue;
    const r = e.def.radius * 0.55 + HITBOX_RADIUS;
    if (dist2(e.x, e.y, p.x, p.y) < r * r) return true;
  }
  return boss !== null && boss.stage === 'fighting' && hitsBoss(boss, p.x, p.y, -boss.def.radius * 0.45);
}
