import { FIELD_H, FIELD_W } from '../sim/types';

/** Mise à l'échelle du terrain (360 × 640 unités) dans la fenêtre, avec résolution adaptative. */
export class View {
  cssW = 1;
  cssH = 1;
  dpr = 1;
  /** Unités logiques → pixels CSS. */
  scale = 1;
  offX = 0;
  offY = 0;
  /** Facteur de qualité (1 = pleine résolution, baisse si le téléphone peine). */
  quality = 1;

  get pxPerUnit(): number {
    return this.scale * this.dpr;
  }

  get letterboxed(): boolean {
    return this.offX > 1 || this.offY > 1;
  }

  /** Recalcule la mise en page ; renvoie true si la taille physique a changé. */
  layout(canvas: HTMLCanvasElement, cssW: number, cssH: number, devicePixelRatio: number): boolean {
    const dpr = Math.max(0.75, Math.min(devicePixelRatio, 2) * this.quality);
    const changed = cssW !== this.cssW || cssH !== this.cssH || dpr !== this.dpr;
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;
    this.scale = Math.min(cssW / FIELD_W, cssH / FIELD_H);
    this.offX = (cssW - FIELD_W * this.scale) / 2;
    this.offY = (cssH - FIELD_H * this.scale) / 2;
    const pw = Math.round(cssW * dpr);
    const ph = Math.round(cssH * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    return changed;
  }

  /** Coordonnées écran (CSS) → coordonnées du terrain. */
  toField(clientX: number, clientY: number): { x: number; y: number } {
    return { x: (clientX - this.offX) / this.scale, y: (clientY - this.offY) / this.scale };
  }
}
