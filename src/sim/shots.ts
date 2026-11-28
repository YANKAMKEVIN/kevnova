import type { ShipId } from './types';

export enum ShotKind {
  Main = 0,
  Needle = 1,
  Spread = 2,
  Satellite = 3,
  Missile = 4,
}

/** Tirs du joueur : petit tableau recyclé (jamais plus de quelques centaines à la fois). */
export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  kind: ShotKind;
  alive: boolean;
  age: number;
}

export class ShotPool {
  readonly items: Shot[] = [];
  private free: Shot[] = [];

  spawn(x: number, y: number, vx: number, vy: number, dmg: number, kind: ShotKind): Shot {
    const s = this.free.pop() ?? { x: 0, y: 0, vx: 0, vy: 0, dmg: 0, kind: ShotKind.Main, alive: true, age: 0 };
    s.x = x;
    s.y = y;
    s.vx = vx;
    s.vy = vy;
    s.dmg = dmg;
    s.kind = kind;
    s.alive = true;
    s.age = 0;
    this.items.push(s);
    return s;
  }

  /** Retire les tirs morts (appelé une fois par image). */
  compact(): void {
    let w = 0;
    for (let i = 0; i < this.items.length; i++) {
      const s = this.items[i]!;
      if (s.alive) this.items[w++] = s;
      else this.free.push(s);
    }
    this.items.length = w;
  }

  clear(): void {
    for (const s of this.items) this.free.push(s);
    this.items.length = 0;
  }
}

export interface VolleyShot {
  dx: number;
  dy: number;
  angle: number;
  dmg: number;
  kind: ShotKind;
}

const SHOT_SPEED = 11;
export { SHOT_SPEED };

const volleyCache = new Map<ShipId, (readonly VolleyShot[])[]>();

/**
 * Salve principale d'un vaisseau selon son niveau de puissance (1 à 5) et la concentration.
 * Fonction pure, mémorisée : le tir automatique (12 salves par seconde) n'alloue rien.
 * Le tableau renvoyé est partagé : ne pas le modifier.
 */
export function volley(ship: ShipId, level: number, focus: boolean): readonly VolleyShot[] {
  const L = Math.max(1, Math.min(5, Math.floor(level)));
  let table = volleyCache.get(ship);
  if (!table) volleyCache.set(ship, (table = []));
  const key = L * 2 + (focus ? 1 : 0);
  return table[key] ?? (table[key] = Object.freeze(buildVolley(ship, L, focus)));
}

function buildVolley(ship: ShipId, L: number, focus: boolean): VolleyShot[] {
  const out: VolleyShot[] = [];
  const add = (dx: number, angle: number, dmg: number, kind: ShotKind, dy = 0): void => {
    out.push({ dx, dy, angle, dmg, kind });
  };
  const bonus = L === 5 ? 1.25 : 1;
  if (ship === 'etincelle') {
    const w = focus ? 0.35 : 1;
    add(-6, 0, 1 * bonus, ShotKind.Main);
    add(6, 0, 1 * bonus, ShotKind.Main);
    if (L >= 2) {
      add(-10, -0.12 * w, 0.9 * bonus, ShotKind.Main, 4);
      add(10, 0.12 * w, 0.9 * bonus, ShotKind.Main, 4);
    }
    if (L >= 3) add(0, 0, 1.4 * bonus, ShotKind.Needle, -6);
    if (L >= 4) {
      add(-14, -0.24 * w, 0.8 * bonus, ShotKind.Main, 8);
      add(14, 0.24 * w, 0.8 * bonus, ShotKind.Main, 8);
    }
  } else if (ship === 'lance') {
    const f = focus ? 1.2 : 1;
    const n = L >= 3 ? 3 : L >= 2 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const dx = (i - (n - 1) / 2) * (focus ? 4 : 7);
      add(dx, 0, 2.1 * f * bonus, ShotKind.Needle, -4);
    }
    if (L >= 4) {
      add(-12, focus ? -0.02 : -0.07, 1.4 * f * bonus, ShotKind.Needle, 6);
      add(12, focus ? 0.02 : 0.07, 1.4 * f * bonus, ShotKind.Needle, 6);
    }
  } else {
    const w = focus ? 0.5 : 1;
    const spreads = L >= 4 ? 7 : L >= 2 ? 5 : 3;
    const arc = (L >= 4 ? 1.0 : L >= 2 ? 0.72 : 0.36) * w;
    for (let i = 0; i < spreads; i++) {
      const k = i / (spreads - 1) - 0.5;
      add(k * 18, k * arc, 0.75 * bonus, ShotKind.Spread, Math.abs(k) * 8);
    }
    if (L >= 3) {
      add(-5, 0, 0.9 * bonus, ShotKind.Main, -4);
      add(5, 0, 0.9 * bonus, ShotKind.Main, -4);
    }
    if (L >= 5) {
      add(-20, -0.6 * w, 0.7, ShotKind.Spread, 10);
      add(20, 0.6 * w, 0.7, ShotKind.Spread, 10);
    }
  }
  return out;
}

export interface SatelliteOffset {
  dx: number;
  dy: number;
  angle: number;
}

const satelliteCache: (readonly SatelliteOffset[])[] = [];

/** Position des satellites (relative au vaisseau) selon le niveau d'amélioration (mémorisée, tableau partagé). */
export function satelliteOffsets(level: number, focus: boolean): readonly SatelliteOffset[] {
  const L = level <= 0 ? 0 : level >= 2 ? 2 : 1;
  const key = L * 2 + (focus ? 1 : 0);
  return satelliteCache[key] ?? (satelliteCache[key] = Object.freeze(buildSatellites(L, focus)));
}

function buildSatellites(level: number, focus: boolean): SatelliteOffset[] {
  if (level <= 0) return [];
  const spread = focus ? 16 : 30;
  const base = [
    { dx: -spread, dy: 10, angle: 0 },
    { dx: spread, dy: 10, angle: 0 },
  ];
  if (level >= 2) {
    base.push({ dx: -spread * 0.7, dy: 26, angle: focus ? -0.03 : -0.14 });
    base.push({ dx: spread * 0.7, dy: 26, angle: focus ? 0.03 : 0.14 });
  }
  return base;
}
