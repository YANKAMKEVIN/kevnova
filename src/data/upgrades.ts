import type { Upgrades } from '../sim/types';

export type UpgradeId = keyof Upgrades;

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  icon: string;
  /** Coût en éclats de chaque niveau (la longueur donne le niveau max). */
  costs: readonly number[];
}

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'canon', name: 'Canon stellaire', description: 'Commence chaque secteur avec plus de puissance de tir.', icon: 'icone_puissance', costs: [80, 180, 320] },
  { id: 'satellites', name: 'Satellites Pilou', description: 'Des lanternes-satellites tirent à vos côtés.', icon: 'icone_satellite', costs: [120, 280] },
  { id: 'missiles', name: 'Missiles chercheurs', description: 'Des missiles roses traquent les ennemis.', icon: 'icone_missile', costs: [100, 220, 380] },
  { id: 'bouclier', name: 'Bouclier d’émail', description: 'Absorbe un impact par secteur et par niveau.', icon: 'icone_bouclier', costs: [140, 300] },
  { id: 'aimant', name: 'Aimant à éclats', description: 'Attire les éclats et bonus de plus loin.', icon: 'icone_aimant', costs: [50, 110, 200] },
  { id: 'nova', name: 'Réserve Nova', description: 'Une bombe Nova de plus au départ.', icon: 'icone_bombe', costs: [110, 250] },
  { id: 'coque', name: 'Coque renforcée', description: 'Une vie de plus au départ.', icon: 'icone_coeur', costs: [160, 380] },
];

export const upgradeById = (id: UpgradeId): UpgradeDef => {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) throw new Error(`Amélioration inconnue : ${id}`);
  return u;
};

export const maxLevel = (id: UpgradeId): number => upgradeById(id).costs.length;

/** Prix du prochain niveau, ou null si déjà au maximum. */
export const nextCost = (id: UpgradeId, level: number): number | null => upgradeById(id).costs[level] ?? null;
