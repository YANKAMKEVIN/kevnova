/**
 * Sonde d'allocations (lancée dans un processus Node séparé avec --expose-gc, voir alloc.test.ts).
 * Mesure les octets alloués dans le tas « jeune » de V8 pendant N images de simulation.
 */
import { getHeapSpaceStatistics } from 'node:v8';
import { BulletColor, BulletKind, FPS, NO_UPGRADES, type InputFrame } from '../../src/sim/types';
import { World } from '../../src/sim/world';
import { BulletField } from '../../src/sim/bullets';
import { resolveBullets, resolveShots, type BulletContact } from '../../src/sim/combat';
import { createEnemy, type Enemy } from '../../src/sim/enemy';
import { ItemField } from '../../src/sim/items';
import { createPlayer } from '../../src/sim/player';
import { ShotKind, ShotPool } from '../../src/sim/shots';

declare const gc: () => void;

const newSpace = (): number => getHeapSpaceStatistics().find((s) => s.space_name === 'new_space')!.space_used_size;

/** Octets alloués par image pendant `frames` images de `run` (après échauffement du JIT). */
function measure(setup: () => (i: number) => void, frames: number): number {
  const run = setup();
  for (let i = 0; i < 2000; i++) run(i); // échauffement : compilation JIT, caches
  let best = Infinity;
  for (let k = 0; k < 8; k++) {
    gc();
    const before = newSpace();
    for (let i = 0; i < frames; i++) run(i);
    const after = newSpace();
    // Un ramassage pendant la mesure fausserait le delta : on garde le meilleur essai.
    if (after >= before) best = Math.min(best, (after - before) / frames);
  }
  return best;
}

const input: InputFrame = { dx: 0, dy: 0, focus: false, bomb: false, target: null };

const bossFight = () => {
  const w = new World({ stage: 'couronne', ship: 'gerbe', difficulty: 'infernal', upgrades: { ...NO_UPGRADES, satellites: 2, missiles: 2 }, seed: 3 });
  while (w.phase !== 'boss') {
    w.player.invuln = 1e9;
    w.player.lives = 9;
    w.step(input);
  }
  return (i: number) => {
    w.player.invuln = 1e9;
    if (w.boss) w.boss.hp = 1e9; // le combat dure indéfiniment
    if (w.bullets.count < 1500) w.bullets.spawn(180 + Math.cos(i) * 150, 40, 1.2 + (i % 7) * 0.2, 1, (i % 5) as BulletKind, (i % 6) as BulletColor);
    input.dx = Math.sin(i / 40);
    input.focus = i % 300 < 100;
    w.step(input);
  };
};

const waves = () => {
  let w: World | null = null;
  const fresh = () => new World({ stage: 'forge', ship: 'etincelle', difficulty: 'normal', upgrades: NO_UPGRADES, seed: 11 });
  w = fresh();
  return (i: number) => {
    if (!w || w.phase !== 'waves') w = fresh();
    w.player.invuln = 1e9;
    input.dx = Math.sin(i / 50);
    input.focus = false;
    w.step(input);
  };
};

/**
 * Boucle chaude pure : 2 000 balles qui bougent, collisions, frôlements, objets attirés,
 * tirs du joueur qui avancent. Aucune création : doit allouer zéro octet.
 */
const core = () => {
  const bullets = new BulletField(2400);
  const items = new ItemField();
  const shots = new ShotPool();
  const p = createPlayer('etincelle', NO_UPGRADES);
  const enemies: Enemy[] = [createEnemy('cuirasse', 0.5, { kind: 'hover', speed: 1, stopY: 120, hold: 1e9 })];
  enemies[0]!.hp = 1e12;
  const contact: BulletContact = { hit: false, grazes: 0 };
  const noop = (): void => {};
  const refill = (): void => {
    while (bullets.count < 2000) {
      const k = bullets.count;
      bullets.spawn(10 + (k * 37) % 340, 10 + (k * 53) % 620, k * 0.37, 0.3, (k % 5) as BulletKind, (k % 6) as BulletColor, 0, 0.003);
    }
    while (items.items.length < 100) items.spawn(40 + items.items.length * 3, 200, 'shard', 0);
    while (shots.items.length < 60) shots.spawn(180, 600, 0, -11, 1, ShotKind.Main);
  };
  refill();
  return (i: number) => {
    if (i % 600 === 0) refill(); // hors mesure : les créations sont groupées en dehors des fenêtres
    p.invuln = 1e9;
    p.x = 180 + Math.sin(i / 30) * 100;
    bullets.step();
    resolveBullets(bullets, p, noop, contact);
    items.step(p, false, noop);
    resolveShots(shots, enemies, null, noop, noop);
  };
};

const out = {
  coreBytesPerFrame: measure(core, 500),
  bossBytesPerFrame: measure(bossFight, 30 * FPS),
  wavesBytesPerFrame: measure(waves, 10 * FPS),
};
process.stdout.write(JSON.stringify(out));
