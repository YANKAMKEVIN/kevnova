import { expect, test } from '@playwright/test';
import { debug, skipDialogue, waitState, watchErrors } from './helpers';

/**
 * Parcours complet automatisé dans un vrai navigateur : le pilote automatique joue les 5 secteurs
 * en accéléré, en passant par les dialogues, les résultats, le hangar et l'écran de fin.
 */
test('le bot termine toute la campagne jusqu’à l’écran de fin', async ({ page }) => {
  test.setTimeout(600_000);
  const errors = watchErrors(page);
  await page.goto('/?bot=1&speed=16&fresh=1&seed=5');
  await expect(page.getByRole('heading', { name: 'NOVA STRIKE' })).toBeVisible();
  await page.getByRole('button', { name: 'Jouer' }).click();
  await skipDialogue(page);

  for (let stage = 0; stage < 5; stage++) {
    await skipDialogue(page);
    await waitState(page, ['playing']);
    const s = await waitState(page, ['dialogue', 'results'], 300_000);
    if (s === 'dialogue') await skipDialogue(page);
    await waitState(page, ['results']);
    await expect(page.getByRole('heading', { name: 'Secteur libéré' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuer' }).click();
    if (stage < 4) {
      await waitState(page, ['hangar']);
      await page.getByRole('button', { name: /Décoller/ }).click();
    }
  }
  await waitState(page, ['ending']);
  await expect(page.getByRole('heading', { name: 'Astrée brille à nouveau' })).toBeVisible();
  const d = await debug(page);
  expect(d.save.progress.cleared).toEqual(['corail', 'givre', 'forge', 'abysse', 'couronne']);
  expect(d.save.wallet.shards).toBeGreaterThan(300);
  await page.getByRole('button', { name: 'Retour au titre' }).click();
  await waitState(page, ['title']);
  expect(errors).toEqual([]);
});
