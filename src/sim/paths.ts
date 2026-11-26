import { FIELD_W } from './types';
import type { PathSpec } from './types';

export interface Mover {
  x: number;
  y: number;
  /** Position d'origine (pour les trajectoires paramétriques). */
  x0: number;
  y0: number;
  /** Âge en images. */
  t: number;
  /** Image d'arrivée au point d'arrêt (trajectoire « hover »), -1 tant qu'il n'est pas arrivé. */
  arrivedAt: number;
}

/** Position de départ d'un ennemi selon sa trajectoire. */
export function spawnPoint(path: PathSpec, xFrac: number): { x: number; y: number } {
  if (path.kind === 'cross') {
    return { x: (path.dir ?? 1) > 0 ? -30 : FIELD_W + 30, y: path.stopY ?? 120 };
  }
  return { x: xFrac * FIELD_W, y: -30 };
}

/**
 * Avance un mobile d'une image le long de sa trajectoire.
 * Fonctions pures du temps : un même ennemi suit toujours exactement le même chemin.
 */
export function stepPath(m: Mover, p: PathSpec): void {
  const t = ++m.t;
  const s = p.speed;
  switch (p.kind) {
    case 'dive':
      m.y += s;
      break;
    case 'sine':
      m.y += s;
      m.x = m.x0 + Math.sin(t * (p.freq ?? 0.03)) * (p.amp ?? 50);
      break;
    case 'swoop': {
      // Descend puis s'incurve vers le côté `dir` en accélérant.
      const dir = p.dir ?? 1;
      const k = Math.min(1, t / 90);
      m.y += s * (1 - 0.75 * k);
      m.x += dir * s * k * 1.2;
      break;
    }
    case 'hover': {
      const stopY = p.stopY ?? 150;
      if (m.arrivedAt < 0) {
        m.y += Math.max(0.5, s * Math.min(1, (stopY - m.y) / 60));
        if (m.y >= stopY - 1) m.arrivedAt = t;
      } else if (t - m.arrivedAt > (p.hold ?? 240)) {
        m.y += s * Math.min(1.5, (t - m.arrivedAt - (p.hold ?? 240)) / 60);
      } else {
        m.x = m.x0 + Math.sin((t - m.arrivedAt) * 0.02) * 12;
      }
      break;
    }
    case 'cross':
      m.x += (p.dir ?? 1) * s;
      m.y = m.y0 + Math.sin(t * 0.04) * 10;
      break;
    case 'orbit': {
      const a = t * (p.freq ?? 0.03);
      m.y0 += s;
      m.x = m.x0 + Math.cos(a) * (p.amp ?? 50);
      m.y = m.y0 + Math.sin(a) * (p.amp ?? 50) * 0.5;
      break;
    }
  }
}
