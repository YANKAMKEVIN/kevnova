import { BulletColor } from '../sim/types';

/** Couleurs de la direction artistique « émail céleste ». */
export const PALETTE = {
  night: '#0b0f2a',
  indigo: '#1d1b4f',
  cyan: '#4fe3ff',
  pearl: '#f4f1ff',
  gold: '#ffcf5a',
  magenta: '#ff3d7f',
  violet: '#8a3dff',
  braise: '#ff7a2e',
  ice: '#9fe8ff',
} as const;

/** [halo, cœur] pour chaque couleur de balle ennemie. */
export const BULLET_TINTS: Record<BulletColor, [string, string]> = {
  [BulletColor.Magenta]: ['#ff3d7f', '#ffe3ee'],
  [BulletColor.Violet]: ['#9b4dff', '#efe2ff'],
  [BulletColor.Braise]: ['#ff7a2e', '#fff0d6'],
  [BulletColor.Ice]: ['#5fd8ff', '#f0fdff'],
  [BulletColor.Gold]: ['#ffc23d', '#fffbe6'],
  [BulletColor.White]: ['#c9c4ff', '#ffffff'],
};
