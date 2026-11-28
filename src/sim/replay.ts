import { Bot } from './bot';
import {
  NO_INPUT, NO_UPGRADES, type Difficulty, type InputFrame, type ShipId, type StageId, type StageResult, type Upgrades,
} from './types';
import { World, type WorldOptions } from './world';

/**
 * Rejeu déterministe : la simulation ne dépend que de la graine et des commandes.
 * On enregistre donc les commandes, image par image, sous une forme compacte (7 octets),
 * et rejouer la même liste sur la même graine redonne exactement la même partie.
 *
 * Les commandes sont quantifiées AVANT d'être données à la simulation (direction au 1/127,
 * cible tactile au 1/8 de pixel) : ce qui est enregistré est exactement ce qui a été joué.
 */
export const REPLAY_VERSION = 1;
const BYTES_PER_FRAME = 7;
const FLAG_FOCUS = 1;
const FLAG_BOMB = 2;
const FLAG_TARGET = 4;
const TARGET_SCALE = 8;

export interface Replay {
  version: number;
  opts: WorldOptions;
  frames: number;
  /** BYTES_PER_FRAME octets par image : dx, dy (int8), drapeaux, cible x, y (int16 petit-boutiste). */
  data: Uint8Array;
}

export class ReplayError extends Error {}

const clampInt = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : Math.round(v));

/** Enregistreur : `record` renvoie la commande quantifiée, à donner telle quelle à `World.step`. */
export class ReplayRecorder {
  private buf = new Uint8Array(BYTES_PER_FRAME * 60 * 60);
  private n = 0;
  private readonly out: InputFrame = { dx: 0, dy: 0, focus: false, bomb: false, target: null };
  private readonly target = { x: 0, y: 0 };

  constructor(readonly opts: WorldOptions) {}

  get frames(): number {
    return this.n;
  }

  record(input: InputFrame): InputFrame {
    if ((this.n + 1) * BYTES_PER_FRAME > this.buf.length) {
      const bigger = new Uint8Array(this.buf.length * 2); // rare : doublement toutes les quelques minutes de jeu
      bigger.set(this.buf);
      this.buf = bigger;
    }
    const o = this.n * BYTES_PER_FRAME;
    const qx = clampInt(input.dx * 127, -127, 127);
    const qy = clampInt(input.dy * 127, -127, 127);
    const t = input.target;
    const flags = (input.focus ? FLAG_FOCUS : 0) | (input.bomb ? FLAG_BOMB : 0) | (t ? FLAG_TARGET : 0);
    const tx = t ? clampInt(t.x * TARGET_SCALE, -32768, 32767) : 0;
    const ty = t ? clampInt(t.y * TARGET_SCALE, -32768, 32767) : 0;
    writeFrame(this.buf, o, qx, qy, flags, tx, ty);
    this.n++;
    return readFrame(this.buf, o, this.out, this.target);
  }

  finish(): Replay {
    return { version: REPLAY_VERSION, opts: { ...this.opts, upgrades: { ...this.opts.upgrades } }, frames: this.n, data: this.buf.slice(0, this.n * BYTES_PER_FRAME) };
  }
}

function writeFrame(b: Uint8Array, o: number, dx: number, dy: number, flags: number, tx: number, ty: number): void {
  b[o] = dx & 0xff;
  b[o + 1] = dy & 0xff;
  b[o + 2] = flags;
  b[o + 3] = tx & 0xff;
  b[o + 4] = (tx >> 8) & 0xff;
  b[o + 5] = ty & 0xff;
  b[o + 6] = (ty >> 8) & 0xff;
}

const int8 = (v: number): number => (v > 127 ? v - 256 : v);
const int16 = (lo: number, hi: number): number => {
  const v = lo | (hi << 8);
  return v > 32767 ? v - 65536 : v;
};

function readFrame(b: Uint8Array, o: number, out: InputFrame, target: { x: number; y: number }): InputFrame {
  out.dx = int8(b[o]!) / 127;
  out.dy = int8(b[o + 1]!) / 127;
  const flags = b[o + 2]!;
  out.focus = (flags & FLAG_FOCUS) !== 0;
  out.bomb = (flags & FLAG_BOMB) !== 0;
  if (flags & FLAG_TARGET) {
    target.x = int16(b[o + 3]!, b[o + 4]!) / TARGET_SCALE;
    target.y = int16(b[o + 5]!, b[o + 6]!) / TARGET_SCALE;
    out.target = target;
  } else {
    out.target = null;
  }
  return out;
}

/** Lecteur : rend la commande de l'image `i` (objet réutilisé). */
export class ReplayReader {
  private readonly out: InputFrame = { dx: 0, dy: 0, focus: false, bomb: false, target: null };
  private readonly target = { x: 0, y: 0 };
  constructor(private readonly replay: Replay) {}
  frame(i: number): InputFrame {
    if (i < 0 || i >= this.replay.frames) return NO_INPUT;
    return readFrame(this.replay.data, i * BYTES_PER_FRAME, this.out, this.target);
  }
}

/** Empreinte FNV-1a de l'état complet de la simulation (positions, balles, score, PRNG...). */
export function worldHash(w: World): string {
  let h = 0x811c9dc5;
  const mix = (v: number): void => {
    // Les positions sont des flottants : on mélange leur représentation exacte, pas une valeur arrondie.
    f64[0] = v;
    for (let k = 0; k < 8; k++) {
      h ^= u8[k]!;
      h = Math.imul(h, 0x01000193);
    }
  };
  const p = w.player;
  for (const v of [w.frame, w.score, w.shards, w.grazes, w.hits, w.kills, w.bombsUsed, w.rng.state]) mix(v);
  for (const v of [p.x, p.y, p.lives, p.bombs, p.shield, p.powerPts, p.nova, p.invuln]) mix(v);
  mix(w.bullets.count);
  for (let i = 0; i < w.bullets.count; i++) {
    mix(w.bullets.x[i]!);
    mix(w.bullets.y[i]!);
  }
  for (const e of w.enemies) {
    mix(e.x);
    mix(e.y);
    mix(e.hp);
  }
  if (w.boss) {
    mix(w.boss.x);
    mix(w.boss.y);
    mix(w.boss.hp);
    mix(w.boss.phaseIndex);
  }
  mix(w.items.items.length);
  mix(w.shots.items.length);
  return (h >>> 0).toString(16).padStart(8, '0');
}
const f64 = new Float64Array(1);
const u8 = new Uint8Array(f64.buffer);

export interface ReplayRun {
  result: StageResult;
  hash: string;
  world: World;
}

const MAX_FRAMES = 60 * 60 * 6;

/** Joue un secteur avec un pilote (le bot par défaut) en enregistrant ses commandes. */
export function recordStage(opts: WorldOptions, pilot?: (w: World) => InputFrame): ReplayRun & { replay: Replay } {
  const world = new World(opts);
  const bot = new Bot();
  const decide = pilot ?? ((w: World) => bot.decide(w));
  const rec = new ReplayRecorder(opts);
  while (!world.finished && world.frame < MAX_FRAMES) world.step(rec.record(decide(world) ?? NO_INPUT));
  return { result: world.result(), hash: worldHash(world), world, replay: rec.finish() };
}

/** Rejoue un enregistrement, sans pilote : seules les commandes enregistrées sont utilisées. */
export function playReplay(replay: Replay): ReplayRun {
  const world = new World(replay.opts);
  const reader = new ReplayReader(replay);
  for (let i = 0; i < replay.frames && !world.finished; i++) world.step(reader.frame(i));
  return { result: world.result(), hash: worldHash(world), world };
}

// --- Sérialisation texte (partage, fichiers de test) -------------------------------------------

const STAGE_IDS: readonly StageId[] = ['corail', 'givre', 'forge', 'abysse', 'couronne'];
const SHIP_IDS: readonly ShipId[] = ['etincelle', 'lance', 'gerbe'];
const DIFFS: readonly Difficulty[] = ['doux', 'normal', 'infernal'];
const UPGRADE_IDS = Object.keys(NO_UPGRADES) as (keyof Upgrades)[];

const toBase64 = (b: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromBase64 = (s: string): Uint8Array => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/** Format : « NSR1.<en-tête JSON en base64>.<commandes en base64> ». */
export function encodeReplay(r: Replay): string {
  const head = JSON.stringify({ v: r.version, ...r.opts, frames: r.frames });
  return `NSR${r.version}.${btoa(head)}.${toBase64(r.data)}`;
}

/** Décode un rejeu ; lève ReplayError s'il est illisible, incohérent ou d'une version inconnue. */
export function decodeReplay(text: string): Replay {
  const parts = text.trim().split('.');
  if (parts.length !== 3 || !/^NSR\d+$/.test(parts[0]!)) throw new ReplayError('format de rejeu inconnu');
  const version = Number(parts[0]!.slice(3));
  if (version !== REPLAY_VERSION) throw new ReplayError(`version de rejeu non prise en charge : ${version}`);
  let head: Record<string, unknown>;
  let data: Uint8Array;
  try {
    head = JSON.parse(atob(parts[1]!)) as Record<string, unknown>;
    data = fromBase64(parts[2]!);
  } catch {
    throw new ReplayError('rejeu corrompu');
  }
  const frames = head.frames;
  if (typeof frames !== 'number' || !Number.isInteger(frames) || frames < 0 || data.length !== frames * BYTES_PER_FRAME) {
    throw new ReplayError('nombre d’images incohérent');
  }
  if (!STAGE_IDS.includes(head.stage as StageId)) throw new ReplayError('secteur inconnu');
  if (!SHIP_IDS.includes(head.ship as ShipId)) throw new ReplayError('vaisseau inconnu');
  if (!DIFFS.includes(head.difficulty as Difficulty)) throw new ReplayError('difficulté inconnue');
  if (typeof head.seed !== 'number' || !Number.isFinite(head.seed)) throw new ReplayError('graine invalide');
  const up = (head.upgrades ?? {}) as Record<string, unknown>;
  const upgrades = {} as Upgrades;
  for (const id of UPGRADE_IDS) {
    const v = up[id];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 9) throw new ReplayError(`amélioration invalide : ${id}`);
    upgrades[id] = v;
  }
  return {
    version,
    opts: { stage: head.stage as StageId, ship: head.ship as ShipId, difficulty: head.difficulty as Difficulty, upgrades, seed: head.seed },
    frames,
    data,
  };
}
