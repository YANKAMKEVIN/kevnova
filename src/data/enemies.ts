import { BulletColor, BulletKind, type EnemyId, type FireSpec } from '../sim/types';

export interface EnemyDef {
  id: EnemyId;
  sprite: string;
  hp: number;
  radius: number;
  /** Taille de dessin (px logiques). */
  size: number;
  score: number;
  shards: number;
  powerChance: number;
  fire: FireSpec[];
  /** Tourne sur lui-même (toupies). */
  spin?: boolean;
}

const K = BulletKind;
const C = BulletColor;

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  dard: {
    id: 'dard', sprite: 'e_dard', hp: 3, radius: 11, size: 34, score: 100, shards: 1, powerChance: 0.12,
    fire: [{ pattern: 'aimed', every: 90, delay: 40, n: 1, speed: 2.4, kind: K.Rice, color: C.Magenta }],
  },
  toupie: {
    id: 'toupie', sprite: 'e_toupie', hp: 6, radius: 13, size: 38, score: 150, shards: 1, powerChance: 0.16, spin: true,
    fire: [{ pattern: 'ring', every: 110, delay: 50, n: 8, speed: 1.7, spin: 0.02, kind: K.Small, color: C.Violet }],
  },
  mante: {
    id: 'mante', sprite: 'e_mante', hp: 22, radius: 18, size: 60, score: 600, shards: 3, powerChance: 0.6,
    fire: [
      { pattern: 'aimed', every: 70, delay: 30, n: 3, spread: 0.5, speed: 2.6, kind: K.Rice, color: C.Magenta },
      { pattern: 'stack', every: 140, delay: 100, n: 3, speed: 2.0, kind: K.Orb, color: C.Violet },
    ],
  },
  cuirasse: {
    id: 'cuirasse', sprite: 'e_cuirasse', hp: 60, radius: 26, size: 84, score: 1500, shards: 6, powerChance: 1,
    fire: [
      { pattern: 'fan', every: 50, delay: 40, n: 5, spread: 1.1, speed: 2.0, kind: K.Orb, color: C.Braise },
      { pattern: 'aimed', every: 120, delay: 80, n: 1, speed: 1.6, kind: K.Big, color: C.Braise },
    ],
  },
  meduse: {
    id: 'meduse', sprite: 'e_meduse', hp: 14, radius: 15, size: 50, score: 400, shards: 2, powerChance: 0.35,
    fire: [{ pattern: 'flower', every: 120, delay: 60, n: 5, speed: 1.4, angVel: 0.012, spin: 0.05, kind: K.Orb, color: C.Violet }],
  },
  eclat: {
    id: 'eclat', sprite: 'e_eclat', hp: 9, radius: 13, size: 40, score: 250, shards: 1, powerChance: 0.16,
    fire: [{ pattern: 'stack', every: 100, delay: 45, n: 3, speed: 2.2, kind: K.Shard, color: C.Ice }],
  },
  porteur: {
    id: 'porteur', sprite: 'e_porteur', hp: 260, radius: 34, size: 120, score: 8000, shards: 20, powerChance: 1,
    fire: [
      { pattern: 'spiral', every: 8, delay: 60, n: 3, speed: 1.9, spin: 0.09, kind: K.Small, color: C.Magenta },
      { pattern: 'aimed', every: 90, delay: 90, n: 5, spread: 0.7, speed: 2.6, kind: K.Rice, color: C.Gold },
    ],
  },
  tourelle: {
    id: 'tourelle', sprite: 'e_tourelle', hp: 30, radius: 17, size: 52, score: 800, shards: 3, powerChance: 0.55,
    fire: [{ pattern: 'spiral', every: 12, delay: 50, n: 2, speed: 1.8, spin: 0.13, kind: K.Small, color: C.Violet }],
  },
};
