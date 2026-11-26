import { STAGES } from '../data/stages';
import type { StageId } from '../sim/types';

/** Options d'URL : ?bot=1 (pilote automatique), ?speed=8 (accéléré), ?seed=42, ?stage=forge. Pour les tests et les démos. */
export interface GameParams {
  bot: boolean;
  speed: number;
  seed: number | null;
  stage: StageId | null;
  fresh: boolean;
}

export function parseParams(search: string): GameParams {
  const q = new URLSearchParams(search);
  const speed = Number(q.get('speed') ?? '1');
  const seed = q.get('seed');
  const stage = q.get('stage');
  return {
    bot: q.get('bot') === '1',
    speed: Number.isFinite(speed) ? Math.max(1, Math.min(32, Math.floor(speed))) : 1,
    seed: seed !== null && Number.isFinite(Number(seed)) ? Number(seed) : null,
    stage: STAGES.some((s) => s.id === stage) ? (stage as StageId) : null,
    fresh: q.get('fresh') === '1',
  };
}
