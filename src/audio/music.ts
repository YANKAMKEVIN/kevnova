import { Rng } from '../core/rng';
import type { AudioEngine } from './engine';

/** Une chanson générée : tempo, gamme, progression d'accords et densité rythmique. */
export interface SongDef {
  bpm: number;
  /** Note MIDI de la tonique. */
  root: number;
  /** Degrés (demi-tons depuis la tonique) des accords, un par mesure. */
  chords: number[];
  minor: boolean;
  drive: number;
  seed: number;
}

export const SONGS: Record<string, SongDef> = {
  titre: { bpm: 92, root: 50, chords: [0, 8, 3, 10], minor: true, drive: 0, seed: 11 },
  hangar: { bpm: 100, root: 53, chords: [0, 5, 9, 7], minor: false, drive: 0.3, seed: 12 },
  s0: { bpm: 132, root: 52, chords: [0, 8, 10, 7], minor: true, drive: 0.8, seed: 21 },
  s1: { bpm: 138, root: 54, chords: [0, 3, 8, 10], minor: true, drive: 0.8, seed: 22 },
  s2: { bpm: 144, root: 49, chords: [0, 10, 8, 7], minor: true, drive: 0.9, seed: 23 },
  s3: { bpm: 126, root: 51, chords: [0, 8, 5, 10], minor: true, drive: 0.7, seed: 24 },
  s4: { bpm: 148, root: 50, chords: [0, 1, 8, 7], minor: true, drive: 1, seed: 25 },
  boss: { bpm: 156, root: 48, chords: [0, 0, 1, 10], minor: true, drive: 1, seed: 31 },
  fin: { bpm: 96, root: 55, chords: [0, 9, 5, 7], minor: false, drive: 0.2, seed: 41 },
};

const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

/** Séquenceur à anticipation : programme les notes 150 ms à l'avance pour un tempo parfaitement stable. */
export class Music {
  private timer: ReturnType<typeof setInterval> | null = null;
  private song: SongDef | null = null;
  private step = 0;
  private nextTime = 0;
  private melody: number[] = [];
  current = '';

  constructor(private readonly audio: AudioEngine) {}

  play(name: string): void {
    if (this.current === name) return;
    this.stop();
    const def = SONGS[name];
    const ctx = this.audio.ctx;
    if (!def || !ctx) return;
    this.current = name;
    this.song = def;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.melody = makeMelody(def);
    this.timer = setInterval(() => this.schedule(), 30);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.song = null;
    this.current = '';
  }

  private schedule(): void {
    const ctx = this.audio.ctx;
    const s = this.song;
    if (!ctx || !s) return;
    const stepDur = 60 / s.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.playStep(s, this.step, this.nextTime - ctx.currentTime);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private playStep(s: SongDef, step: number, when: number): void {
    const a = this.audio;
    const bus = a.musicBus;
    const i = step % 16;
    const bar = Math.floor(step / 16) % s.chords.length;
    const root = s.root + s.chords[bar]!;
    const third = s.minor ? 3 : 4;
    const stepDur = 60 / s.bpm / 4;
    // Batterie
    if (s.drive > 0) {
      if (i % 4 === 0) a.tone(150, 0.16, 'sine', 0.5 * s.drive, 45, when, bus);
      if (i === 4 || i === 12) a.noiseBurst(0.14, 0.22 * s.drive, 1800, when, bus, 0.9);
      if (i % 2 === 1 || s.drive > 0.85) a.noiseBurst(0.035, 0.07 * s.drive, 8000, when, bus, 1.5);
    }
    // Basse
    if (s.drive > 0 ? i % 2 === 0 : i % 8 === 0) {
      const oct = s.drive > 0 && i % 4 === 2 ? 12 : 0;
      a.tone(midi(root - 24 + oct), stepDur * (s.drive > 0 ? 1.8 : 7), 'sawtooth', 0.11, undefined, when, bus);
    }
    // Arpège
    const arp = [0, third, 7, 12, third + 12, 7][i % 6]!;
    if (s.drive > 0.5 || i % 2 === 0) a.tone(midi(root + arp), stepDur * 0.9, 'square', 0.035, undefined, when, bus);
    // Nappe à chaque mesure
    if (i === 0) {
      for (const n of [0, third, 7]) a.tone(midi(root + n - 12), stepDur * 15, 'triangle', 0.05, undefined, when, bus);
    }
    // Mélodie
    const m = this.melody[step % this.melody.length]!;
    if (m >= 0) a.tone(midi(s.root + 12 + m), stepDur * 1.7, 'triangle', 0.075, undefined, when, bus);
  }
}

/** Mélodie déterministe tirée de la gamme (même chanson = même air à chaque partie). */
export function makeMelody(s: SongDef): number[] {
  const rng = new Rng(s.seed);
  const scale = s.minor ? [0, 2, 3, 5, 7, 8, 10, 12, 14, 15] : [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
  const out: number[] = [];
  let idx = 4;
  const length = 16 * s.chords.length * 2;
  for (let i = 0; i < length; i++) {
    const strong = i % 4 === 0;
    if (rng.chance(strong ? 0.75 : 0.28)) {
      idx = Math.max(0, Math.min(scale.length - 1, idx + rng.int(-2, 2)));
      out.push(scale[idx]!);
    } else {
      out.push(-1);
    }
  }
  return out;
}
