import type { SimEvent } from '../sim/types';

/** Sons synthétisés en direct (Web Audio) : aucun fichier audio à télécharger. */
export class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  musicBus: GainNode | null = null;
  sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private lastPlay = new Map<string, number>();
  musicVolume = 0.7;
  sfxVolume = 0.8;

  /** À appeler sur un geste de l'utilisateur (règle des navigateurs). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.applyVolumes();
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (this.musicBus) this.musicBus.gain.value = this.musicVolume * 0.55;
    if (this.sfxBus) this.sfxBus.gain.value = this.sfxVolume * 0.7;
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    void this.ctx?.resume();
  }

  /** Empêche un même son de saturer quand 30 événements arrivent dans la même image. */
  private gate(name: string, ms: number): boolean {
    if (!this.ctx) return false;
    const now = this.ctx.currentTime * 1000;
    const last = this.lastPlay.get(name) ?? -1e9;
    if (now - last < ms) return false;
    this.lastPlay.set(name, now);
    return true;
  }

  tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, when = 0, bus = this.sfxBus): void {
    const ctx = this.ctx;
    if (!ctx || !bus) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noiseBurst(dur: number, vol: number, filterFreq: number, when = 0, bus = this.sfxBus, q = 0.8, sweepTo?: number): void {
    const ctx = this.ctx;
    if (!ctx || !bus || !this.noise) return;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(filterFreq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(gn).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  ui(kind: 'move' | 'ok' | 'back' | 'buy' | 'deny'): void {
    if (!this.ctx) return;
    if (kind === 'move') this.tone(880, 0.05, 'triangle', 0.08);
    if (kind === 'ok') {
      this.tone(660, 0.08, 'triangle', 0.12);
      this.tone(990, 0.12, 'triangle', 0.1, undefined, 0.06);
    }
    if (kind === 'back') this.tone(520, 0.1, 'triangle', 0.1, 330);
    if (kind === 'buy') [784, 988, 1319].forEach((f, i) => this.tone(f, 0.14, 'square', 0.06, undefined, i * 0.05));
    if (kind === 'deny') this.tone(180, 0.18, 'sawtooth', 0.08, 120);
  }

  shoot(): void {
    if (this.gate('shot', 85)) this.tone(1400, 0.04, 'square', 0.018, 900);
  }

  handle(e: SimEvent): void {
    if (!this.ctx) return;
    switch (e.type) {
      case 'explode':
        if (!this.gate('boom', e.size > 1.5 ? 0 : 45)) return;
        this.noiseBurst(0.25 + e.size * 0.2, 0.25 + e.size * 0.1, 900 - e.size * 150, 0, this.sfxBus, 0.7, 120);
        this.tone(140, 0.2 + e.size * 0.15, 'sine', 0.3, 40);
        break;
      case 'hit':
        if (this.gate('hit', 60)) this.tone(320 + Math.random() * 60, 0.03, 'square', 0.025);
        break;
      case 'graze':
        if (this.gate('graze', 40)) this.tone(2200 + Math.random() * 400, 0.05, 'sine', 0.05);
        break;
      case 'playerHit':
        this.noiseBurst(0.6, 0.5, 600, 0, this.sfxBus, 0.5, 80);
        this.tone(440, 0.5, 'sawtooth', 0.16, 80);
        break;
      case 'bomb':
        this.noiseBurst(1.1, 0.4, 300, 0, this.sfxBus, 0.6, 3000);
        this.tone(110, 1.0, 'sine', 0.35, 30);
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.08, undefined, i * 0.05));
        break;
      case 'pickup':
        if (this.gate('pickup', 50)) this.tone(e.kind === 'life' ? 660 : 1046, 0.1, 'triangle', 0.09, e.kind === 'life' ? 1320 : 1568);
        break;
      case 'powerUp':
        [523, 784, 1046, 1568].forEach((f, i) => this.tone(f, 0.12, 'square', 0.06, undefined, i * 0.045));
        break;
      case 'bossWarning':
        for (let i = 0; i < 3; i++) {
          this.tone(440, 0.3, 'sawtooth', 0.09, 660, i * 0.5);
          this.tone(445, 0.3, 'sawtooth', 0.07, 665, i * 0.5);
        }
        break;
      case 'bossPhase':
        this.tone(220, 0.5, 'sawtooth', 0.08, 440);
        break;
      case 'bossDefeated':
        this.noiseBurst(2.2, 0.55, 500, 0, this.sfxBus, 0.5, 60);
        this.tone(90, 1.8, 'sine', 0.45, 25);
        break;
      case 'cleared':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.1, undefined, i * 0.11));
        break;
      case 'gameOver':
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.45, 'triangle', 0.1, undefined, i * 0.2));
        break;
    }
  }
}
