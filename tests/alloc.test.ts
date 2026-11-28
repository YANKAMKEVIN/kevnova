import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Bullet hell sur mobile : chaque allocation dans la boucle chaude finit en pause du ramasse-miettes
 * (saccade visible). On le vérifie de deux façons complémentaires.
 */
describe('aucune allocation dans la boucle chaude', () => {
  it('mesure réelle : octets alloués par image (V8, processus séparé avec --expose-gc)', () => {
    const probe = fileURLToPath(new URL('./alloc/probe.ts', import.meta.url));
    const out = execFileSync(process.execPath, ['--expose-gc', '--max-semi-space-size=256', '--import', 'tsx', probe], {
      encoding: 'utf8',
      timeout: 90_000,
    });
    const r = JSON.parse(out) as { coreBytesPerFrame: number; bossBytesPerFrame: number; wavesBytesPerFrame: number };
    // Balles + collisions + frôlements + objets + tirs, sans création : quasi nul
    // (les quelques octets restants viennent du code froid encore interprété).
    expect(r.coreBytesPerFrame).toBeLessThan(128);
    // Combat de boss à 1 500 balles : avant l'optimisation, des closures et des tableaux étaient recréés à chaque image.
    expect(r.bossBytesPerFrame).toBeLessThan(200);
    // Phase de vagues (apparitions, tirs, objets) : ~900 o/image avant, ~170 après.
    expect(r.wavesBytesPerFrame).toBeLessThan(400);
  });

  /** Corps d'une méthode ou fonction (accolades équilibrées), pour une vérification statique. */
  const body = (file: string, signature: RegExp): string => {
    const src = readFileSync(fileURLToPath(new URL(`../src/${file}`, import.meta.url)), 'utf8');
    const m = signature.exec(src);
    if (!m) throw new Error(`${signature} introuvable dans ${file}`);
    // Le corps commence au premier « { » qui suit la parenthèse fermante des paramètres.
    const open = /\)(?::[^{;]*)?\s*\{/g;
    open.lastIndex = m.index;
    const o = open.exec(src);
    if (!o) throw new Error(`corps de ${signature} introuvable`);
    const i = o.index + o[0].length - 1;
    let depth = 0;
    for (let j = i; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}' && --depth === 0) return src.slice(i, j + 1);
    }
    throw new Error(`corps de ${signature} non fermé`);
  };

  const HOT: [string, RegExp][] = [
    ['sim/world.ts', /\n {2}step\(input: InputFrame\): void/],
    ['sim/world.ts', /\n {2}private firePlayer\(\): void/],
    ['sim/bullets.ts', /\n {2}step\(\): void/],
    ['sim/combat.ts', /export function resolveShots\(/],
    ['sim/combat.ts', /export function resolveBullets\(/],
    ['sim/items.ts', /\n {2}step\(p: PlayerState/],
    ['sim/enemy.ts', /export function stepEnemy\(/],
    ['sim/boss.ts', /export function stepBoss\(/],
    ['sim/patterns.ts', /export function firePattern\(/],
    ['sim/paths.ts', /export function stepPath\(/],
    ['sim/player.ts', /export function movePlayer\(/],
  ];
  it.each(HOT)('%s %s : ni new, ni closure, ni tableau temporaire', (file, sig) => {
    const raw = body(file, sig);
    const code = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/\bnew\s+[A-Z]/);
    expect(code).not.toMatch(/=>/);
    expect(code).not.toMatch(/\.(filter|map|forEach|reduce|slice|concat|flatMap)\(/);
    expect(code).not.toMatch(/Math\.hypot|\.\.\.\w/);
  });
});
