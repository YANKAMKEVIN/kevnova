# NOVA STRIKE

**Shoot'em up vertical original (bullet hell), jouable dans le navigateur, sur ordinateur et sur téléphone.**

Lyse et son drone-lanterne Pilou pilotent l'Étincelle à travers cinq secteurs pour rallumer Astrée, la dernière étoile, que la Flotte Éteignoir de l'Archonte Cendre est en train d'aspirer.

👉 **Jouer : https://yankamkevin.github.io/kevnova/**

## Le jeu

- **5 secteurs** (Nébuleuse Corail, Anneaux de Givre, Forge Écarlate, Abysse Lumineuse, Couronne Éteinte), chacun avec ses vagues, son décor et sa musique.
- **5 boss** à phases nommées (3 à 5 phases chacun), avec chrono et bonus de capture si on termine une phase sans être touché.
- **3 vaisseaux** : Étincelle (équilibrée), Lance (perçante, débloquée après le secteur 2), Gerbe (couvrante, après le secteur 4).
- **Hangar** : 7 améliorations permanentes achetées avec les éclats ramassés (canon, satellites Pilou, missiles chercheurs, bouclier, aimant, réserve Nova, coque).
- **Frôlement et Nova** : frôler les balles remplit la jauge Nova ; pleine, elle offre une bombe qui efface l'écran et transforme les balles en étoiles.
- **3 difficultés** (Doux, Normal, Infernal), rangs S/A/B/C par secteur, records.

## Commandes

| | Clavier | Manette | Tactile |
|---|---|---|---|
| Bouger | Flèches, ZQSD ou WASD | Stick ou croix | Glisser n'importe où (déplacement relatif, le doigt ne cache jamais le vaisseau) |
| Précision (lent, tir resserré, cœur visible) | Maj | LB / RB / X | Bouton PRÉCIS |
| Nova | X, C ou Espace | A / B | Bouton NOVA |
| Pause | Échap ou P | Start | Bouton ❚❚ |

Le tir est automatique.

## Technique

- **TypeScript strict**, modules séparés par responsabilité (`core`, `data`, `sim`, `render`, `audio`, `input`, `ui`, `save`, `meta`, `game`). ESLint interdit les fichiers de plus de 400 lignes.
- **Simulation déterministe** à pas fixe (60 Hz), sans aucune dépendance au DOM : même graine + mêmes commandes = même partie.
- **Rejeu déterministe** (`src/sim/replay.ts`) : chaque partie enregistre ses commandes (7 octets par image, quantifiées avant d'être jouées) ; rejouées sur la même graine, elles redonnent exactement la même partie, vérifiée par une empreinte FNV-1a de tout l'état. `window.__kevnova.replay()` renvoie le rejeu de la partie en cours.
- **Pilote automatique** (`src/sim/bot.ts`) qui prédit les balles et choisit la manœuvre la plus sûre. Il joue toute la campagne dans les tests.
- **Perf mobile** : aucune allocation dans la boucle chaude (balles en tableaux typés, objets/tirs/événements recyclés, salves mémorisées, HUD sans chaîne reconstruite), mesuré par un test qui compte les octets alloués par image dans V8, canvas plafonné à 2× le devicePixelRatio, pause automatique quand l'onglet est caché, sprites pré-réduits à la taille d'écran, balles allongées pré-tournées (32 orientations), HUD dessiné dans le canvas, résolution adaptative si l'appareil passe sous 60 i/s.
- **Sauvegarde versionnée et robuste** : enveloppe avec empreinte FNV-1a, copie de secours automatique, migrations (v1 → v2), réparation des champs invalides, refus des versions futures, aucun plantage si le stockage est plein ou interdit.
- **Audio 100 % synthétisé** (Web Audio) : effets et musiques générées par séquenceur, aucun fichier audio.
- **Illustrations** peintes générées avec Codex à partir d'un ADN de style verrouillé (`art/ecrire_prompts.py`), converties en WebP (`tools/assets.py`).

## Tests

```bash
npm ci
npm run check   # types + lint + tests unitaires avec couverture + build + bout en bout
PW_PORT=5741 npm run e2e   # bout en bout sur un autre port (machine partagée)
```

- **Tests unitaires (Vitest)** : RNG, motifs de tir (identiques au bit près pour une graine), hitbox et frôlement au pixel près, score et Nova, toutes les phases des 5 boss, apparition de chaque ennemi prévu, rejeu (le bot joue chaque secteur en enregistrant, le rejeu sans bot le termine à l'identique), **allocations par image** (sonde V8 + garde statique : ni `new`, ni closure, ni tableau temporaire dans les fonctions appelées à chaque image), trajectoires, combat, frôlement, boss et phases, objets, sauvegarde (corruption, secours, migrations), hangar et progression, données du jeu, budget de performance, et **la campagne complète jouée par le bot** (3 vaisseaux × 5 secteurs × 2 difficultés).
- **Tests de bout en bout (Playwright)** : le bot finit les 5 secteurs dans un vrai navigateur jusqu'à l'écran de fin, une partie jouée dans Chromium se rejoue dans Node avec la même empreinte, stockage interdit et sauvegarde corrompue, boutons tactiles réels (Nova, Précis, pause), pause en arrière-plan, DPR plafonné, clavier et pause, hangar et sauvegarde après rechargement, réglages, cadence pendant un boss, glisser tactile et bouton Nova sur téléphone.
- **CI GitHub Actions** bloquante : rien n'est publié sur GitHub Pages si une étape échoue.

Options d'URL pour les démos et les tests : `?bot=1` (pilote automatique), `?speed=8` (accéléré), `?stage=forge` (secteur direct), `?seed=42`, `?fresh=1` (partie neuve).

---
Kevin Creations
