import type { ItemKind, Rank } from './types';

export const GRAZE_SCORE = 20;
export const GRAZE_NOVA = 1.4;
export const CAPTURE_BONUS = 10000;
export const NO_HIT_BONUS = 50000;
export const LIFE_BONUS = 10000;

/** Valeur en score et en éclats (monnaie du hangar) de chaque objet. */
export const ITEM_VALUE: Record<ItemKind, { score: number; shards: number }> = {
  power: { score: 100, shards: 0 },
  shard: { score: 50, shards: 1 },
  bigShard: { score: 300, shards: 5 },
  star: { score: 10, shards: 0 },
  bomb: { score: 1000, shards: 0 },
  life: { score: 5000, shards: 0 },
};

export function computeRank(hits: number, bombsUsed: number, cleared: boolean): Rank {
  if (!cleared) return 'C';
  if (hits === 0 && bombsUsed <= 1) return 'S';
  if (hits <= 1) return 'A';
  if (hits <= 3) return 'B';
  return 'C';
}

export const RANK_ORDER: readonly Rank[] = ['C', 'B', 'A', 'S'];
export const betterRank = (a: Rank | null, b: Rank): Rank =>
  a === null || RANK_ORDER.indexOf(b) > RANK_ORDER.indexOf(a) ? b : a;

/** Découpe une récompense en éclats en gros + petits éclats (moins d'objets à l'écran). */
export function splitShards(total: number): { big: number; small: number } {
  const big = Math.floor(total / 5);
  return { big, small: total - big * 5 };
}
