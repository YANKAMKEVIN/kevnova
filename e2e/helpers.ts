import { expect, type Page } from '@playwright/test';

export interface Debug {
  state: string;
  stage: string;
  fps: number;
  world: { phase: string; frame: number; score: number; bullets: number; lives: number; bombs: number; bombsUsed: number; focus: boolean; x: number; y: number } | null;
  save: { progress: { cleared: string[]; bestScore: Record<string, number> }; wallet: { shards: number }; upgrades: Record<string, number>; ship: string };
  imagesLoaded: number;
}

export const debug = (page: Page): Promise<Debug> =>
  page.evaluate(() => (window as unknown as { __kevnova: { debug(): unknown } }).__kevnova.debug() as Debug);

export async function waitState(page: Page, states: string[], timeout = 120_000): Promise<string> {
  let last = '';
  await expect
    .poll(async () => (last = (await debug(page)).state), { timeout, intervals: [200] })
    .toMatch(new RegExp(`^(${states.join('|')})$`));
  return last;
}

/** Collecte les erreurs JavaScript de la page (le test échoue s'il y en a). */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

export async function skipDialogue(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: 'Passer' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

export const replayOf = (page: Page): Promise<{ text: string; hash: string; frames: number } | null> =>
  page.evaluate(() => (window as unknown as { __kevnova: { replay(): { text: string; hash: string; frames: number } | null } }).__kevnova.replay());
