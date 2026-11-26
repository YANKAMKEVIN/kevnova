import { dist2 } from '../core/math';
import type { PlayerState } from './player';
import { FIELD_H, type ItemKind } from './types';

export interface Item {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: ItemKind;
  /** Attiré vers le joueur (aimant, ligne de collecte, après une Nova). */
  homing: boolean;
  alive: boolean;
}

/** Au-dessus de cette ligne, tous les objets à l'écran filent vers le joueur. */
export const COLLECT_LINE = 170;
export const MAX_ITEMS = 260;

export class ItemField {
  readonly items: Item[] = [];

  spawn(x: number, y: number, kind: ItemKind, spread = 1, homing = false): void {
    if (this.items.length >= MAX_ITEMS) return;
    this.items.push({
      x,
      y,
      vx: spread * Math.sin(this.items.length * 2.3) * 1.2,
      vy: -2.2 - spread * Math.abs(Math.cos(this.items.length * 1.7)),
      kind,
      homing,
      alive: true,
    });
  }

  /** Avance les objets ; appelle `collect` pour chaque objet ramassé. */
  step(p: PlayerState, alive: boolean, collect: (it: Item) => void): void {
    const all = alive && p.y < COLLECT_LINE;
    const mag2 = p.magnet * p.magnet * (p.focus ? 2.25 : 1);
    for (const it of this.items) {
      if (alive && (it.homing || all || dist2(it.x, it.y, p.x, p.y) < mag2)) {
        it.homing = true;
        const dx = p.x - it.x;
        const dy = p.y - it.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = 9;
        it.vx = (dx / d) * sp;
        it.vy = (dy / d) * sp;
      } else {
        it.vx *= 0.94;
        it.vy = Math.min(it.vy + 0.08, 1.4);
      }
      it.x += it.vx;
      it.y += it.vy;
      if (alive && dist2(it.x, it.y, p.x, p.y) < 20 * 20) {
        it.alive = false;
        collect(it);
      } else if (it.y > FIELD_H + 20) {
        it.alive = false;
      }
    }
    let w = 0;
    for (const it of this.items) if (it.alive) this.items[w++] = it;
    this.items.length = w;
  }

  attractAll(): void {
    for (const it of this.items) it.homing = true;
  }

  clear(): void {
    this.items.length = 0;
  }
}
