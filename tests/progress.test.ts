import { describe, expect, it } from 'vitest';
import { applyStageResult, buyUpgrade, isShipUnlocked, isStageUnlocked, nextStageToPlay, refundAll } from '../src/meta/progress';
import { defaultSave } from '../src/save/schema';
import { betterRank, computeRank, splitShards } from '../src/sim/scoring';
import type { StageResult } from '../src/sim/types';

const result = (over: Partial<StageResult> = {}): StageResult => ({
  stage: 'corail', cleared: true, score: 1000, shards: 50, grazes: 10, hits: 0, bombsUsed: 0, frames: 600, kills: 20, rank: 'S', ...over,
});

describe('hangar', () => {
  it('achète si les éclats suffisent', () => {
    const s = defaultSave();
    s.wallet.shards = 100;
    expect(buyUpgrade(s, 'canon')).toEqual({ ok: true, cost: 80 });
    expect(s.upgrades.canon).toBe(1);
    expect(s.wallet.shards).toBe(20);
    expect(buyUpgrade(s, 'canon')).toEqual({ ok: false, reason: 'funds' });
  });
  it('refuse au-delà du niveau max', () => {
    const s = defaultSave();
    s.wallet.shards = 1e6;
    for (let i = 0; i < 2; i++) buyUpgrade(s, 'satellites');
    expect(buyUpgrade(s, 'satellites')).toEqual({ ok: false, reason: 'max' });
  });
  it('rembourse tout', () => {
    const s = defaultSave();
    s.wallet.shards = 1000;
    buyUpgrade(s, 'canon');
    buyUpgrade(s, 'canon');
    buyUpgrade(s, 'aimant');
    expect(refundAll(s)).toBe(80 + 180 + 50);
    expect(s.wallet.shards).toBe(1000);
    expect(s.upgrades.canon).toBe(0);
  });
});

describe('progression', () => {
  it('le secteur 1 est ouvert, les suivants se débloquent dans l’ordre', () => {
    const s = defaultSave();
    expect(isStageUnlocked(s, 'corail')).toBe(true);
    expect(isStageUnlocked(s, 'givre')).toBe(false);
    applyStageResult(s, result());
    expect(isStageUnlocked(s, 'givre')).toBe(true);
    expect(isStageUnlocked(s, 'forge')).toBe(false);
    expect(isStageUnlocked(s, 'inconnu' as never)).toBe(false);
  });
  it('débloque la Lance après le secteur 2', () => {
    const s = defaultSave();
    expect(isShipUnlocked(s, 'etincelle')).toBe(true);
    expect(isShipUnlocked(s, 'lance')).toBe(false);
    applyStageResult(s, result());
    const out = applyStageResult(s, result({ stage: 'givre' }));
    expect(out.unlockedShips).toEqual(['lance']);
    expect(isShipUnlocked(s, 'lance')).toBe(true);
    expect(isShipUnlocked(s, 'x' as never)).toBe(false);
  });
  it('les éclats sont gagnés même en cas d’échec', () => {
    const s = defaultSave();
    const out = applyStageResult(s, result({ cleared: false, rank: 'C', shards: 33 }));
    expect(s.wallet.shards).toBe(33);
    expect(out.newlyCleared).toBe(false);
    expect(s.progress.cleared).toEqual([]);
    expect(s.progress.plays).toBe(1);
  });
  it('garde le meilleur score et le meilleur rang', () => {
    const s = defaultSave();
    applyStageResult(s, result({ score: 500, rank: 'B' }));
    const out = applyStageResult(s, result({ score: 400, rank: 'S' }));
    expect(out.newBest).toBe(false);
    expect(s.progress.bestScore.corail).toBe(500);
    expect(s.progress.bestRank.corail).toBe('S');
    applyStageResult(s, result({ score: 900, rank: 'A' }));
    expect(s.progress.bestRank.corail).toBe('S');
    expect(s.progress.bestScore.corail).toBe(900);
  });
  it('les secteurs terminés restent dans l’ordre du jeu', () => {
    const s = defaultSave();
    applyStageResult(s, result({ stage: 'givre' }));
    applyStageResult(s, result({ stage: 'corail' }));
    expect(s.progress.cleared).toEqual(['corail', 'givre']);
  });
  it('campagne complète et prochain secteur', () => {
    const s = defaultSave();
    expect(nextStageToPlay(s)).toBe('corail');
    let out = applyStageResult(s, result());
    for (const id of ['givre', 'forge', 'abysse', 'couronne'] as const) out = applyStageResult(s, result({ stage: id }));
    expect(out.campaignComplete).toBe(true);
    expect(nextStageToPlay(s)).toBe('couronne');
    expect(s.stats.kills).toBe(100);
    expect(s.stats.seconds).toBe(50);
  });
});

describe('score', () => {
  it.each([
    [0, 0, true, 'S'],
    [0, 2, true, 'A'],
    [1, 0, true, 'A'],
    [3, 0, true, 'B'],
    [4, 0, true, 'C'],
    [0, 0, false, 'C'],
  ] as const)('%d coups, %d bombes, terminé %s → %s', (h, b, c, r) => expect(computeRank(h, b, c)).toBe(r));
  it('betterRank', () => {
    expect(betterRank(null, 'C')).toBe('C');
    expect(betterRank('A', 'B')).toBe('A');
    expect(betterRank('A', 'S')).toBe('S');
  });
  it('splitShards', () => {
    expect(splitShards(13)).toEqual({ big: 2, small: 3 });
    expect(splitShards(0)).toEqual({ big: 0, small: 0 });
  });
});
