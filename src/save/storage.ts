import { migrate } from './migrations';
import { defaultSave, sanitize, SAVE_VERSION, type SaveData } from './schema';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'kevnova.save';
export const BACKUP_KEY = 'kevnova.save.bak';
export const CORRUPT_KEY = 'kevnova.save.corrupt';

/** Empreinte FNV-1a 32 bits : détecte une sauvegarde tronquée ou modifiée à la main. */
export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

interface Envelope {
  v: number;
  sum: string;
  data: string;
}

export function encode(save: SaveData): string {
  const data = JSON.stringify(save);
  const env: Envelope = { v: SAVE_VERSION, sum: checksum(data), data };
  return JSON.stringify(env);
}

/** Décode une enveloppe ; renvoie null si elle est illisible ou corrompue. Accepte aussi l'ancien format brut (v1). */
export function decode(text: string | null, now = 0): SaveData | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    let raw: Record<string, unknown>;
    if (typeof parsed.data === 'string' && typeof parsed.sum === 'string') {
      if (checksum(parsed.data) !== parsed.sum) return null;
      raw = JSON.parse(parsed.data) as Record<string, unknown>;
    } else {
      raw = parsed; // ancien format sans enveloppe
    }
    return sanitize(migrate(raw), now);
  } catch {
    return null;
  }
}

export type LoadSource = 'primary' | 'backup' | 'fresh';

/** Sauvegarde robuste : copie de secours, empreinte, migrations, et jamais d'exception vers le jeu. */
export class SaveStore {
  constructor(
    private readonly kv: KeyValueStore,
    private readonly clock: () => number = () => Date.now(),
  ) {}

  load(): { save: SaveData; source: LoadSource } {
    const now = this.clock();
    const primary = this.read(SAVE_KEY);
    const a = decode(primary, now);
    if (a) return { save: a, source: 'primary' };
    if (primary) this.safeSet(CORRUPT_KEY, primary);
    const b = decode(this.read(BACKUP_KEY), now);
    if (b) return { save: b, source: 'backup' };
    return { save: defaultSave(now), source: 'fresh' };
  }

  /** Écrit la sauvegarde ; l'ancienne version valide devient la copie de secours. */
  write(save: SaveData): boolean {
    save.updatedAt = this.clock();
    const text = encode(save);
    try {
      const prev = this.kv.getItem(SAVE_KEY);
      if (prev && decode(prev)) this.kv.setItem(BACKUP_KEY, prev);
      this.kv.setItem(SAVE_KEY, text);
      return true;
    } catch {
      return false;
    }
  }

  reset(): void {
    for (const k of [SAVE_KEY, BACKUP_KEY]) {
      try {
        this.kv.removeItem(k);
      } catch {
        /* stockage indisponible : rien à effacer */
      }
    }
  }

  private read(k: string): string | null {
    try {
      return this.kv.getItem(k);
    } catch {
      return null;
    }
  }

  private safeSet(k: string, v: string): void {
    try {
      this.kv.setItem(k, v);
    } catch {
      /* quota plein : on garde le jeu jouable */
    }
  }
}

/** Stockage en mémoire (tests, navigation privée sans localStorage). */
export class MemoryStore implements KeyValueStore {
  readonly map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}
