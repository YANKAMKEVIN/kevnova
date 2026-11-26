import { SHIPS } from '../data/ships';
import { stageById } from '../data/stages';
import type { ApplyOutcome } from '../meta/progress';
import type { SaveData, Settings } from '../save/schema';
import type { StageResult } from '../sim/types';
import { esc, img, mount, on } from './dom';

export function resultsScreen(
  root: HTMLElement,
  r: StageResult,
  out: ApplyOutcome,
  a: { next: () => void; retry: () => void; menu: () => void },
): void {
  const st = stageById(r.stage);
  const badges = [
    out.newBest ? '<span class="badge">Nouveau record</span>' : '',
    ...out.unlockedShips.map((id) => `<span class="badge">Vaisseau débloqué : ${esc(SHIPS.find((s) => s.id === id)!.name)}</span>`),
  ].join('');
  const el = mount(
    root,
    `<h2>${r.cleared ? 'Secteur libéré' : 'Étincelle abattue'}</h2><p class="sub">${esc(st.subtitle)} · ${esc(st.name)}</p>
     <div class="panel" style="text-align:center">
       ${r.cleared ? `<div class="rank-big ${r.rank}">${r.rank}</div>` : ''}
       <div>${badges}</div>
       <div class="stats">
         <span>Score</span><b data-score>${r.score.toLocaleString('fr-FR')}</b>
         <span>Éclats récupérés</span><b>◆ ${r.shards}</b>
         <span>Ennemis détruits</span><b>${r.kills}</b>
         <span>Frôlements</span><b>${r.grazes}</b>
         <span>Coups reçus</span><b>${r.hits}</b>
         <span>Novas utilisées</span><b>${r.bombsUsed}</b>
       </div>
       <div class="menu">
         ${r.cleared ? '<button class="btn primary" data-act="next" data-autofocus>Continuer</button>' : '<button class="btn primary" data-act="retry" data-autofocus>Réessayer</button>'}
         ${r.cleared ? '<button class="btn" data-act="retry">Rejouer le secteur</button>' : '<button class="btn" data-act="next">Hangar</button>'}
         <button class="btn small" data-act="menu">Menu principal</button>
       </div>
     </div>`,
  );
  on(el, '[data-act]', (b) => a[b.dataset.act as 'next' | 'retry' | 'menu']());
}

export function pauseScreen(root: HTMLElement, a: { resume: () => void; restart: () => void; settings: () => void; quit: () => void }): void {
  const el = mount(
    root,
    `<h2>Pause</h2><p class="sub">Respire. Les balles attendent.</p>
     <div class="menu">
       <button class="btn primary" data-act="resume" data-autofocus>Reprendre</button>
       <button class="btn" data-act="restart">Recommencer le secteur</button>
       <button class="btn" data-act="settings">Réglages</button>
       <button class="btn small" data-act="quit">Abandonner</button>
     </div>
     <p class="sub" style="margin-top:18px;font-size:12px">Flèches / ZQSD : bouger · Maj : précision · X ou Espace : Nova · Échap : pause</p>`,
  );
  on(el, '[data-act]', (b) => a[b.dataset.act as 'resume' | 'restart' | 'settings' | 'quit']());
}

export function settingsScreen(root: HTMLElement, save: SaveData, change: (s: Settings) => void, reset: () => void, back: () => void): void {
  const s = save.settings;
  const tog = (k: keyof Settings, label: string): string =>
    `<div class="setting"><span>${label}</span><button class="toggle ${s[k] ? 'on' : ''}" data-tog="${k}" aria-pressed="${!!s[k]}" aria-label="${label}"></button></div>`;
  const el = mount(
    root,
    `<h2>Réglages</h2><p class="sub">Ton vaisseau, tes règles</p>
     <div class="panel">
       <div class="setting"><span>Musique</span><input type="range" min="0" max="1" step="0.05" value="${s.music}" data-range="music" aria-label="Musique"></div>
       <div class="setting"><span>Effets sonores</span><input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-range="sfx" aria-label="Effets sonores"></div>
       <div class="setting"><span>Sensibilité tactile</span><input type="range" min="0.6" max="1.8" step="0.1" value="${s.touchSensitivity}" data-range="touchSensitivity" aria-label="Sensibilité tactile"></div>
       ${tog('shake', 'Tremblements d’écran')}
       ${tog('calmFlashes', 'Atténuer les flashs')}
       ${tog('alwaysShowHitbox', 'Toujours afficher le cœur du vaisseau')}
       <div class="row" style="margin-top:14px"><button class="btn small" data-reset>Effacer la sauvegarde</button></div>
     </div>
     <div class="row" style="margin-top:14px"><button class="btn primary" data-back data-autofocus>Retour</button></div>`,
  );
  el.querySelectorAll<HTMLInputElement>('[data-range]').forEach((inp) =>
    inp.addEventListener('input', () => {
      (s as unknown as Record<string, number>)[inp.dataset.range!] = Number(inp.value);
      change(s);
    }),
  );
  on(el, '[data-tog]', (b) => {
    const k = b.dataset.tog as 'shake' | 'calmFlashes' | 'alwaysShowHitbox';
    s[k] = !s[k];
    b.classList.toggle('on', s[k]);
    change(s);
  });
  let armed = false;
  on(el, '[data-reset]', (b) => {
    if (!armed) {
      armed = true;
      b.textContent = 'Confirmer : tout effacer ?';
      return;
    }
    reset();
  });
  on(el, '[data-back]', back);
}

export function endingScreen(root: HTMLElement, score: number, done: () => void): void {
  const el = mount(
    root,
    `<div class="panel">
       <h2>Astrée brille à nouveau</h2>
       <p class="sub">La Flotte Éteignoir s’est dispersée. Le ciel appartient de nouveau à tout le monde.</p>
       <p style="font-size:14px;line-height:1.5">Merci d’avoir piloté l’Étincelle.<br>Score de la campagne : <b>${score.toLocaleString('fr-FR')}</b></p>
       <p style="font-size:12px;color:rgba(244,241,255,.6)">KEVNOVA · Kevin Creations<br>Les trois vaisseaux sont débloqués : retente les secteurs en Infernal pour les rangs S.</p>
       <div class="row"><button class="btn primary" data-done data-autofocus>Retour au titre</button></div>
     </div>`,
    'screen ending',
  );
  el.style.backgroundImage = `linear-gradient(180deg, rgba(11,15,42,0) 40%, rgba(11,15,42,.9)), url('${img('fin')}')`;
  on(el, '[data-done]', done);
}
