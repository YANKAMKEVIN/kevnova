import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { BOSSES } from '../src/data/bosses';
import { stageById, STAGES } from '../src/data/stages';
import { BOSS_ENTRY_FRAMES, PHASE_TRANSITION_FRAMES } from '../src/sim/boss';
import { BulletField } from '../src/sim/bullets';
import { resolveBullets } from '../src/sim/combat';
import type { Enemy } from '../src/sim/enemy';
import { EventPool } from '../src/sim/events';
import { ItemField } from '../src/sim/items';
import { DIFFICULTY, firePattern, type PatternContext } from '../src/sim/patterns';
import { createPlayer, GRAZE_RADIUS, HITBOX_RADIUS, MAX_BOMBS, NOVA_MAX } from '../src/sim/player';
import { CAPTURE_BONUS, GRAZE_NOVA, GRAZE_SCORE, LIFE_BONUS, NO_HIT_BONUS } from '../src/sim/scoring';
import { satelliteOffsets, ShotKind, ShotPool, volley } from '../src/sim/shots';
import {
  BULLET_RADIUS, BulletColor, BulletKind, FPS, NO_INPUT, NO_UPGRADES, type BossId, type FireSpec, type PatternId, type SimEvent,
} from '../src/sim/types';
import { buildSchedule, World } from '../src/sim/world';

const ALL_PATTERNS: PatternId[] = ['aimed', 'fan', 'ring', 'spiral', 'flower', 'random', 'wall', 'stack'];
const ctx = (seed = 1, diff: keyof typeof DIFFICULTY = 'normal'): PatternContext => ({
  bullets: new BulletField(800), rng: new Rng(seed), scale: DIFFICULTY[diff], targetX: 200, targetY: 520,
});
const spec = (pattern: PatternId): FireSpec => ({
  pattern, every: 20, speed: 2.4, kind: BulletKind.Rice, color: BulletColor.Ice, n: 9, spread: 1.2, spin: 0.07, accel: 0.01, maxSpeed: 4,
});
const snapshot = (b: BulletField): number[] => {
  const out: number[] = [];
  for (let i = 0; i < b.count; i++) out.push(b.x[i]!, b.y[i]!, b.ang[i]!, b.spd[i]!, b.acc[i]!, b.angVel[i]!, b.maxSpd[i]!);
  return out;
};

describe('motifs de tir déterministes', () => {
  it.each(ALL_PATTERNS)('%s : même graine → balles identiques au bit près, sur 120 images', (p) => {
    const run = (): number[] => {
      const c = ctx(42);
      for (let t = 0; t < 120; t++) {
        if (t % 20 === 0) firePattern(c, spec(p), 180, 90, t);
        c.bullets.step();
      }
      return snapshot(c.bullets);
    };
    const a = run();
    expect(a.length).toBeGreaterThan(0);
    expect(run()).toEqual(a);
  });
  it('seuls « random » et « wall » consomment le hasard', () => {
    for (const p of ALL_PATTERNS) {
      const c = ctx(1);
      firePattern(c, spec(p), 180, 90, 0);
      const used = c.rng.state !== new Rng(1).state;
      expect(used, p).toBe(p === 'random' || p === 'wall');
    }
  });
  it('un anneau répartit ses balles à intervalles égaux', () => {
    const c = ctx();
    const n = firePattern(c, { ...spec('ring'), spin: 0 }, 180, 100, 0);
    const step = (Math.PI * 2) / n;
    for (let i = 1; i < n; i++) expect(c.bullets.ang[i]! - c.bullets.ang[i - 1]!).toBeCloseTo(step, 4);
  });
  it('une salve visée est centrée sur le joueur', () => {
    const c = ctx();
    const n = firePattern(c, { ...spec('aimed'), n: 5 }, 180, 100, 0);
    const mid = c.bullets.ang[(n - 1) / 2]!;
    expect(mid).toBeCloseTo(Math.atan2(520 - 100, 200 - 180), 4);
  });
  it('la densité suit la difficulté (Doux < Normal < Infernal)', () => {
    for (const p of ALL_PATTERNS) {
      const count = (d: keyof typeof DIFFICULTY): number => firePattern(ctx(3, d), spec(p), 180, 90, 0);
      expect(count('doux'), p).toBeLessThanOrEqual(count('normal'));
      expect(count('normal'), p).toBeLessThanOrEqual(count('infernal'));
    }
  });
});

describe('hitbox et frôlement au pixel près', () => {
  const at = (dist: number, kind = BulletKind.Orb) => {
    const p = createPlayer('etincelle', NO_UPGRADES);
    p.invuln = 0;
    const b = new BulletField(4);
    b.spawn(p.x + dist, p.y, 0, 0, kind, BulletColor.Magenta);
    let grazes = 0;
    const r = resolveBullets(b, p, () => grazes++);
    return { hit: r.hit, grazes };
  };
  it.each([BulletKind.Small, BulletKind.Orb, BulletKind.Big])('balle de type %s', (kind) => {
    const r = BULLET_RADIUS[kind]!;
    expect(at(r + HITBOX_RADIUS - 0.05, kind).hit).toBe(true);
    expect(at(r + HITBOX_RADIUS + 0.05, kind)).toEqual({ hit: false, grazes: 1 });
    expect(at(r + GRAZE_RADIUS - 0.05, kind)).toEqual({ hit: false, grazes: 1 });
    expect(at(r + GRAZE_RADIUS + 0.05, kind)).toEqual({ hit: false, grazes: 0 });
  });
  it('la hitbox est minuscule devant le sprite (règle du genre)', () => {
    expect(HITBOX_RADIUS).toBeLessThan(4);
    expect(GRAZE_RADIUS).toBeGreaterThan(HITBOX_RADIUS * 4);
  });
});

describe('score, frôlements et Nova dans le monde', () => {
  const world = (seed = 1) => {
    const w = new World({ stage: 'corail', ship: 'etincelle', difficulty: 'normal', upgrades: NO_UPGRADES, seed });
    w.step(NO_INPUT);
    w.player.invuln = 0;
    return w;
  };
  it('chaque frôlement rapporte du score et remplit la jauge Nova', () => {
    const w = world();
    const p = w.player;
    const s0 = w.score;
    w.bullets.spawn(p.x + 10, p.y, 0, 0, BulletKind.Small, BulletColor.Magenta);
    w.step(NO_INPUT);
    expect(w.grazes).toBe(1);
    expect(w.score - s0).toBeGreaterThanOrEqual(GRAZE_SCORE);
    expect(p.nova).toBeCloseTo(GRAZE_NOVA);
  });
  it('jauge pleine : une bombe offerte, plafonnée', () => {
    const w = world();
    const p = w.player;
    p.nova = NOVA_MAX - 0.1;
    p.bombs = 1;
    w.bullets.spawn(p.x + 10, p.y, 0, 0, BulletKind.Small, BulletColor.Magenta);
    w.step(NO_INPUT);
    expect(p.bombs).toBe(2);
    expect(p.nova).toBe(0);
    p.bombs = MAX_BOMBS;
    p.nova = NOVA_MAX;
    w.step(NO_INPUT);
    expect(p.bombs).toBe(MAX_BOMBS);
  });
  it('une Nova coûte une bombe, efface les balles en étoiles et protège', () => {
    const w = world();
    for (let i = 0; i < 50; i++) w.bullets.spawn(30 + i * 6, 200, Math.PI / 2, 0.1, BulletKind.Orb, BulletColor.Gold);
    const bombs = w.player.bombs;
    w.step({ ...NO_INPUT, bomb: true });
    expect(w.player.bombs).toBe(bombs - 1);
    expect(w.bombsUsed).toBe(1);
    expect(w.bullets.count).toBe(0);
    expect(w.items.items.filter((i) => i.kind === 'star').length).toBeGreaterThan(10);
    expect(w.player.invuln).toBeGreaterThan(100);
    w.step({ ...NO_INPUT, bomb: true }); // pas deux Novas d'affilée pendant l'onde de choc
    expect(w.bombsUsed).toBe(1);
  });
  it('vaincre le boss sans être touché : bonus sans faute, vies restantes, capture et prime', () => {
    const w = world();
    while (w.phase !== 'boss') {
      w.player.invuln = 1e9;
      w.step(NO_INPUT);
    }
    const b = w.boss!;
    while (b.stage !== 'fighting') w.step(NO_INPUT);
    b.phaseIndex = b.def.phases.length - 1;
    b.hitsInPhase = 0;
    b.hp = 0;
    const s0 = w.score;
    w.step(NO_INPUT);
    expect(w.phase).toBe('clearing');
    const expected = NO_HIT_BONUS + w.player.lives * LIFE_BONUS + b.def.score + CAPTURE_BONUS * b.def.phases.length;
    expect(w.score - s0).toBeGreaterThanOrEqual(expected);
    expect(w.result()).toMatchObject({ cleared: true, rank: 'S', hits: 0 });
  });
  it('être touché coûte une vie, de la puissance, et donne une invulnérabilité', () => {
    const w = world();
    const p = w.player;
    p.powerPts = 250;
    const lives = p.lives;
    w.bullets.spawn(p.x, p.y, 0, 0, BulletKind.Orb, BulletColor.Magenta);
    w.step(NO_INPUT);
    expect(p.lives).toBe(lives - 1);
    expect(p.powerPts).toBe(150);
    expect(w.hits).toBe(1);
    expect(w.bullets.count).toBe(0);
    expect(p.invuln).toBeGreaterThan(100);
    expect(w.items.items.filter((i) => i.kind === 'power')).toHaveLength(4);
  });
});

describe('boss : toutes les phases de tous les boss s’enchaînent', () => {
  it.each(Object.keys(BOSSES) as BossId[])('%s', (id) => {
    const stage = STAGES.find((s) => s.boss === id)!;
    const w = new World({ stage: stage.id, ship: 'etincelle', difficulty: 'normal', upgrades: NO_UPGRADES, seed: 5 });
    const names: string[] = [];
    let guard = 0;
    while (!w.finished && guard++ < 200 * FPS) {
      w.player.invuln = 1e9;
      w.step(NO_INPUT);
      for (const e of w.events) if (e.type === 'bossPhase') names.push(e.name);
      // Dès qu'une phase combat depuis 1 s, on la termine (les tirs du joueur suffiraient, mais plus lentement).
      if (w.boss && w.boss.stage === 'fighting' && w.boss.t === FPS) w.boss.hp = 0;
    }
    expect(w.phase).toBe('cleared');
    expect(names).toEqual(BOSSES[id].phases.map((p) => p.name));
    expect(BOSSES[id].phases.length).toBeGreaterThanOrEqual(3);
    expect(w.frame).toBeGreaterThan(BOSS_ENTRY_FRAMES + (names.length - 1) * PHASE_TRANSITION_FRAMES);
  });
});

describe('vagues', () => {
  it.each(STAGES.map((s) => s.id))('%s : chaque ennemi prévu apparaît exactement une fois', (id) => {
    const w = new World({ stage: id, ship: 'etincelle', difficulty: 'normal', upgrades: NO_UPGRADES, seed: 2 });
    const seen = new Set<Enemy>();
    while (w.phase === 'waves') {
      w.player.invuln = 1e9;
      w.step(NO_INPUT);
      for (const e of w.enemies) seen.add(e);
    }
    expect(seen.size).toBe(buildSchedule(stageById(id)).length);
  });
});

describe('recyclage (aucune allocation en jeu)', () => {
  it('un objet ramassé est réutilisé et remis à neuf', () => {
    const items = new ItemField();
    const p = createPlayer('etincelle', NO_UPGRADES);
    items.spawn(p.x, p.y, 'shard', 0, true);
    const first = items.items[0]!;
    items.step(p, true, () => undefined);
    expect(items.items).toHaveLength(0);
    items.spawn(10, 300, 'power', 0, false);
    expect(items.items[0]).toBe(first);
    expect(items.items[0]).toMatchObject({ x: 10, y: 300, kind: 'power', homing: false, alive: true });
  });
  it('les tirs du joueur sont recyclés', () => {
    const shots = new ShotPool();
    const s = shots.spawn(0, 0, 0, 0, 1, ShotKind.Main);
    shots.clear();
    expect(shots.spawn(5, 5, 0, -1, 2, ShotKind.Needle)).toBe(s);
    expect(s).toMatchObject({ x: 5, dmg: 2, kind: ShotKind.Needle, alive: true, age: 0 });
  });
  it('salves et satellites sont mémorisés et non modifiables', () => {
    expect(volley('gerbe', 3, true)).toBe(volley('gerbe', 3, true));
    expect(volley('gerbe', 3, true)).not.toBe(volley('gerbe', 3, false));
    expect(Object.isFrozen(volley('lance', 5, false))).toBe(true);
    expect(satelliteOffsets(2, false)).toBe(satelliteOffsets(5, false));
    expect(Object.isFrozen(satelliteOffsets(1, true))).toBe(true);
  });
  it('la réserve d’événements donne des objets distincts dans une image et les recycle à la suivante', () => {
    const pool = new EventPool();
    const a = pool.explode(1, 2, 1, BulletColor.Gold);
    const b = pool.explode(3, 4, 2, BulletColor.Ice);
    expect(a).not.toBe(b);
    expect(a).toMatchObject({ type: 'explode', x: 1, y: 2, size: 1, color: BulletColor.Gold });
    const h = pool.hit(5, 6);
    const g = pool.graze(7, 8);
    pool.reset();
    expect(pool.explode(9, 9, 3, BulletColor.Magenta)).toBe(a);
    expect(pool.hit(0, 0)).toBe(h);
    expect(pool.graze(0, 0)).toBe(g);
  });
  it('le monde vide ses événements à chaque image', () => {
    const w = new World({ stage: 'corail', ship: 'etincelle', difficulty: 'normal', upgrades: NO_UPGRADES, seed: 1 });
    const all: SimEvent[][] = [];
    for (let i = 0; i < 600; i++) {
      w.step(NO_INPUT);
      all.push([...w.events]);
      expect(new Set(w.events).size).toBe(w.events.length); // jamais deux fois le même objet dans une image
    }
    expect(all.some((e) => e.length > 0)).toBe(true);
  });
});
