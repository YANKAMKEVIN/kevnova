/** Particules à durée de vie courte (étincelles, anneaux, éclairs), en tableaux recyclés. */
export enum PKind {
  Spark = 0,
  Ring = 1,
  Flash = 2,
  Dot = 3,
}

const CAP = 1200;

export class Particles {
  count = 0;
  readonly x = new Float32Array(CAP);
  readonly y = new Float32Array(CAP);
  readonly vx = new Float32Array(CAP);
  readonly vy = new Float32Array(CAP);
  readonly life = new Float32Array(CAP);
  readonly max = new Float32Array(CAP);
  readonly size = new Float32Array(CAP);
  readonly kind = new Uint8Array(CAP);
  readonly color: string[] = new Array<string>(CAP).fill('#fff');
  /** Budget réduit en qualité basse (mobiles modestes). */
  budget = CAP;

  add(kind: PKind, x: number, y: number, vx: number, vy: number, life: number, size: number, color: string): void {
    if (this.count >= this.budget) return;
    const i = this.count++;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.life[i] = life;
    this.max[i] = life;
    this.size[i] = size;
    this.kind[i] = kind;
    this.color[i] = color;
  }

  burst(x: number, y: number, n: number, speed: number, color: string, life = 30, size = 2): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.add(PKind.Spark, x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), size, color);
    }
  }

  step(dt = 1): void {
    for (let i = this.count - 1; i >= 0; i--) {
      this.life[i] = this.life[i]! - dt;
      if (this.life[i]! <= 0) {
        const last = --this.count;
        this.x[i] = this.x[last]!;
        this.y[i] = this.y[last]!;
        this.vx[i] = this.vx[last]!;
        this.vy[i] = this.vy[last]!;
        this.life[i] = this.life[last]!;
        this.max[i] = this.max[last]!;
        this.size[i] = this.size[last]!;
        this.kind[i] = this.kind[last]!;
        this.color[i] = this.color[last]!;
        continue;
      }
      this.x[i] = this.x[i]! + this.vx[i]! * dt;
      this.y[i] = this.y[i]! + this.vy[i]! * dt;
      if (this.kind[i] === PKind.Spark || this.kind[i] === PKind.Dot) {
        this.vx[i] = this.vx[i]! * 0.95;
        this.vy[i] = this.vy[i]! * 0.95;
      }
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.count; i++) {
      const t = this.life[i]! / this.max[i]!;
      const x = this.x[i]!;
      const y = this.y[i]!;
      const s = this.size[i]!;
      g.globalAlpha = t;
      g.fillStyle = this.color[i]!;
      g.strokeStyle = this.color[i]!;
      switch (this.kind[i]) {
        case PKind.Spark: {
          g.lineWidth = s;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x - this.vx[i]! * 2.5, y - this.vy[i]! * 2.5);
          g.stroke();
          break;
        }
        case PKind.Ring: {
          g.lineWidth = 2 + 3 * t;
          g.beginPath();
          g.arc(x, y, s * (1 - t) + 4, 0, Math.PI * 2);
          g.stroke();
          break;
        }
        case PKind.Flash: {
          g.globalAlpha = t * t * 0.9;
          g.beginPath();
          g.arc(x, y, s * (0.6 + 0.4 * (1 - t)), 0, Math.PI * 2);
          g.fill();
          break;
        }
        case PKind.Dot:
          g.fillRect(x - s / 2, y - s / 2, s, s);
          break;
      }
    }
    g.globalAlpha = 1;
  }

  clear(): void {
    this.count = 0;
  }
}
