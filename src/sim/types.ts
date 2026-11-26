/** Types partagés de la simulation (aucune dépendance au DOM). */
export const FIELD_W = 360;
export const FIELD_H = 640;
export const FPS = 60;

export type Difficulty = 'doux' | 'normal' | 'infernal';
export type ShipId = 'etincelle' | 'lance' | 'gerbe';
export type EnemyId = 'dard' | 'toupie' | 'mante' | 'cuirasse' | 'meduse' | 'eclat' | 'porteur' | 'tourelle';
export type BossId = 'faucheur' | 'sentinelle' | 'fondeur' | 'leviathan' | 'archonte';
export type StageId = 'corail' | 'givre' | 'forge' | 'abysse' | 'couronne';

/** Formes de balles ennemies (index de sprite). */
export enum BulletKind {
  Small = 0,
  Orb = 1,
  Rice = 2,
  Big = 3,
  Shard = 4,
}
export const BULLET_KINDS = 5;

/** Couleurs de balles ennemies. */
export enum BulletColor {
  Magenta = 0,
  Violet = 1,
  Braise = 2,
  Ice = 3,
  Gold = 4,
  White = 5,
}
export const BULLET_COLORS = 6;

/** Rayon de collision de chaque forme (le dessin est plus grand : on est indulgent). */
export const BULLET_RADIUS: readonly number[] = [2.5, 3.5, 2.5, 7, 3];

export type PatternId = 'aimed' | 'ring' | 'spiral' | 'fan' | 'random' | 'wall' | 'flower' | 'stack';

/** Une salve d'un ennemi ou d'un boss. `every` et `delay` sont en images (60 par seconde). */
export interface FireSpec {
  pattern: PatternId;
  every: number;
  delay?: number;
  n?: number;
  spread?: number;
  speed: number;
  accel?: number;
  maxSpeed?: number;
  angVel?: number;
  spin?: number;
  kind: BulletKind;
  color: BulletColor;
  offsetX?: number;
  offsetY?: number;
  /** Angle de base (radians) quand la salve n'est pas visée ; PI/2 = vers le bas. */
  angle?: number;
}

export type PathKind = 'dive' | 'sine' | 'swoop' | 'hover' | 'cross' | 'orbit';

export interface PathSpec {
  kind: PathKind;
  speed: number;
  amp?: number;
  freq?: number;
  stopY?: number;
  hold?: number;
  dir?: 1 | -1;
}

/** Commandes d'un joueur pour une image de simulation. */
export interface InputFrame {
  dx: number;
  dy: number;
  focus: boolean;
  bomb: boolean;
  /** Cible absolue (tactile) : le vaisseau s'en approche à vitesse max. */
  target?: { x: number; y: number } | null;
}

export const NO_INPUT: InputFrame = { dx: 0, dy: 0, focus: false, bomb: false, target: null };

export type SimEvent =
  | { type: 'explode'; x: number; y: number; size: number; color: BulletColor }
  | { type: 'hit'; x: number; y: number }
  | { type: 'graze'; x: number; y: number }
  | { type: 'playerHit'; x: number; y: number; shieldOnly: boolean }
  | { type: 'bomb'; x: number; y: number }
  | { type: 'pickup'; kind: ItemKind; x: number; y: number }
  | { type: 'powerUp'; level: number }
  | { type: 'bossPhase'; name: string; index: number }
  | { type: 'bossWarning' }
  | { type: 'bossDefeated'; x: number; y: number }
  | { type: 'cleared' }
  | { type: 'gameOver' };

export type ItemKind = 'power' | 'shard' | 'bigShard' | 'star' | 'bomb' | 'life';

export interface Upgrades {
  canon: number;
  satellites: number;
  missiles: number;
  bouclier: number;
  aimant: number;
  nova: number;
  coque: number;
}

export const NO_UPGRADES: Upgrades = { canon: 0, satellites: 0, missiles: 0, bouclier: 0, aimant: 0, nova: 0, coque: 0 };

export type Rank = 'S' | 'A' | 'B' | 'C';

export interface StageResult {
  stage: StageId;
  cleared: boolean;
  score: number;
  shards: number;
  grazes: number;
  hits: number;
  bombsUsed: number;
  frames: number;
  kills: number;
  rank: Rank;
}
