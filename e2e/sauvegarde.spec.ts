import { expect, test } from '@playwright/test';
import { debug, waitState, watchErrors } from './helpers';

test('stockage interdit (navigation privée stricte) : le jeu démarre et se joue quand même', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Accès refusé', 'SecurityError');
      },
    });
  });
  await page.goto('/?stage=corail&seed=2');
  await expect.poll(async () => (await debug(page)).state, { timeout: 30_000 }).toMatch(/^(playing|dialogue)$/);
  expect(errors).toEqual([]);
});

test('sauvegarde corrompue : récupérée depuis la copie de secours, sans plantage', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?fresh=1');
  await waitState(page, ['title']);
  // Une première écriture crée la sauvegarde et sa copie de secours.
  await page.evaluate(() => {
    const g = (window as unknown as { __kevnova: { save: { wallet: { shards: number } }; store: { write(s: unknown): void } } }).__kevnova;
    g.save.wallet.shards = 1234;
    g.store.write(g.save);
    g.store.write(g.save);
    localStorage.setItem('kevnova.save', '{"v":2,"sum":"00000000","data":"{tronqué');
  });
  await page.goto('/'); // sans ?fresh=1, qui effacerait tout
  await waitState(page, ['title']);
  expect((await debug(page)).save.wallet.shards).toBe(1234);
  expect(errors).toEqual([]);
});
