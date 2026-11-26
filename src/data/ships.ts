import type { ShipId, StageId } from '../sim/types';

export interface ShipDef {
  id: ShipId;
  name: string;
  tagline: string;
  description: string;
  sprite: string;
  speed: number;
  focusSpeed: number;
  /** Couleur d'accent (interface, tirs). */
  accent: string;
  /** Secteur à terminer pour débloquer le vaisseau (null = dès le départ). */
  unlockAfter: StageId | null;
}

export const SHIPS: readonly ShipDef[] = [
  {
    id: 'etincelle',
    name: 'Étincelle',
    tagline: 'Équilibrée',
    description: 'Tir jumelé qui s’ouvre en éventail. Concentration : faisceau resserré.',
    sprite: 'ship_etincelle',
    speed: 4.2,
    focusSpeed: 1.9,
    accent: '#4fe3ff',
    unlockAfter: null,
  },
  {
    id: 'lance',
    name: 'Lance',
    tagline: 'Perçante',
    description: 'Aiguilles de lumière très puissantes droit devant. Pour les duels contre les boss.',
    sprite: 'ship_lance',
    speed: 3.8,
    focusSpeed: 1.7,
    accent: '#ffcf5a',
    unlockAfter: 'givre',
  },
  {
    id: 'gerbe',
    name: 'Gerbe',
    tagline: 'Couvrante',
    description: 'Cinq canons en arc qui balaient l’écran. Idéale contre les essaims.',
    sprite: 'ship_gerbe',
    speed: 4.0,
    focusSpeed: 1.8,
    accent: '#ff8fb0',
    unlockAfter: 'abysse',
  },
];

export const shipById = (id: ShipId): ShipDef => {
  const s = SHIPS.find((x) => x.id === id);
  if (!s) throw new Error(`Vaisseau inconnu : ${id}`);
  return s;
};
