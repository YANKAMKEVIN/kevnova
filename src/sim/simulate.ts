import { Bot } from './bot';
import { NO_INPUT, type Difficulty, type InputFrame, type ShipId, type StageId, type StageResult, type Upgrades } from './types';
import { World } from './world';

export interface SimulateOptions {
  stage: StageId;
  ship: ShipId;
  difficulty: Difficulty;
  upgrades: Upgrades;
  seed: number;
  /** Pilote : par défaut le bot. */
  pilot?: (w: World) => InputFrame;
  maxFrames?: number;
}

/** Joue un secteur entier sans affichage (tests, équilibrage). */
export function simulateStage(o: SimulateOptions): { result: StageResult; world: World } {
  const world = new World(o);
  const bot = new Bot();
  const pilot = o.pilot ?? ((w: World) => bot.decide(w));
  const max = o.maxFrames ?? 60 * 60 * 6;
  while (!world.finished && world.frame < max) world.step(pilot(world) ?? NO_INPUT);
  return { result: world.result(), world };
}
