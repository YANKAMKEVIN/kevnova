import { BULLET_RADIUS, BulletColor, BulletKind, FIELD_H, FIELD_W } from './types';

/**
 * Balles ennemies en « structure de tableaux » (typed arrays) : zéro allocation pendant le jeu,
 * ce qui garde le ramasse-miettes silencieux sur mobile même avec 2 000 balles à l'écran.
 */
export class BulletField {
  readonly capacity: number;
  count = 0;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly ang: Float32Array;
  readonly spd: Float32Array;
  readonly acc: Float32Array;
  readonly maxSpd: Float32Array;
  readonly angVel: Float32Array;
  readonly r: Float32Array;
  readonly kind: Uint8Array;
  readonly color: Uint8Array;
  readonly grazed: Uint8Array;
  readonly age: Uint16Array;

  constructor(capacity = 2400) {
    this.capacity = capacity;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.ang = new Float32Array(capacity);
    this.spd = new Float32Array(capacity);
    this.acc = new Float32Array(capacity);
    this.maxSpd = new Float32Array(capacity);
    this.angVel = new Float32Array(capacity);
    this.r = new Float32Array(capacity);
    this.kind = new Uint8Array(capacity);
    this.color = new Uint8Array(capacity);
    this.grazed = new Uint8Array(capacity);
    this.age = new Uint16Array(capacity);
  }

  /** Ajoute une balle ; renvoie false si le champ est plein (la balle est ignorée, jamais de crash). */
  spawn(
    x: number,
    y: number,
    ang: number,
    spd: number,
    kind: BulletKind,
    color: BulletColor,
    acc = 0,
    angVel = 0,
    maxSpd = 8,
  ): boolean {
    if (this.count >= this.capacity) return false;
    const i = this.count++;
    this.x[i] = x;
    this.y[i] = y;
    this.ang[i] = ang;
    this.spd[i] = spd;
    this.acc[i] = acc;
    this.angVel[i] = angVel;
    this.maxSpd[i] = maxSpd;
    this.kind[i] = kind;
    this.color[i] = color;
    this.r[i] = BULLET_RADIUS[kind] ?? 3;
    this.grazed[i] = 0;
    this.age[i] = 0;
    return true;
  }

  /** Supprime la balle i en la remplaçant par la dernière (O(1)). */
  remove(i: number): void {
    const last = --this.count;
    if (i === last) return;
    this.x[i] = this.x[last]!;
    this.y[i] = this.y[last]!;
    this.ang[i] = this.ang[last]!;
    this.spd[i] = this.spd[last]!;
    this.acc[i] = this.acc[last]!;
    this.maxSpd[i] = this.maxSpd[last]!;
    this.angVel[i] = this.angVel[last]!;
    this.r[i] = this.r[last]!;
    this.kind[i] = this.kind[last]!;
    this.color[i] = this.color[last]!;
    this.grazed[i] = this.grazed[last]!;
    this.age[i] = this.age[last]!;
  }

  /** Avance toutes les balles d'une image et retire celles sorties de l'écran. */
  step(): void {
    const m = 24;
    for (let i = this.count - 1; i >= 0; i--) {
      let s = this.spd[i]! + this.acc[i]!;
      const max = this.maxSpd[i]!;
      if (s > max) s = max;
      if (s < 0) s = 0;
      this.spd[i] = s;
      const a = this.ang[i]! + this.angVel[i]!;
      this.ang[i] = a;
      const nx = this.x[i]! + Math.cos(a) * s;
      const ny = this.y[i]! + Math.sin(a) * s;
      this.x[i] = nx;
      this.y[i] = ny;
      if (this.age[i]! < 65535) this.age[i] = this.age[i]! + 1;
      if (nx < -m || nx > FIELD_W + m || ny < -m - 40 || ny > FIELD_H + m) this.remove(i);
    }
  }

  clear(): void {
    this.count = 0;
  }
}
