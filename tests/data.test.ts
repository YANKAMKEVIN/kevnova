import { describe, expect, it } from 'vitest';
import { BOSSES } from '../src/data/bosses';
import { AFTER, BEFORE, INTRO, SPEAKERS } from '../src/data/dialogues';
import { ENEMIES } from '../src/data/enemies';
import { SHIPS, shipById } from '../src/data/ships';
import { nextStage, stageById, STAGES } from '../src/data/stages';
import { maxLevel, nextCost, upgradeById, UPGRADES } from '../src/data/upgrades';
import { IMAGE_NAMES } from '../src/render/assets';
import { BULLET_COLORS, BULLET_KINDS } from '../src/sim/types';

const images = new Set<string>(IMAGE_NAMES);

describe('données du jeu', () => {
  it('5 secteurs dans l’ordre, chacun avec son boss', () => {
    expect(STAGES.map((s) => s.index)).toEqual([0, 1, 2, 3, 4]);
    for (const s of STAGES) {
      expect(BOSSES[s.boss]).toBeDefined();
      expect(images.has(s.background)).toBe(true);
      expect(images.has(s.deco)).toBe(true);
      expect(s.waves.length).toBeGreaterThan(8);
    }
    expect(new Set(STAGES.map((s) => s.boss)).size).toBe(5);
  });
  it('les vagues utilisent des ennemis connus et des positions valides', () => {
    for (const s of STAGES)
      for (const w of s.waves) {
        expect(ENEMIES[w.enemy]).toBeDefined();
        expect(w.x).toBeGreaterThanOrEqual(0);
        expect(w.x).toBeLessThanOrEqual(1);
        expect(w.at).toBeLessThan(s.duration);
        expect(w.count).toBeGreaterThan(0);
        expect(w.path.speed).toBeGreaterThan(0);
      }
  });
  it('chaque ennemi a un sprite, des PV et des tirs valides', () => {
    for (const e of Object.values(ENEMIES)) {
      expect(images.has(e.sprite)).toBe(true);
      expect(e.hp).toBeGreaterThan(0);
      expect(e.radius).toBeLessThan(e.size);
      for (const f of e.fire) {
        expect(f.kind).toBeLessThan(BULLET_KINDS);
        expect(f.color).toBeLessThan(BULLET_COLORS);
        expect(f.every).toBeGreaterThan(0);
      }
    }
  });
  it('chaque boss a au moins 3 phases nommées, des PV et un chrono', () => {
    for (const b of Object.values(BOSSES)) {
      expect(images.has(b.sprite)).toBe(true);
      expect(b.phases.length).toBeGreaterThanOrEqual(3);
      for (const p of b.phases) {
        expect(p.name.length).toBeGreaterThan(2);
        expect(p.hp).toBeGreaterThan(0);
        expect(p.timeLimit).toBeGreaterThanOrEqual(20);
        expect(p.fire.length).toBeGreaterThan(0);
      }
    }
    expect(BOSSES.archonte.phases.length).toBe(5);
  });
  it('les boss sont de plus en plus coriaces', () => {
    const totals = STAGES.map((s) => BOSSES[s.boss].phases.reduce((a, p) => a + p.hp, 0));
    for (let i = 1; i < totals.length; i++) expect(totals[i]!).toBeGreaterThan(totals[i - 1]!);
  });
  it('vaisseaux : 3, uniques, déblocages valides', () => {
    expect(SHIPS).toHaveLength(3);
    expect(new Set(SHIPS.map((s) => s.id)).size).toBe(3);
    for (const s of SHIPS) {
      expect(images.has(s.sprite)).toBe(true);
      expect(s.focusSpeed).toBeLessThan(s.speed);
      if (s.unlockAfter) expect(stageById(s.unlockAfter)).toBeDefined();
    }
    expect(shipById('lance').name).toBe('Lance');
    expect(() => shipById('nope' as never)).toThrow();
  });
  it('améliorations : coûts croissants, icônes présentes', () => {
    for (const u of UPGRADES) {
      expect(images.has(u.icon)).toBe(true);
      for (let i = 1; i < u.costs.length; i++) expect(u.costs[i]!).toBeGreaterThan(u.costs[i - 1]!);
      expect(maxLevel(u.id)).toBe(u.costs.length);
      expect(nextCost(u.id, u.costs.length)).toBeNull();
    }
    expect(upgradeById('nova').name).toContain('Nova');
    expect(() => upgradeById('x' as never)).toThrow();
  });
  it('dialogues : un avant et un après pour chaque secteur, personnages connus', () => {
    for (const s of STAGES) {
      expect(BEFORE[s.id].length).toBeGreaterThan(0);
      expect(AFTER[s.id].length).toBeGreaterThan(0);
    }
    for (const l of [...INTRO, ...Object.values(BEFORE).flat(), ...Object.values(AFTER).flat()]) {
      expect(SPEAKERS[l.who]).toBeDefined();
      expect(l.text.length).toBeGreaterThan(5);
    }
    for (const sp of Object.values(SPEAKERS)) expect(images.has(sp.portrait)).toBe(true);
  });
  it('nextStage et stageById', () => {
    expect(nextStage('corail')?.id).toBe('givre');
    expect(nextStage('couronne')).toBeNull();
    expect(() => stageById('x' as never)).toThrow();
  });
});
