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
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
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

test('mobile : boutons tactiles réels (Nova, Précis, pause) et effet en jeu', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?fresh=1&stage=corail&seed=3');
  await skipDialogue(page);
  await waitState(page, ['playing']);
  // Laisser passer l'invulnérabilité de départ (la Nova reste utilisable, on vérifie juste qu'elle part).
  await page.waitForTimeout(300);
  const before = (await debug(page)).world!;
  await page.locator('#btn-nova').tap();
  await expect.poll(async () => (await debug(page)).world!.bombsUsed, { timeout: 5_000 }).toBe(1);
  expect((await debug(page)).world!.bombs).toBe(before.bombs - 1);

  await page.locator('#btn-focus').tap();
  await expect(page.locator('#btn-focus')).toHaveClass(/active/);
  await expect.poll(async () => (await debug(page)).world!.focus, { timeout: 5_000 }).toBe(true);
  await page.locator('#btn-focus').tap();
  await expect.poll(async () => (await debug(page)).world!.focus, { timeout: 5_000 }).toBe(false);

  await page.locator('#btn-pause').tap();
  await waitState(page, ['paused']);
  const frozen = (await debug(page)).world!.frame;
  await page.waitForTimeout(400);
  expect((await debug(page)).world!.frame).toBe(frozen);
  await page.getByRole('button', { name: 'Reprendre' }).tap();
  await waitState(page, ['playing']);
  await expect.poll(async () => (await debug(page)).world!.frame, { timeout: 5_000 }).toBeGreaterThan(frozen);
  expect(errors).toEqual([]);
});

test('mobile : passer en arrière-plan met le jeu en pause (batterie, aucune mort injuste)', async ({ page }) => {
  await page.goto('/?fresh=1&stage=corail&seed=3');
  await skipDialogue(page);
  await waitState(page, ['playing']);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await waitState(page, ['paused']);
  const frozen = (await debug(page)).world!.frame;
  await page.waitForTimeout(400);
  expect((await debug(page)).world!.frame).toBe(frozen);
});

test('mobile : la résolution du canvas est plafonnée (devicePixelRatio ≤ 2)', async ({ page }) => {
  await page.goto('/?fresh=1&stage=corail&seed=3');
  await skipDialogue(page);
  await waitState(page, ['playing']);
  const r = await page.evaluate(() => {
    const c = document.getElementById('game') as HTMLCanvasElement;
    return { w: c.width, css: c.getBoundingClientRect().width, dpr: window.devicePixelRatio };
  });
  expect(r.dpr).toBeGreaterThan(2); // Pixel 7 : 2,625
  expect(r.w / r.css).toBeLessThanOrEqual(2.01);
});
