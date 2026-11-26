import { describe, expect, it } from 'vitest';
import { FutureSaveError, migrate } from '../src/save/migrations';
import { defaultSave, sanitize, SAVE_VERSION } from '../src/save/schema';
import { BACKUP_KEY, checksum, CORRUPT_KEY, decode, encode, MemoryStore, SAVE_KEY, SaveStore, type KeyValueStore } from '../src/save/storage';

const clock = () => 1_000;

describe('schéma', () => {
  it('la sauvegarde par défaut est déjà propre', () => {
    const d = defaultSave(5);
    expect(sanitize(d, 5)).toEqual(d);
    expect(d.version).toBe(SAVE_VERSION);
  });
  it('répare des données farfelues sans jamais planter', () => {
    const junk = [null, 42, 'texte', [], { settings: 'x', progress: { cleared: 'oui' }, upgrades: { canon: 99, nova: -3, inconnu: 2 } }];
    for (const j of junk) {
      const s = sanitize(j);
      expect(s.version).toBe(SAVE_VERSION);
      expect(s.upgrades.canon).toBeLessThanOrEqual(3);
      expect(s.upgrades.nova).toBeGreaterThanOrEqual(0);
      expect(s.progress.cleared).toEqual([]);
    }
  });
  it('borne les réglages et filtre les identifiants inconnus', () => {
    const s = sanitize({
      settings: { music: 7, sfx: -1, difficulty: 'cauchemar', touchSensitivity: 99, shake: 'non' },
      progress: { cleared: ['givre', 'atlantide', 'corail'], bestRank: { corail: 'S', givre: 'Z' }, bestScore: { corail: 12.7, forge: 'x' } },
      wallet: { shards: Infinity },
      ship: 'soucoupe',
    });
    expect(s.settings.music).toBe(1);
    expect(s.settings.sfx).toBe(0);
    expect(s.settings.difficulty).toBe('normal');
    expect(s.settings.touchSensitivity).toBe(2);
    expect(s.settings.shake).toBe(true);
    expect(s.progress.cleared).toEqual(['corail', 'givre']);
    expect(s.progress.bestRank).toEqual({ corail: 'S' });
    expect(s.progress.bestScore).toEqual({ corail: 12 });
    expect(s.wallet.shards).toBe(0);
    expect(s.ship).toBe('etincelle');
  });
});

describe('migrations', () => {
  it('v1 → v2 garde éclats, améliorations et progression', () => {
    const v1 = { version: 1, settings: { volume: 0.3, difficulty: 'infernal' }, unlocked: 2, shards: 340, upgrades: { canon: 2 } };
    const s = sanitize(migrate(v1));
    expect(s.wallet.shards).toBe(340);
    expect(s.upgrades.canon).toBe(2);
    expect(s.progress.cleared).toEqual(['corail', 'givre']);
    expect(s.settings.music).toBe(0.3);
    expect(s.settings.difficulty).toBe('infernal');
  });
  it('une sauvegarde sans version est traitée comme v1', () => {
    expect(sanitize(migrate({ shards: 10 })).wallet.shards).toBe(10);
  });
  it('refuse une version future', () => {
    expect(() => migrate({ version: SAVE_VERSION + 1 })).toThrow(FutureSaveError);
  });
});

describe('stockage', () => {
  it('aller-retour fidèle', () => {
    const d = defaultSave(1);
    d.wallet.shards = 77;
    expect(decode(encode(d))).toEqual(d);
  });
  it('détecte une modification à la main', () => {
    const env = JSON.parse(encode(defaultSave())) as { data: string; sum: string };
    env.data = env.data.replace('"shards":0', '"shards":99999');
    expect(decode(JSON.stringify(env))).toBeNull();
  });
  it('empreinte stable et sensible', () => {
    expect(checksum('abc')).toBe(checksum('abc'));
    expect(checksum('abc')).not.toBe(checksum('abd'));
    expect(checksum('')).toHaveLength(8);
  });
  it('JSON illisible → null', () => {
    expect(decode('{pas du json')).toBeNull();
    expect(decode(null)).toBeNull();
  });
  it('accepte l’ancien format brut', () => {
    expect(decode(JSON.stringify({ version: 1, shards: 5, unlocked: 0 }))?.wallet.shards).toBe(5);
  });
  it('partie neuve quand rien n’existe', () => {
    const r = new SaveStore(new MemoryStore(), clock).load();
    expect(r.source).toBe('fresh');
    expect(r.save.createdAt).toBe(1000);
  });
  it('écrit, relit, et garde l’ancienne version en secours', () => {
    const kv = new MemoryStore();
    const st = new SaveStore(kv, clock);
    const a = defaultSave();
    a.wallet.shards = 1;
    st.write(a);
    a.wallet.shards = 2;
    st.write(a);
    expect(st.load()).toMatchObject({ source: 'primary', save: { wallet: { shards: 2 } } });
    expect(decode(kv.getItem(BACKUP_KEY))?.wallet.shards).toBe(1);
    expect(a.updatedAt).toBe(1000);
  });
  it('sauvegarde principale corrompue → secours, et copie de la corrompue', () => {
    const kv = new MemoryStore();
    const st = new SaveStore(kv, clock);
    const a = defaultSave();
    a.wallet.shards = 10;
    st.write(a);
    a.wallet.shards = 20;
    st.write(a);
    kv.setItem(SAVE_KEY, kv.getItem(SAVE_KEY)!.slice(0, 40));
    const r = st.load();
    expect(r.source).toBe('backup');
    expect(r.save.wallet.shards).toBe(10);
    expect(kv.getItem(CORRUPT_KEY)).not.toBeNull();
  });
  it('tout est corrompu → partie neuve, sans exception', () => {
    const kv = new MemoryStore();
    kv.setItem(SAVE_KEY, 'x');
    kv.setItem(BACKUP_KEY, 'y');
    expect(new SaveStore(kv).load().source).toBe('fresh');
  });
  it('stockage plein ou interdit : le jeu continue', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('interdit');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('interdit');
      },
    };
    const st = new SaveStore(broken);
    expect(st.load().source).toBe('fresh');
    expect(st.write(defaultSave())).toBe(false);
    expect(() => st.reset()).not.toThrow();
  });
  it('reset efface principale et secours', () => {
    const kv = new MemoryStore();
    const st = new SaveStore(kv);
    st.write(defaultSave());
    st.write(defaultSave());
    st.reset();
    expect(kv.map.size).toBe(0);
  });
  it('une sauvegarde d’une version future n’écrase rien et repart de zéro', () => {
    const kv = new MemoryStore();
    kv.setItem(SAVE_KEY, JSON.stringify({ version: 99 }));
    const r = new SaveStore(kv).load();
    expect(r.source).toBe('fresh');
    expect(kv.getItem(CORRUPT_KEY)).toContain('99');
  });
});
