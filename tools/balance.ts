// Équilibrage : le bot joue chaque secteur avec plusieurs vaisseaux et difficultés.
// Usage : npx tsx tools/balance.ts [difficulté]
import { STAGES } from '../src/data/stages';
import { simulateStage } from '../src/sim/simulate';
import { NO_UPGRADES, type Difficulty, type ShipId } from '../src/sim/types';

const diff = (process.argv[2] ?? 'normal') as Difficulty;
const ships: ShipId[] = ['etincelle', 'lance', 'gerbe'];
for (const st of STAGES) {
  for (const ship of ships) {
    const t0 = performance.now();
    const { result: r, world } = simulateStage({ stage: st.id, ship, difficulty: diff, upgrades: NO_UPGRADES, seed: 1234 + st.index });
    const ms = performance.now() - t0;
    console.log(
      `${st.id.padEnd(9)} ${ship.padEnd(9)} ${r.cleared ? 'OK ' : 'KO '} rang ${r.rank} score ${r.score} éclats ${r.shards} coups ${r.hits} bombes ${r.bombsUsed} frôl ${r.grazes} ${(r.frames / 60).toFixed(0)}s (${ms.toFixed(0)} ms) phase ${world.phase} boss ${world.boss?.phaseIndex ?? '-'}`,
    );
  }
}
