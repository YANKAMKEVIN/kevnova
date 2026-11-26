import { expect, test } from '@playwright/test';
import { debug, skipDialogue, waitState, watchErrors } from './helpers';

test('écran titre sans erreur et toutes les illustrations chargées', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?fresh=1');
  await waitState(page, ['title']);
  const d = await debug(page);
  expect(d.imagesLoaded).toBeGreaterThanOrEqual(38);
  for (const name of ['Jouer', 'Secteurs', 'Hangar', 'Réglages']) await expect(page.getByRole('button', { name })).toBeVisible();
  expect(errors).toEqual([]);
});

test('clavier : déplacement, Nova et pause', async ({ page }) => {
  await page.goto('/?fresh=1&stage=corail&seed=1');
  await skipDialogue(page);
  await waitState(page, ['playing']);
  const before = (await debug(page)).world!;
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowLeft');
  const after = (await debug(page)).world!;
  expect(after.x).toBeLessThan(before.x - 20);
  await page.keyboard.press('KeyX');
  await page.keyboard.press('Escape');
  await waitState(page, ['paused']);
  const frozen = (await debug(page)).world!.frame;
  await page.waitForTimeout(300);
  expect((await debug(page)).world!.frame).toBe(frozen);
  await page.getByRole('button', { name: 'Reprendre' }).click();
  await waitState(page, ['playing']);
});

test('hangar : acheter, changer de difficulté, la sauvegarde survit au rechargement', async ({ page }) => {
  await page.goto('/?fresh=1');
  await waitState(page, ['title']);
  // On crédite des éclats via la sauvegarde, comme après quelques parties.
  await page.evaluate(() => {
    const g = (window as unknown as { __kevnova: { save: { wallet: { shards: number } } } }).__kevnova;
    g.save.wallet.shards = 500;
  });
  await page.getByRole('button', { name: 'Hangar' }).click();
  await waitState(page, ['hangar']);
  await page.getByRole('button', { name: /Améliorer/ }).click();
  await page.getByRole('button', { name: 'Infernal' }).click();
  await page.goto('/');
  await waitState(page, ['title']);
  const d = await debug(page);
  expect(d.save.upgrades.canon).toBe(1);
  expect(d.save.wallet.shards).toBe(420);
  expect((d.save as unknown as { settings: { difficulty: string } }).settings.difficulty).toBe('infernal');
});

test('carte des secteurs : seul le premier est ouvert au début', async ({ page }) => {
  await page.goto('/?fresh=1');
  await waitState(page, ['title']);
  await page.getByRole('button', { name: 'Secteurs' }).click();
  await expect(page.locator('.sector:not(.locked)')).toHaveCount(1);
  await expect(page.locator('.sector.locked')).toHaveCount(4);
});

test('réglages : les volumes sont mémorisés', async ({ page }) => {
  await page.goto('/?fresh=1');
  await waitState(page, ['title']);
  await page.getByRole('button', { name: 'Réglages' }).click();
  await page.getByLabel('Musique').fill('0.2');
  await page.getByLabel('Tremblements d’écran').click();
  await page.goto('/');
  await waitState(page, ['title']);
  const s = (await debug(page)).save as unknown as { settings: { music: number; shake: boolean } };
  expect(s.settings.music).toBeCloseTo(0.2);
  expect(s.settings.shake).toBe(false);
});

test('performance : un combat de boss chargé tient la cadence', async ({ page }) => {
  await page.goto('/?fresh=1&stage=couronne&bot=1&speed=4&seed=2');
  await skipDialogue(page);
  await waitState(page, ['playing']);
  await expect.poll(async () => (await debug(page)).world?.phase, { timeout: 120_000 }).toBe('boss');
  await page.waitForTimeout(3000);
  const d = await debug(page);
  console.log(`i/s mesurées pendant le boss : ${d.fps}, balles : ${d.world?.bullets}`);
  expect(d.fps).toBeGreaterThan(25);
});
