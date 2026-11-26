import { clamp } from '../core/math';
import { HITBOX_RADIUS } from './player';
import { FIELD_H, FIELD_W, type InputFrame } from './types';
import type { World } from './world';

/**
 * Pilote automatique : à chaque image, il essaie 18 manœuvres (8 directions + immobile, normal ou concentré),
 * prédit la position des balles proches sur un court horizon et choisit la plus sûre.
 * Il sert aux tests (le bot doit finir tout le jeu) et au mode démo de l'écran titre.
 */
const DIRS: readonly [number, number][] = [
  [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.707, 0.707], [-0.707, 0.707], [0.707, -0.707], [-0.707, -0.707],
];
const HORIZONS: readonly number[] = [2, 4, 7, 11, 16, 22];
const WEIGHT: readonly number[] = [10, 8, 5, 3, 1.6, 0.9];
const NEAR = 150;
const MAX_TRACKED = 400;

export class Bot {
  private bx = new Float32Array(MAX_TRACKED);
  private by = new Float32Array(MAX_TRACKED);
  private bvx = new Float32Array(MAX_TRACKED);
  private bvy = new Float32Array(MAX_TRACKED);
  private br = new Float32Array(MAX_TRACKED);
  private n = 0;
  /** Décalage horizontal préféré (évite de rester pile sous un tireur visé). */
  private wobble = 0;

  decide(w: World): InputFrame {
    const p = w.player;
    this.collect(w);
    const target = this.goal(w);
    let best: InputFrame = { dx: 0, dy: 0, focus: false, bomb: false, target: null };
    let bestCost = Infinity;
    let safest = Infinity;
    for (let f = 0; f < 2; f++) {
      const focus = f === 1;
      const speed = focus ? p.ship.focusSpeed : p.ship.speed;
      for (const [dx, dy] of DIRS) {
        const danger = this.danger(p.x, p.y, dx * speed, dy * speed, w);
        if (danger < safest) safest = danger;
        const nx = clamp(p.x + dx * speed * 8, 12, FIELD_W - 12);
        const ny = clamp(p.y + dy * speed * 8, 20, FIELD_H - 18);
        const goal = Math.abs(nx - target.x) * 0.06 + Math.abs(ny - target.y) * 0.03;
        const edge = (nx < 30 || nx > FIELD_W - 30 ? 3 : 0) + (ny > FIELD_H - 30 ? 3 : 0);
        const cost = danger * 40 + goal + edge + (focus ? 0.15 : 0);
        if (cost < bestCost) {
          bestCost = cost;
          best = { dx, dy, focus, bomb: false, target: null };
        }
      }
    }
    // Danger inévitable dans les toutes prochaines images : Nova.
    if (safest >= WEIGHT[0]! * 0.99 && p.invuln <= 0 && p.bombs > 0 && w.bombTimer <= 0) best.bomb = true;
    return best;
  }

  private collect(w: World): void {
    const p = w.player;
    const b = w.bullets;
    this.n = 0;
    for (let i = 0; i < b.count && this.n < MAX_TRACKED; i++) {
      const dx = b.x[i]! - p.x;
      const dy = b.y[i]! - p.y;
      if (dx > NEAR || dx < -NEAR || dy > NEAR || dy < -NEAR) continue;
      const a = b.ang[i]!;
      const s = b.spd[i]! + b.acc[i]! * 4;
      const k = this.n++;
      this.bx[k] = b.x[i]!;
      this.by[k] = b.y[i]!;
      this.bvx[k] = Math.cos(a) * s;
      this.bvy[k] = Math.sin(a) * s;
      this.br[k] = b.r[i]!;
    }
  }

  private danger(px: number, py: number, vx: number, vy: number, w: World): number {
    let total = 0;
    const invuln = w.player.invuln;
    for (let h = 0; h < HORIZONS.length; h++) {
      const t = HORIZONS[h]!;
      if (invuln > t + 4) continue;
      const x = clamp(px + vx * t, 12, FIELD_W - 12);
      const y = clamp(py + vy * t, 20, FIELD_H - 18);
      let hit = false;
      let near = 0;
      for (let i = 0; i < this.n; i++) {
        const dx = this.bx[i]! + this.bvx[i]! * t - x;
        const dy = this.by[i]! + this.bvy[i]! * t - y;
        const d2 = dx * dx + dy * dy;
        const r = this.br[i]! + HITBOX_RADIUS + 2.5 + t * 0.12;
        if (d2 < r * r) {
          hit = true;
          break;
        }
        if (d2 < 900) near += (900 - d2) / 900;
      }
      if (!hit) {
        for (const e of w.enemies) {
          const r = e.def.radius * 0.6 + 6;
          const dx = e.x - x;
          const dy = e.y + e.path.speed * t - y;
          if (dx * dx + dy * dy < r * r) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        total += WEIGHT[h]!;
        break;
      }
      total += near * 0.012 * WEIGHT[h]!;
    }
    return total;
  }

  /** Où le bot aimerait être : sous la cible, assez bas, en ramassant les objets proches. */
  private goal(w: World): { x: number; y: number } {
    const p = w.player;
    this.wobble = Math.sin(w.frame * 0.013) * 26;
    let tx = FIELD_W / 2 + this.wobble;
    let ty = FIELD_H - 110;
    if (w.boss && w.boss.stage !== 'dead') {
      tx = w.boss.x + this.wobble;
      ty = FIELD_H - 120;
    } else {
      let best = Infinity;
      for (const e of w.enemies) {
        if (e.y < 0 || e.y > p.y - 60) continue;
        const score = Math.abs(e.x - p.x) - e.def.hp * 0.5;
        if (score < best) {
          best = score;
          tx = e.x + this.wobble * 0.3;
        }
      }
    }
    // Objets précieux à portée et peu de balles : on va les chercher.
    if (this.n < 25) {
      for (const it of w.items.items) {
        if (it.kind === 'star' || it.homing) continue;
        if (Math.abs(it.x - p.x) < 90 && it.y > p.y - 160 && it.y < p.y + 40) {
          tx = it.x;
          ty = Math.max(ty - 20, it.y + 10);
          break;
        }
      }
    }
    return { x: clamp(tx, 30, FIELD_W - 30), y: clamp(ty, 260, FIELD_H - 50) };
  }
}
