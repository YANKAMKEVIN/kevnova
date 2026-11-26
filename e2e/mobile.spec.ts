import { expect, test } from '@playwright/test';
import { debug, skipDialogue, waitState, watchErrors } from './helpers';

test('mobile : le glisser déplace le vaisseau et le bouton Nova fonctionne', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?fresh=1&stage=corail&seed=3');
  await skipDialogue(page);
  await waitState(page, ['playing']);
  await expect(page.locator('#btn-nova')).toBeVisible();
  const start = (await debug(page)).world!;
  const vp = page.viewportSize()!;
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, x: number, y: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', vp.width / 2, vp.height * 0.7);
  for (let i = 1; i <= 10; i++) {
    await touch('touchMove', vp.width / 2 - i * 8, vp.height * 0.7 - i * 6);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(300);
  await touch('touchEnd', 0, 0);
  const moved = (await debug(page)).world!;
  expect(moved.x).toBeLessThan(start.x - 30);
  expect(moved.y).toBeLessThan(start.y - 20);
  await page.locator('#btn-nova').dispatchEvent('pointerdown');
  await page.waitForTimeout(100);
  expect(errors).toEqual([]);
});

test('mobile : le terrain remplit l’écran en portrait', async ({ page }) => {
  await page.goto('/?fresh=1&stage=corail&seed=3');
  await skipDialogue(page);
  await waitState(page, ['playing']);
  const box = await page.locator('#game').boundingBox();
  const vp = page.viewportSize()!;
  expect(box!.width).toBe(vp.width);
  expect(box!.height).toBe(vp.height);
  await page.screenshot({ path: 'test-results/mobile-jeu.png' });
});
