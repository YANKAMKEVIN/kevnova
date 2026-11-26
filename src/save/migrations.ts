import { STAGES } from '../data/stages';
import { SAVE_VERSION } from './schema';

type Loose = Record<string, unknown>;

/**
 * Chaque migration transforme la version N en N+1. On ne modifie jamais une migration publiée :
 * on en ajoute une nouvelle. Une sauvegarde d'une version future est refusée (pas de perte silencieuse).
 */
export const MIGRATIONS: Record<number, (d: Loose) => Loose> = {
  // v1 (préversion) : { volume, difficulty, unlocked: index du dernier secteur ouvert, shards, upgrades }
  1: (d) => {
    const unlocked = typeof d.unlocked === 'number' ? Math.max(0, Math.floor(d.unlocked)) : 0;
    const settings = (d.settings ?? {}) as Loose;
    const volume = typeof settings.volume === 'number' ? settings.volume : 0.7;
    return {
      version: 2,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      settings: { music: volume, sfx: volume, difficulty: settings.difficulty },
      progress: { cleared: STAGES.slice(0, unlocked).map((s) => s.id), bestRank: {}, bestScore: {}, endingSeen: false, plays: 0 },
      wallet: { shards: d.shards, earned: d.shards },
      upgrades: d.upgrades,
      ship: 'etincelle',
      stats: {},
    };
  },
};

export class FutureSaveError extends Error {
  constructor(v: number) {
    super(`Sauvegarde de version ${v} plus récente que le jeu (${SAVE_VERSION})`);
  }
}

export function migrate(raw: Loose): Loose {
  let d = raw;
  let v = typeof d.version === 'number' ? d.version : 1;
  if (v > SAVE_VERSION) throw new FutureSaveError(v);
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`Migration manquante depuis la version ${v}`);
    d = m(d);
    v = typeof d.version === 'number' ? d.version : v + 1;
  }
  return d;
}
