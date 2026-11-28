import { approach } from '../core/math';
import { BOSSES, type BossDef, type BossMove, type BossPhase } from '../data/bosses';
import { firePattern, shouldFire, type PatternContext } from './patterns';
import { FIELD_W, FPS, type BossId } from './types';

export const BOSS_ENTRY_FRAMES = 150;
export const PHASE_TRANSITION_FRAMES = 70;

export type BossStage = 'entering' | 'fighting' | 'transition' | 'dying' | 'dead';

export interface Boss {
  def: BossDef;
  x: number;
  y: number;
  phaseIndex: number;
  hp: number;
  /** Images écoulées dans la phase (ou l'état) courant. */
  t: number;
  /** Images écoulées depuis l'apparition (mouvement continu). */
  life: number;
  stage: BossStage;
  flash: number;
  /** Coups reçus par le joueur pendant la phase (bonus de capture si 0). */
  hitsInPhase: number;
  hpScale: number;
}

export function createBoss(id: BossId, hpScale = 1): Boss {
  const def = BOSSES[id];
  return {
    def,
    x: FIELD_W / 2,
    y: -def.size / 2,
    phaseIndex: 0,
    hp: Math.ceil((def.phases[0]?.hp ?? 1) * hpScale),
    t: 0,
    life: 0,
    stage: 'entering',
    flash: 0,
    hitsInPhase: 0,
    hpScale,
  };
}

export const currentPhase = (b: Boss): BossPhase => b.def.phases[b.phaseIndex] ?? b.def.phases[b.def.phases.length - 1]!;
export const phaseMaxHp = (b: Boss): number => Math.ceil(currentPhase(b).hp * b.hpScale);
export const phaseTimeLeft = (b: Boss): number => Math.max(0, currentPhase(b).timeLimit * FPS - b.t);
export const isVulnerable = (b: Boss): boolean => b.stage === 'fighting';

/** Point visé par chaque type de déplacement (le boss s'en approche en douceur). */
export function moveTarget(move: BossMove, t: number, out: { x: number; y: number } = { x: 0, y: 0 }): { x: number; y: number } {
  const cx = FIELD_W / 2;
  switch (move) {
    case 'hover':
      out.x = cx + Math.sin(t * 0.011) * 34;
      out.y = 120 + Math.sin(t * 0.017) * 10;
      break;
    case 'sweep':
      out.x = cx + Math.sin(t * 0.012) * 115;
      out.y = 112 + Math.sin(t * 0.024) * 8;
      break;
    case 'figure8':
      out.x = cx + Math.sin(t * 0.01) * 105;
      out.y = 135 + Math.sin(t * 0.02) * 38;
      break;
    case 'drift':
      out.x = cx + Math.sin(t * 0.007) * 85 + Math.sin(t * 0.019) * 25;
      out.y = 115 + Math.sin(t * 0.011) * 22;
      break;
    case 'charge': {
      const c = t % 300;
      const lunge = c > 200 ? Math.sin(((c - 200) / 100) * Math.PI) : 0;
      out.x = cx + Math.sin(t * 0.009) * 70;
      out.y = 115 + lunge * 110;
      break;
    }
  }
  return out;
}

/** Cible réutilisée par `stepBoss` (aucune allocation par image). */
const scratchTarget = { x: 0, y: 0 };

export interface BossStepResult {
  phaseEnded: boolean;
  captured: boolean;
  defeated: boolean;
  timedOut: boolean;
}

/** Avance le boss d'une image (déplacement, tirs, enchaînement des phases). */
export function stepBoss(
  b: Boss,
  ctx: PatternContext,
  res: BossStepResult = { phaseEnded: false, captured: false, defeated: false, timedOut: false },
): BossStepResult {
  res.phaseEnded = false;
  res.captured = false;
  res.defeated = false;
  res.timedOut = false;
  b.t++;
  b.life++;
  if (b.flash > 0) b.flash--;
  const phase = currentPhase(b);
  if (b.stage === 'entering') {
    b.y = approach(b.y, 120, 1.6);
    if (b.t >= BOSS_ENTRY_FRAMES) {
      b.stage = 'fighting';
      b.t = 0;
    }
    return res;
  }
  if (b.stage === 'dying') {
    b.y += 0.3;
    if (b.t > 150) b.stage = 'dead';
    return res;
  }
  if (b.stage === 'dead') return res;

  const target = moveTarget(phase.move, b.life, scratchTarget);
  b.x = approach(b.x, target.x, 2.2);
  b.y = approach(b.y, target.y, 2.2);

  if (b.stage === 'transition') {
    if (b.t >= PHASE_TRANSITION_FRAMES) {
      b.stage = 'fighting';
      b.t = 0;
    }
    return res;
  }

  for (const spec of phase.fire) {
    if (shouldFire(spec, b.t, ctx.scale.rate)) firePattern(ctx, spec, b.x, b.y, b.t);
  }

  const timedOut = b.t >= phase.timeLimit * FPS;
  if (b.hp <= 0 || timedOut) {
    res.phaseEnded = true;
    res.timedOut = timedOut && b.hp > 0;
    res.captured = !res.timedOut && b.hitsInPhase === 0;
    if (b.phaseIndex >= b.def.phases.length - 1) {
      b.stage = 'dying';
      b.hp = 0;
      res.defeated = true;
    } else {
      b.phaseIndex++;
      b.hp = phaseMaxHp(b);
      b.stage = 'transition';
    }
    b.t = 0;
    b.hitsInPhase = 0;
  }
  return res;
}

/** Inflige des dégâts ; renvoie true si le coup a porté. */
export function damageBoss(b: Boss, dmg: number): boolean {
  if (!isVulnerable(b)) return false;
  b.hp -= dmg;
  b.flash = 3;
  return true;
}
