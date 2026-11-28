import { FIELD_H, FIELD_W } from '../sim/types';
import type { Assets } from './assets';

interface Star {
  x: number;
  y: number;
  z: number;
}

interface Deco {
  x: number;
  y: number;
  size: number;
  rot: number;
  vr: number;
  speed: number;
  alpha: number;
}

/**
 * Décor défilant : illustration du secteur répétée en miroir (raccord invisible),
 * trois couches d'étoiles en parallaxe et de gros éléments flottants.
 */
export class Background {
  private tileA: HTMLCanvasElement | null = null;
  private tileB: HTMLCanvasElement | null = null;
  private tileH = FIELD_H;
  private key = '';
  private scroll = 0;
  private stars: Star[] = [];
  private decos: Deco[] = [];
  private decoTimer = 120;
  private seed = 1;

  constructor() {
    for (let i = 0; i < 90; i++) this.stars.push({ x: this.rand() * FIELD_W, y: this.rand() * FIELD_H, z: 0.3 + this.rand() * 1.7 });
  }

  private rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  /** Prépare les tuiles (normale + miroir) à la résolution physique. */
  prepare(assets: Assets, name: string, pxPerUnit: number): void {
    const key = `${name}@${pxPerUnit.toFixed(2)}`;
    if (key === this.key) return;
    this.key = key;
    const src = assets.get(name);
    const w = Math.round(FIELD_W * pxPerUnit);
    this.tileH = FIELD_W * ((src.height || 1) / (src.width || 1));
    const h = Math.round(this.tileH * pxPerUnit);
    this.tileA = document.createElement('canvas');
    this.tileA.width = w;
    this.tileA.height = h;
    const a = this.tileA.getContext('2d')!;
    a.imageSmoothingQuality = 'high';
    a.drawImage(src, 0, 0, w, h);
    this.tileB = document.createElement('canvas');
    this.tileB.width = w;
    this.tileB.height = h;
    const b = this.tileB.getContext('2d')!;
    b.translate(0, h);
    b.scale(1, -1);
    b.drawImage(this.tileA, 0, 0);
  }

  reset(): void {
    this.scroll = 0;
    this.decos = [];
    this.decoTimer = 90;
  }

  step(speed: number): void {
    this.scroll += 0.45 * speed;
    for (const s of this.stars) {
      s.y += s.z * 0.9 * speed;
      if (s.y > FIELD_H) {
        s.y -= FIELD_H;
        s.x = this.rand() * FIELD_W;
      }
    }
    if (--this.decoTimer <= 0) {
      this.decoTimer = 220 + Math.floor(this.rand() * 260);
      const near = this.rand() < 0.35;
      this.decos.push({
        x: this.rand() * FIELD_W,
        y: -120,
        size: near ? 120 + this.rand() * 80 : 50 + this.rand() * 50,
        rot: this.rand() * 6.28,
        vr: (this.rand() - 0.5) * 0.01,
        speed: near ? 1.3 : 0.6,
        alpha: near ? 0.55 : 0.35,
      });
    }
    // Compactage sur place : pas de nouveau tableau à chaque image.
    let n = 0;
    for (const d of this.decos) {
      d.y += d.speed * speed;
      d.rot += d.vr;
      if (d.y < FIELD_H + 160) this.decos[n++] = d;
    }
    this.decos.length = n;
  }

  draw(g: CanvasRenderingContext2D, assets: Assets, decoName: string, pxPerUnit: number, tint: string): void {
    if (this.tileA && this.tileB) {
      const period = this.tileH * 2;
      const off = this.scroll % period;
      // Les tuiles alternent normale / miroir de bas en haut.
      for (let y = off - period; y < FIELD_H; y += this.tileH) {
        const idx = Math.round((y - off) / this.tileH);
        const tile = idx % 2 === 0 ? this.tileA : this.tileB;
        g.drawImage(tile, 0, y, FIELD_W, this.tileH + 0.5);
      }
    }
    for (const d of this.decos) {
      const img = assets.sprite(decoName, d.size * pxPerUnit);
      g.globalAlpha = d.alpha;
      g.save();
      g.translate(d.x, d.y);
      g.rotate(d.rot);
      g.drawImage(img, -d.size / 2, -d.size / 2, d.size, (d.size * img.height) / img.width);
      g.restore();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'lighter';
    for (const s of this.stars) {
      g.globalAlpha = 0.25 + s.z * 0.3;
      g.fillStyle = s.z > 1.4 ? tint : '#ffffff';
      const sz = s.z > 1.4 ? 1.6 : 1;
      g.fillRect(s.x, s.y, sz, sz * (1 + s.z));
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
}
