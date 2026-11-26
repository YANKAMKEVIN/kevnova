import { SHIPS } from '../data/ships';
import { stageById } from '../data/stages';
import { nextCost, UPGRADES, type UpgradeId } from '../data/upgrades';
import { isShipUnlocked } from '../meta/progress';
import type { SaveData } from '../save/schema';
import type { Difficulty, ShipId, StageId } from '../sim/types';
import { esc, img, mount, on } from './dom';

export interface HangarActions {
  buy: (id: UpgradeId) => boolean;
  ship: (id: ShipId) => void;
  difficulty: (d: Difficulty) => void;
  launch: () => void;
  back: () => void;
}

const DIFF_LABEL: Record<Difficulty, string> = { doux: 'Doux', normal: 'Normal', infernal: 'Infernal' };

export function hangarScreen(root: HTMLElement, save: SaveData, stage: StageId, a: HangarActions, selected: UpgradeId = 'canon'): void {
  const ships = SHIPS.map((s) => {
    const open = isShipUnlocked(save, s.id);
    const lockText = s.unlockAfter ? `Après ${stageById(s.unlockAfter).name}` : '';
    return `<button class="ship ${save.ship === s.id ? 'sel' : ''} ${open ? '' : 'locked'}" data-ship="${s.id}" ${open ? '' : 'disabled'}>
      <img src="${img(s.sprite)}" alt=""><div class="n">${esc(s.name)}</div><div class="t">${open ? esc(s.tagline) : esc(lockText)}</div></button>`;
  }).join('');
  const ship = SHIPS.find((s) => s.id === save.ship)!;
  const ups = UPGRADES.map((u) => {
    const lvl = save.upgrades[u.id];
    const cost = nextCost(u.id, lvl);
    const pips = u.costs.map((_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
    const state = cost === null ? 'max' : cost > save.wallet.shards ? 'poor' : '';
    return `<button class="up ${state} ${selected === u.id ? 'sel' : ''}" data-up="${u.id}" style="${selected === u.id ? 'border-color:var(--gold)' : ''}">
      <img src="${img(u.icon)}" alt=""><span><span class="n">${esc(u.name)}</span><span class="pips">${pips}</span>
      <span class="c">${cost === null ? 'MAX' : `◆ ${cost}`}</span></span></button>`;
  }).join('');
  const sel = UPGRADES.find((u) => u.id === selected)!;
  const selCost = nextCost(sel.id, save.upgrades[sel.id]);
  const diffs = (['doux', 'normal', 'infernal'] as Difficulty[])
    .map((d) => `<button class="${save.settings.difficulty === d ? 'on' : ''}" data-diff="${d}">${DIFF_LABEL[d]}</button>`).join('');
  const st = stageById(stage);
  const el = mount(
    root,
    `<div class="topbar"><button class="btn small" data-back>Retour</button>
       <span class="wallet" data-wallet><img src="${img('icone_eclat')}" alt="">${save.wallet.shards}</span></div>
     <h2>Hangar</h2><p class="sub">Prépare l’Étincelle avant le saut</p>
     <div class="panel">
       <div class="ships">${ships}</div>
       <p class="ship-desc">${esc(ship.description)}</p>
       <div class="upgrades">${ups}</div>
       <p class="up-info"><b>${esc(sel.name)}</b> : ${esc(sel.description)}</p>
       <div class="row"><button class="btn small" data-buy ${selCost === null || selCost > save.wallet.shards ? 'disabled' : ''}>
         ${selCost === null ? 'Niveau max' : `Améliorer · ◆ ${selCost}`}</button></div>
       <div class="diff">${diffs}</div>
     </div>
     <div class="row" style="margin-top:14px"><button class="btn primary" data-launch data-autofocus>Décoller · ${esc(st.name)}</button></div>`,
    'screen dim hangar',
  );
  const again = (u: UpgradeId = selected): void => hangarScreen(root, save, stage, a, u);
  on(el, '[data-ship]', (b) => {
    a.ship(b.dataset.ship as ShipId);
    again();
  });
  on(el, '[data-up]', (b) => again(b.dataset.up as UpgradeId));
  on(el, '[data-buy]', () => {
    a.buy(selected);
    again();
  });
  on(el, '[data-diff]', (b) => {
    a.difficulty(b.dataset.diff as Difficulty);
    again();
  });
  on(el, '[data-launch]', a.launch);
  on(el, '[data-back]', a.back);
}
