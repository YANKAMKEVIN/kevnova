import { SHIPS } from '../data/ships';
import { STAGES } from '../data/stages';
import { nextCost, type UpgradeId } from '../data/upgrades';
import type { SaveData } from '../save/schema';
import { betterRank } from '../sim/scoring';
import type { ShipId, StageId, StageResult } from '../sim/types';

export type BuyResult = { ok: true; cost: number } | { ok: false; reason: 'max' | 'funds' };

/** Achète le niveau suivant d'une amélioration (modifie la sauvegarde). */
export function buyUpgrade(save: SaveData, id: UpgradeId): BuyResult {
  const cost = nextCost(id, save.upgrades[id]);
  if (cost === null) return { ok: false, reason: 'max' };
  if (save.wallet.shards < cost) return { ok: false, reason: 'funds' };
  save.wallet.shards -= cost;
  save.upgrades[id]++;
  return { ok: true, cost };
}

/** Rembourse toutes les améliorations (pour réessayer une autre combinaison). */
export function refundAll(save: SaveData): number {
  let total = 0;
  for (const [id, lvl] of Object.entries(save.upgrades) as [UpgradeId, number][]) {
    for (let i = 0; i < lvl; i++) total += nextCost(id, i) ?? 0;
    save.upgrades[id] = 0;
  }
  save.wallet.shards += total;
  return total;
}

export const isStageUnlocked = (save: SaveData, id: StageId): boolean => {
  const i = STAGES.findIndex((s) => s.id === id);
  if (i <= 0) return i === 0;
  return save.progress.cleared.includes(STAGES[i - 1]!.id);
};

export const isShipUnlocked = (save: SaveData, id: ShipId): boolean => {
  const ship = SHIPS.find((s) => s.id === id);
  return !!ship && (ship.unlockAfter === null || save.progress.cleared.includes(ship.unlockAfter));
};

export interface ApplyOutcome {
  newlyCleared: boolean;
  newBest: boolean;
  unlockedShips: ShipId[];
  campaignComplete: boolean;
}

/**
 * Enregistre le résultat d'un secteur. Les éclats ramassés sont toujours gagnés (même en cas d'échec),
 * pour que chaque partie fasse progresser.
 */
export function applyStageResult(save: SaveData, r: StageResult): ApplyOutcome {
  const before = SHIPS.filter((s) => isShipUnlocked(save, s.id)).map((s) => s.id);
  save.wallet.shards += r.shards;
  save.wallet.earned += r.shards;
  save.progress.plays++;
  save.stats.kills += r.kills;
  save.stats.grazes += r.grazes;
  save.stats.bombs += r.bombsUsed;
  save.stats.seconds += r.frames / 60;
  const prevBest = save.progress.bestScore[r.stage] ?? 0;
  const newBest = r.score > prevBest;
  if (newBest) save.progress.bestScore[r.stage] = r.score;
  let newlyCleared = false;
  if (r.cleared) {
    save.progress.bestRank[r.stage] = betterRank(save.progress.bestRank[r.stage] ?? null, r.rank);
    if (!save.progress.cleared.includes(r.stage)) {
      newlyCleared = true;
      save.progress.cleared = STAGES.map((s) => s.id).filter((id) => id === r.stage || save.progress.cleared.includes(id));
    }
  }
  const unlockedShips = SHIPS.filter((s) => isShipUnlocked(save, s.id) && !before.includes(s.id)).map((s) => s.id);
  const campaignComplete = STAGES.every((s) => save.progress.cleared.includes(s.id));
  return { newlyCleared, newBest, unlockedShips, campaignComplete };
}

/** Prochain secteur à jouer : le premier non terminé, sinon le dernier. */
export function nextStageToPlay(save: SaveData): StageId {
  return (STAGES.find((s) => !save.progress.cleared.includes(s.id)) ?? STAGES[STAGES.length - 1]!).id;
}
