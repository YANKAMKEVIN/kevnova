import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { BOSSES } from '../src/data/bosses';
import { BOSS_ENTRY_FRAMES, createBoss, currentPhase, damageBoss, isVulnerable, moveTarget, PHASE_TRANSITION_FRAMES, phaseMaxHp, phaseTimeLeft, stepBoss } from '../src/sim/boss';
import { BulletField } from '../src/sim/bullets';
import { FIELD_W, FPS, type BossId } from '../src/sim/types';

const ctx = () => ({ bullets: new BulletField(3000), rng: new Rng(1), scale: { speed: 1, density: 1, rate: 1 }, targetX: 180, targetY: 500 });
const enter = (id: BossId = 'faucheur') => {
  const b = createBoss(id);
  const c = ctx();
  for (let i = 0; i < BOSS_ENTRY_FRAMES; i++) stepBoss(b, c);
  return { b, c };
};

describe('boss', () => {
  it('entre invulnérable puis combat', () => {
    const b = createBoss('faucheur');
    expect(isVulnerable(b)).toBe(false);
    expect(damageBoss(b, 10)).toBe(false);
    const { b: b2 } = enter();
    expect(b2.stage).toBe('fighting');
    expect(damageBoss(b2, 10)).toBe(true);
    expect(b2.flash).toBeGreaterThan(0);
  });
  it('tire pendant le combat', () => {
    const { b, c } = enter();
    for (let i = 0; i < 120; i++) stepBoss(b, c);
    expect(c.bullets.count).toBeGreaterThan(0);
  });
  it('passe à la phase suivante quand ses PV tombent', () => {
    const { b, c } = enter();
    b.hp = 0;
    const r = stepBoss(b, c);
    expect(r.phaseEnded).toBe(true);
    expect(r.captured).toBe(true);
    expect(b.phaseIndex).toBe(1);
    expect(b.stage).toBe('transition');
    expect(b.hp).toBe(phaseMaxHp(b));
    for (let i = 0; i < PHASE_TRANSITION_FRAMES; i++) stepBoss(b, c);
    expect(b.stage).toBe('fighting');
  });
  it('pas de bonus de capture si le joueur a été touché', () => {
    const { b, c } = enter();
    b.hitsInPhase = 1;
    b.hp = 0;
    expect(stepBoss(b, c).captured).toBe(false);
  });
  it('une phase trop longue cède sans bonus', () => {
    const { b, c } = enter();
    let r = stepBoss(b, c);
    for (let i = 0; i < currentPhase(b).timeLimit * FPS + 5 && !r.phaseEnded; i++) r = stepBoss(b, c);
    expect(r.timedOut).toBe(true);
    expect(r.captured).toBe(false);
    expect(b.phaseIndex).toBe(1);
  });
  it('meurt après sa dernière phase', () => {
    const { b, c } = enter('archonte');
    b.phaseIndex = b.def.phases.length - 1;
    b.hp = 0;
    const r = stepBoss(b, c);
    expect(r.defeated).toBe(true);
    expect(b.stage).toBe('dying');
    for (let i = 0; i < 160; i++) stepBoss(b, c);
    expect(b.stage).toBe('dead');
    expect(stepBoss(b, c).phaseEnded).toBe(false);
  });
  it('le chrono de phase décroît', () => {
    const { b, c } = enter();
    const t0 = phaseTimeLeft(b);
    stepBoss(b, c);
    expect(phaseTimeLeft(b)).toBe(t0 - 1);
  });
  it.each(['hover', 'sweep', 'figure8', 'drift', 'charge'] as const)('le déplacement %s reste dans le terrain', (m) => {
    for (let t = 0; t < 3000; t += 7) {
      const p = moveTarget(m, t);
      expect(p.x).toBeGreaterThan(40);
      expect(p.x).toBeLessThan(FIELD_W - 40);
      expect(p.y).toBeGreaterThan(60);
      expect(p.y).toBeLessThan(260);
    }
  });
  it('les PV suivent l’échelle de difficulté', () => {
    expect(createBoss('fondeur', 2).hp).toBe(BOSSES.fondeur.phases[0]!.hp * 2);
  });
});
