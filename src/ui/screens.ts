import { STAGES } from '../data/stages';
import { isStageUnlocked } from '../meta/progress';
import type { SaveData } from '../save/schema';
import type { StageId } from '../sim/types';
import { esc, img, mount, on } from './dom';

export interface TitleActions {
  play: () => void;
  stages: () => void;
  hangar: () => void;
  settings: () => void;
}

export function titleScreen(root: HTMLElement, save: SaveData, a: TitleActions): void {
  const started = save.progress.cleared.length > 0;
  const el = mount(
    root,
    `<div class="art" style="background-image:url('${img('key_art')}')"></div>
     <h1 class="logo">KEVNOVA</h1>
     <p class="tagline">Rallume la dernière étoile</p>
     <div class="menu">
       <button class="btn primary" data-act="play" data-autofocus>${started ? 'Continuer' : 'Jouer'}</button>
       <button class="btn" data-act="stages">Secteurs</button>
       <button class="btn" data-act="hangar">Hangar</button>
       <button class="btn" data-act="settings">Réglages</button>
     </div>
     <p class="foot"><span class="wallet"><img src="${img('icone_eclat')}" alt="">${save.wallet.shards}</span> · ${save.progress.cleared.length}/5 secteurs · Kevin Creations</p>`,
    'screen title',
  );
  on(el, '[data-act]', (b) => a[b.dataset.act as keyof TitleActions]());
}

export function loadingScreen(root: HTMLElement): (k: number) => void {
  const el = mount(root, `<h1 class="logo">KEVNOVA</h1><div class="bar"><i></i></div>`, 'screen loading');
  const bar = el.querySelector<HTMLElement>('.bar i')!;
  return (k) => {
    bar.style.width = `${Math.round(k * 100)}%`;
  };
}

export function stagesScreen(root: HTMLElement, save: SaveData, pick: (id: StageId) => void, back: () => void): void {
  const cards = STAGES.map((s) => {
    const open = isStageUnlocked(save, s.id);
    const rank = save.progress.bestRank[s.id];
    const best = save.progress.bestScore[s.id];
    return `<button class="sector ${open ? '' : 'locked'}" data-id="${s.id}" ${open ? '' : 'disabled'} style="background-image:url('${img(s.background)}')">
      <span class="num">${s.index + 1}</span>
      <span><span class="name">${esc(s.name)}</span><br><span class="meta">${open ? (best ? `Record ${best.toLocaleString('fr-FR')}` : 'Inexploré') : 'Verrouillé'}</span></span>
      <span class="rank">${rank ?? ''}</span></button>`;
  }).join('');
  const el = mount(root, `<h2>Carte des secteurs</h2><p class="sub">Choisis ta destination</p><div class="sectors">${cards}</div>
    <div class="row" style="margin-top:14px"><button class="btn small" data-back>Retour</button></div>`);
  on(el, '.sector', (b) => pick(b.dataset.id as StageId));
  on(el, '[data-back]', back);
}
