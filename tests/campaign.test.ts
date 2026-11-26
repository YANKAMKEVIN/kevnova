import { describe, expect, it } from 'vitest';
import { STAGES } from '../src/data/stages';
import { applyStageResult, buyUpgrade } from '../src/meta/progress';
import { defaultSave } from '../src/save/schema';
import { simulateStage } from '../src/sim/simulate';
import { NO_UPGRADES, type Difficulty, type ShipId } from '../src/sim/types';
import { UPGRADES } from '../src/data/upgrades';

/**
 * Parcours complet automatisé : le pilote automatique joue toute la campagne.
 * Si un changement rend un secteur infranchissable (ou plante), ces tests échouent.
 */
describe('le bot termine chaque secteur', () => {
  const ships: ShipId[] = ['etincelle', 'lance', 'gerbe'];
  for (const diff of ['doux', 'normal'] as Difficulty[]) {
    for (const st of STAGES) {
      it(`${st.name} (${diff}) avec les 3 vaisseaux`, () => {
        for (const ship of ships) {
          const { result } = simulateStage({ stage: st.id, ship, difficulty: diff, upgrades: NO_UPGRADES, seed: 100 + st.index });
          expect(result.cleared, `${ship} sur ${st.id}`).toBe(true);
          expect(result.kills).toBeGreaterThan(20);
          expect(result.shards).toBeGreaterThan(50);
        }
      });
    }
  }
  it('Infernal : le secteur final reste franchissable', () => {
    const { result } = simulateStage({ stage: 'couronne', ship: 'etincelle', difficulty: 'infernal', upgrades: NO_UPGRADES, seed: 9 });
    expect(result.cleared).toBe(true);
  });
});

describe('campagne complète avec sauvegarde et hangar', () => {
  it('du secteur 1 à la fin, en achetant des améliorations entre les secteurs', () => {
    const save = defaultSave();
    let total = 0;
    for (const st of STAGES) {
      // Achats gloutons : le moins cher d'abord.
      for (let bought = true; bought; ) {
        bought = false;
        const sorted = [...UPGRADES].sort((a, b) => (a.costs[save.upgrades[a.id]] ?? 1e9) - (b.costs[save.upgrades[b.id]] ?? 1e9));
        for (const u of sorted) if (buyUpgrade(save, u.id).ok) bought = true;
      }
      const { result } = simulateStage({ stage: st.id, ship: save.ship, difficulty: 'normal', upgrades: save.upgrades, seed: 7 + st.index });
      expect(result.cleared).toBe(true);
      const out = applyStageResult(save, result);
      expect(out.newlyCleared).toBe(true);
      total += result.score;
      if (out.unlockedShips.length) save.ship = out.unlockedShips[0]!;
    }
    expect(save.progress.cleared).toHaveLength(5);
    expect(Object.values(save.upgrades).some((l) => l > 0)).toBe(true);
    expect(save.ship).toBe('gerbe');
    expect(total).toBeGreaterThan(1_000_000);
  });
});
