import { ShotKind } from '../sim/shots';
import type { ItemKind } from '../sim/types';
import { PALETTE } from './palette';

/** Petits sprites procéduraux (tirs du joueur, objets) pré-rendus à la résolution de l'écran. */
export class MiniSprites {
  private cache = new Map<string, HTMLCanvasElement>();
  private scale = 0;

  setScale(s: number): void {
    if (Math.abs(s - this.scale) > 0.01) {
      this.scale = s;
      this.cache.clear();
    }
  }

  private make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    let c = this.cache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = Math.ceil(w * this.scale);
      c.height = Math.ceil(h * this.scale);
      const g = c.getContext('2d')!;
      g.scale(this.scale, this.scale);
      g.translate(w / 2, h / 2);
      draw(g);
      this.cache.set(key, c);
    }
    return c;
  }

  shot(kind: ShotKind, accent: string): { img: HTMLCanvasElement; w: number; h: number } {
    const dims: Record<ShotKind, [number, number]> = {
      [ShotKind.Main]: [8, 22],
      [ShotKind.Needle]: [8, 30],
      [ShotKind.Spread]: [9, 18],
      [ShotKind.Satellite]: [6, 16],
      [ShotKind.Missile]: [12, 12],
    };
    const [w, h] = dims[kind];
    const color = kind === ShotKind.Missile ? '#ff8fb0' : kind === ShotKind.Satellite ? PALETTE.gold : accent;
    const img = this.make(`shot${kind}${color}`, w, h, (g) => {
      const grad = g.createLinearGradient(0, -h / 2, 0, h / 2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, color);
      grad.addColorStop(1, color + '00');
      g.fillStyle = grad;
      g.beginPath();
      if (kind === ShotKind.Missile) {
        g.arc(0, 0, w / 2 - 1, 0, Math.PI * 2);
      } else {
        g.ellipse(0, 0, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
      }
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(0, -h * 0.12, w * 0.16, h * 0.28, 0, 0, Math.PI * 2);
      g.fill();
    });
    return { img, w, h };
  }

  item(kind: ItemKind): { img: HTMLCanvasElement; s: number } {
    const s = kind === 'star' ? 8 : kind === 'shard' ? 12 : kind === 'bigShard' ? 18 : 20;
    const img = this.make(`item${kind}`, s, s, (g) => {
      const r = s / 2 - 1;
      if (kind === 'star') {
        g.fillStyle = '#fff6c8';
        star(g, r, r * 0.4, 4);
        return;
      }
      if (kind === 'shard' || kind === 'bigShard') {
        const grad = g.createLinearGradient(-r, -r, r, r);
        grad.addColorStop(0, '#fff7d6');
        grad.addColorStop(0.5, PALETTE.gold);
        grad.addColorStop(1, '#4fe3ff');
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(0, -r);
        g.lineTo(r * 0.62, 0);
        g.lineTo(0, r);
        g.lineTo(-r * 0.62, 0);
        g.closePath();
        g.fill();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1;
        g.stroke();
        return;
      }
      const col = kind === 'power' ? PALETTE.cyan : kind === 'bomb' ? PALETTE.gold : PALETTE.magenta;
      g.fillStyle = '#0b0f2acc';
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = col;
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = col;
      g.font = `700 ${r * 1.1}px "Chakra Petch", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(kind === 'power' ? 'P' : kind === 'bomb' ? 'N' : '♥', 0, 1);
    });
    return { img, s };
  }

  glow(color: string, size: number): HTMLCanvasElement {
    return this.make(`glow${color}${size}`, size, size, (g) => {
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, size / 2);
      grad.addColorStop(0, color + 'ee');
      grad.addColorStop(0.4, color + '66');
      grad.addColorStop(1, color + '00');
      g.fillStyle = grad;
      g.fillRect(-size / 2, -size / 2, size, size);
    });
  }
}

function star(g: CanvasRenderingContext2D, r1: number, r2: number, n: number): void {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
}
