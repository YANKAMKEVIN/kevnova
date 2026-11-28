import { describe, expect, it } from 'vitest';
import { STAGES } from '../src/data/stages';
import {
  decodeReplay, encodeReplay, playReplay, recordStage, ReplayError, ReplayReader, ReplayRecorder, REPLAY_VERSION, worldHash,
  type Replay,
} from '../src/sim/replay';
import { NO_UPGRADES, type InputFrame } from '../src/sim/types';
import { World, type WorldOptions } from '../src/sim/world';

const opts = (over: Partial<WorldOptions> = {}): WorldOptions => ({
  stage: 'corail', ship: 'etincelle', difficulty: 'normal', upgrades: NO_UPGRADES, seed: 7, ...over,
});

describe('enregistrement des commandes', () => {
  it('quantifie puis relit exactement ce qui a été joué', () => {
    const rec = new ReplayRecorder(opts());
    const inputs: InputFrame[] = [
      { dx: 1, dy: -1, focus: true, bomb: false, target: null },
      { dx: 0.3333, dy: 0.5, focus: false, bomb: true, target: null },
      { dx: 0, dy: 0, focus: false, bomb: false, target: { x: 123.456, y: 600.01 } },
      { dx: 5, dy: -9, focus: true, bomb: true, target: { x: -20, y: 9999 } },
    ];
    const played = inputs.map((i) => {
      const q = rec.record(i);
      return { ...q, target: q.target ? { ...q.target } : null };
    });
    const reader = new ReplayReader(rec.finish());
    played.forEach((p, i) => {
      const r = reader.frame(i);
      expect({ ...r, target: r.target ? { ...r.target } : null }).toEqual(p);
    });
    expect(played[0]).toMatchObject({ dx: 1, dy: -1, focus: true });
    expect(played[1]!.dx).toBeCloseTo(0.3333, 2);
    expect(played[2]!.target!.x).toBeCloseTo(123.456, 1);
    expect(played[3]).toMatchObject({ dx: 1, dy: -1, bomb: true }); // borné
    expect(reader.frame(99)).toMatchObject({ dx: 0, dy: 0, bomb: false });
  });
  it('agrandit son tampon pour les longues parties', () => {
    const rec = new ReplayRecorder(opts());
    for (let i = 0; i < 60 * 60 * 3; i++) rec.record({ dx: Math.sin(i), dy: 0, focus: false, bomb: false, target: null });
    const r = rec.finish();
    expect(r.frames).toBe(10800);
    expect(r.data.length).toBe(10800 * 7);
  });
});

describe('rejeu déterministe', () => {
  it('même graine + mêmes commandes = même partie, image par image', () => {
    const { replay, hash, result } = recordStage(opts({ seed: 21 }));
    const again = playReplay(replay);
    expect(again.hash).toBe(hash);
    expect(again.result).toEqual(result);
  });
  it('l’empreinte change si une seule commande change', () => {
    const { replay, hash } = recordStage(opts({ stage: 'givre', seed: 4 }));
    const data = replay.data.slice();
    const o = 7 * 400;
    data[o] = data[o] === 127 ? 129 : 127; // l'image 400 part dans l'autre sens (129 = -127 en int8)
    const altered = playReplay({ ...replay, data });
    expect(altered.hash).not.toBe(hash);
  });
  it('l’empreinte change si la graine change', () => {
    const { replay, hash } = recordStage(opts({ seed: 1 }));
    expect(playReplay({ ...replay, opts: { ...replay.opts, seed: 2 } }).hash).not.toBe(hash);
  });
  it('deux mondes identiques ont la même empreinte à chaque image', () => {
    const a = new World(opts());
    const b = new World(opts());
    const input: InputFrame = { dx: 0, dy: 0, focus: false, bomb: false, target: null };
    for (let i = 0; i < 3000; i++) {
      input.dx = Math.sin(i / 37);
      input.dy = Math.cos(i / 53) * 0.5;
      input.bomb = i % 900 === 450;
      a.step(input);
      b.step(input);
      if (i % 250 === 0) expect(worldHash(a)).toBe(worldHash(b));
    }
    expect(worldHash(a)).toBe(worldHash(b));
  });

  /**
   * Parcours complet headless : le bot joue chaque secteur en enregistrant ses commandes,
   * puis le rejeu (sans bot) doit terminer le secteur à l'identique.
   */
  it.each(STAGES.map((s) => s.id))('le rejeu du bot termine le secteur %s à l’identique', (stage) => {
    const rec = recordStage(opts({ stage, ship: 'lance', seed: 300 + stage.length }));
    expect(rec.result.cleared).toBe(true);
    const play = playReplay(decodeReplay(encodeReplay(rec.replay)));
    expect(play.result.cleared).toBe(true);
    expect(play.result).toEqual(rec.result);
    expect(play.hash).toBe(rec.hash);
  });
});

describe('format texte des rejeux', () => {
  const sample = (): Replay => recordStage(opts(), () => ({ dx: 0, dy: 0, focus: false, bomb: false, target: null })).replay;

  it('aller-retour sans perte', () => {
    const r = sample();
    const text = encodeReplay(r);
    expect(text.startsWith(`NSR${REPLAY_VERSION}.`)).toBe(true);
    const back = decodeReplay(text);
    expect(back.opts).toEqual(r.opts);
    expect(back.frames).toBe(r.frames);
    expect(Array.from(back.data)).toEqual(Array.from(r.data));
  });
  it.each([
    ['vide', ''],
    ['pas un rejeu', 'bonjour'],
    ['version future', 'NSR9.e30=.'],
    ['en-tête illisible', 'NSR1.@@@.AAAA'],
  ])('refuse un texte %s', (_n, text) => {
    expect(() => decodeReplay(text)).toThrow(ReplayError);
  });
  it('refuse un rejeu tronqué ou aux identifiants inconnus', () => {
    const text = encodeReplay(sample());
    const [tag, head, body] = text.split('.') as [string, string, string];
    expect(() => decodeReplay(`${tag}.${head}.${body.slice(0, -8)}`)).toThrow(/images/);
    const bad = (patch: Record<string, unknown>): string => {
      const h = { ...JSON.parse(atob(head)), ...patch };
      return `${tag}.${btoa(JSON.stringify(h))}.${body}`;
    };
    expect(() => decodeReplay(bad({ stage: 'lune' }))).toThrow(/secteur/);
    expect(() => decodeReplay(bad({ ship: 'soucoupe' }))).toThrow(/vaisseau/);
    expect(() => decodeReplay(bad({ difficulty: 'cauchemar' }))).toThrow(/difficulté/);
    expect(() => decodeReplay(bad({ seed: 'x' }))).toThrow(/graine/);
    expect(() => decodeReplay(bad({ upgrades: { ...NO_UPGRADES, canon: -1 } }))).toThrow(/amélioration/);
  });
});
