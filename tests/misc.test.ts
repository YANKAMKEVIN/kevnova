import { describe, expect, it } from 'vitest';
import { makeMelody, SONGS } from '../src/audio/music';
import { parseParams } from '../src/game/params';
import { PerfGovernor } from '../src/game/perf';
import { deadzone, dragTarget } from '../src/input/touch';

describe('tactile', () => {
  it('le glisser est relatif à la position de départ', () => {
    const start = { fingerX: 100, fingerY: 500, shipX: 180, shipY: 550 };
    expect(dragTarget(start, 120, 480, 1)).toEqual({ x: 200, y: 530 });
    expect(dragTarget(start, 120, 480, 1.5)).toEqual({ x: 210, y: 520 });
  });
  it('zone morte des sticks', () => {
    expect(deadzone(0.1)).toBe(0);
    expect(deadzone(-0.1)).toBe(0);
    expect(deadzone(1)).toBeCloseTo(1);
    expect(deadzone(-1)).toBeCloseTo(-1);
    expect(deadzone(0.59)).toBeCloseTo(0.5, 1);
  });
});

describe('paramètres d’URL', () => {
  it('lit bot, vitesse, graine et secteur', () => {
    expect(parseParams('?bot=1&speed=8&seed=42&stage=forge&fresh=1')).toEqual({ bot: true, speed: 8, seed: 42, stage: 'forge', fresh: true });
  });
  it('valeurs absentes ou invalides', () => {
    expect(parseParams('')).toEqual({ bot: false, speed: 1, seed: null, stage: null, fresh: false });
    expect(parseParams('?speed=999&stage=lune&seed=abc').speed).toBe(32);
    expect(parseParams('?speed=abc').speed).toBe(1);
    expect(parseParams('?stage=lune').stage).toBeNull();
  });
});

describe('gouverneur de performance', () => {
  it('garde la qualité à 60 i/s', () => {
    const g = new PerfGovernor();
    for (let i = 0; i < 400; i++) expect(g.sample(16.7)).toBe(false);
    expect(g.level).toBe(0);
    expect(g.fps).toBeCloseTo(60, 0);
  });
  it('baisse la résolution si l’appareil peine, deux crans au plus', () => {
    const g = new PerfGovernor();
    let changes = 0;
    for (let i = 0; i < 2000; i++) if (g.sample(33)) changes++;
    expect(changes).toBe(2);
    expect(g.quality).toBeLessThan(0.7);
  });
});

describe('musique', () => {
  it('mélodies déterministes et dans la gamme', () => {
    for (const s of Object.values(SONGS)) {
      const a = makeMelody(s);
      expect(a).toEqual(makeMelody(s));
      expect(a.length).toBe(16 * s.chords.length * 2);
      expect(a.some((n) => n >= 0)).toBe(true);
      expect(Math.max(...a)).toBeLessThanOrEqual(16);
    }
  });
  it('une chanson par secteur, plus titre, hangar, boss et fin', () => {
    for (const k of ['titre', 'hangar', 's0', 's1', 's2', 's3', 's4', 'boss', 'fin']) expect(SONGS[k]).toBeDefined();
  });
});
