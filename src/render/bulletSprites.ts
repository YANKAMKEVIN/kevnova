import { BULLET_COLORS, BULLET_KINDS, BulletColor, BulletKind } from '../sim/types';
import { BULLET_TINTS } from './palette';

export const ROTATIONS = 32;

/** Taille de dessin logique (px) de chaque forme de balle. */
const DRAW: Record<BulletKind, { w: number; h: number }> = {
  [BulletKind.Small]: { w: 10, h: 10 },
  [BulletKind.Orb]: { w: 14, h: 14 },
  [BulletKind.Rice]: { w: 9, h: 17 },
  [BulletKind.Big]: { w: 28, h: 28 },
  [BulletKind.Shard]: { w: 10, h: 18 },
};

const ORIENTED = (k: BulletKind): boolean => k === BulletKind.Rice || k === BulletKind.Shard;

/**
 * Balles pré-dessinées (halo coloré + cœur blanc) à la résolution de l'écran.
 * Les formes allongées ont 32 orientations pré-calculées : aucune rotation pendant le jeu.
 */
export class BulletSprites {
  private sprites: HTMLCanvasElement[][] = [];
  readonly half: number[] = [];
  private scale = 0;

  build(scale: number): void {
    if (Math.abs(scale - this.scale) < 0.01) return;
    this.scale = scale;
    this.sprites = [];
    for (let k = 0; k < BULLET_KINDS; k++) {
      const d = DRAW[k as BulletKind];
      const box = Math.ceil(Math.max(d.w, d.h) * 1.7 * scale);
      this.half[k] = box / scale / 2;
      for (let c = 0; c < BULLET_COLORS; c++) {
        const list: HTMLCanvasElement[] = [];
        const n = ORIENTED(k as BulletKind) ? ROTATIONS : 1;
        for (let r = 0; r < n; r++) {
          list.push(drawBullet(k as BulletKind, c as BulletColor, box, scale, (r / ROTATIONS) * Math.PI * 2));
        }
        this.sprites[k * BULLET_COLORS + c] = list;
      }
    }
  }

  get(kind: number, color: number, angle: number): HTMLCanvasElement {
    const list = this.sprites[kind * BULLET_COLORS + color]!;
    if (list.length === 1) return list[0]!;
    let r = Math.round((angle / (Math.PI * 2)) * ROTATIONS) % ROTATIONS;
    if (r < 0) r += ROTATIONS;
    return list[r]!;
  }
}

function drawBullet(kind: BulletKind, color: BulletColor, box: number, s: number, angle: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = box;
  c.height = box;
  const g = c.getContext('2d')!;
  const [halo, core] = BULLET_TINTS[color];
  const d = DRAW[kind];
  g.translate(box / 2, box / 2);
  // Les sprites allongés sont dessinés pointe vers la droite (angle 0), comme le mouvement.
  g.rotate(angle - Math.PI / 2);
  g.scale(s, s);
  const glow = g.createRadialGradient(0, 0, 0, 0, 0, Math.max(d.w, d.h) * 0.85);
  glow.addColorStop(0, halo + 'cc');
  glow.addColorStop(0.45, halo + '55');
  glow.addColorStop(1, halo + '00');
  g.fillStyle = glow;
  g.beginPath();
  g.ellipse(0, 0, d.w * 0.85, d.h * 0.85, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = halo;
  g.beginPath();
  if (kind === BulletKind.Shard) {
    g.moveTo(0, d.h / 2);
    g.lineTo(d.w / 2, 0);
    g.lineTo(0, -d.h / 2);
    g.lineTo(-d.w / 2, 0);
    g.closePath();
  } else {
    g.ellipse(0, 0, d.w / 2, d.h / 2, 0, 0, Math.PI * 2);
  }
  g.fill();
  g.fillStyle = core;
  g.beginPath();
  g.ellipse(0, 0, d.w * 0.28, d.h * 0.28, 0, 0, Math.PI * 2);
  g.fill();
  if (kind === BulletKind.Big || kind === BulletKind.Orb) {
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = kind === BulletKind.Big ? 1.6 : 1;
    g.beginPath();
    g.arc(0, 0, d.w / 2 - 0.5, 0, Math.PI * 2);
    g.stroke();
  }
  return c;
}
