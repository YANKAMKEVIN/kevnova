import { expect, test } from '@playwright/test';
import { decodeReplay, playReplay } from '../src/sim/replay';
import { debug, replayOf, skipDialogue, waitState, watchErrors } from './helpers';

/**
 * Déterminisme de bout en bout : une partie jouée dans le navigateur (pas de temps variable,
 * images sautées, accéléré x16) puis rejouée dans Node à partir de ses seules commandes
 * doit aboutir exactement au même état (même empreinte, même score).
 */
test('une partie du navigateur se rejoue à l’identique hors navigateur', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  await page.goto('/?bot=1&speed=16&fresh=1&seed=77&stage=givre');
  await skipDialogue(page);
  await waitState(page, ['playing']);
  const s = await waitState(page, ['dialogue', 'results'], 240_000);
  if (s === 'dialogue') await skipDialogue(page);
  await waitState(page, ['results']);

  const browser = (await replayOf(page))!;
  const d = await debug(page);
  expect(browser.frames).toBeGreaterThan(60 * 60);
  const replay = decodeReplay(browser.text);
  expect(replay.opts).toMatchObject({ stage: 'givre', seed: 77 });
  const node = playReplay(replay);
  expect(node.result.cleared).toBe(true);
  expect(node.hash).toBe(browser.hash);
  expect(node.result.score).toBe(d.world!.score);
  expect(errors).toEqual([]);
});
